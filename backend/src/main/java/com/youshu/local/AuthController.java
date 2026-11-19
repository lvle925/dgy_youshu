package com.youshu.local;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.*;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证", description = "本地管理员初始化、登录与退出")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final CaptchaService captcha;
    public AuthController(JdbcTemplate jdbc, CaptchaService captcha) { this.jdbc = jdbc; this.captcha = captcha; }
    @Operation(summary = "生成一次性图片验证码", description = "验证码与当前会话绑定，5分钟内有效，提交后作废。")
    @GetMapping("/captcha") public CaptchaService.Captcha captcha(HttpServletRequest req, HttpServletResponse res) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return captcha.issue(req.getSession(true));
    }
    @Operation(summary = "查询本地认证状态")
    @GetMapping("/status") public Map<String,Object> status(HttpServletRequest req) {
        return Map.of("initialized", count() > 0, "authenticated", req.getSession(false) != null && req.getSession(false).getAttribute("user") != null);
    }
    private int count() { return jdbc.queryForObject("SELECT COUNT(*) FROM local_account", Integer.class); }
    private String hash(String password, byte[] salt) {
        try {
            byte[] digest = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(password.toCharArray(), salt, 210000, 256)).getEncoded();
            return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(digest);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    @Operation(summary = "创建首次使用的本地管理员")
    @PostMapping("/setup") public synchronized Map<String,String> setup(@RequestBody Map<String,String> body, HttpServletRequest req) {
        if (count() != 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "管理员已创建");
        captcha.verify(req.getSession(false), body.get("captchaId"), body.get("captcha"));
        String username = body.getOrDefault("username", "").trim(), password = body.getOrDefault("password", "");
        if (username.length() < 3 || username.length() > 100 || password.length() < 10 || password.length() > 128) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号至少3位，密码至少10位");
        byte[] salt = new byte[16]; new SecureRandom().nextBytes(salt);
        jdbc.update("INSERT INTO local_account(id,username,password_hash) VALUES(1,?,?)", username, hash(password,salt));
        req.changeSessionId();
        req.getSession(true).setAttribute("user", username); return Map.of("user", username);
    }
    @Operation(summary = "管理员登录")
    @PostMapping("/login") public Map<String,String> login(@RequestBody Map<String,String> body, HttpServletRequest req) {
        captcha.verify(req.getSession(false), body.get("captchaId"), body.get("captcha"));
        var users = jdbc.queryForList("SELECT username,password_hash FROM local_account WHERE id=1");
        if (users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先创建管理员");
        String username = String.valueOf(users.get(0).get("USERNAME"));
        String stored = String.valueOf(users.get(0).get("PASSWORD_HASH"));
        String password = body.getOrDefault("password", "");
        boolean valid = password.length() <= 128 && MessageDigest.isEqual(stored.getBytes(java.nio.charset.StandardCharsets.UTF_8), hash(password, Base64.getDecoder().decode(stored.split(":")[0])).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        if (!username.equals(body.getOrDefault("username", "")) || !valid) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
        if (req.getSession(false) != null) req.getSession(false).invalidate();
        req.getSession(true).setAttribute("user", username); return Map.of("user", username);
    }
    @Operation(summary = "管理员退出")
    @PostMapping("/logout") public Map<String,String> logout(HttpServletRequest req) {
        if (req.getSession(false) != null) req.getSession(false).invalidate(); return Map.of("status", "ok");
    }
}
@Configuration
class ApiSecurity implements WebMvcConfigurer {
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
                if (req.getSession(false) == null || req.getSession(false).getAttribute("user") == null) { res.sendError(401); return false; }
                return true;
            }
        }).addPathPatterns("/api/**").excludePathPatterns("/api/auth/**", "/api/health");
    }
}
