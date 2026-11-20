package com.youshu.local;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证", description = "本地管理员初始化、登录与退出")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final CaptchaService captcha;
    private final SmsVerificationService sms;
    private final TrustedDeviceService trustedDevices;

    @Value("${app.auth.demo-login-enabled:false}")
    private boolean demoLoginEnabled;

    public AuthController(JdbcTemplate jdbc, CaptchaService captcha, SmsVerificationService sms,
                          TrustedDeviceService trustedDevices) {
        this.jdbc = jdbc;
        this.captcha = captcha;
        this.sms = sms;
        this.trustedDevices = trustedDevices;
    }

    @Operation(summary = "生成一次性图片验证码", description = "验证码与当前会话绑定，5分钟内有效，提交后作废。")
    @GetMapping("/captcha") public CaptchaService.Captcha captcha(HttpServletRequest req, HttpServletResponse res) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return captcha.issue(req.getSession(true));
    }

    @Operation(summary = "查询本地认证状态")
    @GetMapping("/status") public Map<String,Object> status(HttpServletRequest req) {
        Map<String, Object> status = new LinkedHashMap<>();
        HttpSession session = req.getSession(false);
        status.put("initialized", count() > 0);
        status.put("authenticated", session != null && session.getAttribute("user") != null);
        status.put("demoLoginEnabled", demoLoginEnabled);
        status.put("demoPhone", demoLoginEnabled ? sms.demoPhone() : "");
        return status;
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
        captcha.verify(req.getSession(false), body.get("captchaId"), body.get("captcha"),
                body.get("captchaToken"), req.getRemoteAddr());
        String username = body.getOrDefault("username", "").trim(), password = body.getOrDefault("password", "");
        if (username.length() < 3 || username.length() > 100 || password.length() < 10 || password.length() > 128) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号至少3位，密码至少10位");
        byte[] salt = new byte[16]; new SecureRandom().nextBytes(salt);
        jdbc.update("INSERT INTO local_account(id,username,password_hash) VALUES(1,?,?)", username, hash(password,salt));
        req.changeSessionId();
        req.getSession(true).setAttribute("user", username); return Map.of("user", username);
    }

    @Operation(summary = "管理员登录")
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,String> body,
                                                             HttpServletRequest req, HttpServletResponse res) {
        captcha.verify(req.getSession(false), body.get("captchaId"), body.get("captcha"),
                body.get("captchaToken"), req.getRemoteAddr());
        var users = jdbc.queryForList("SELECT username,password_hash FROM local_account WHERE id=1");
        if (users.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先创建管理员");
        String username = String.valueOf(users.get(0).get("USERNAME"));
        String stored = String.valueOf(users.get(0).get("PASSWORD_HASH"));
        String password = body.getOrDefault("password", "");
        boolean valid = password.length() <= 128 && MessageDigest.isEqual(
                stored.getBytes(StandardCharsets.UTF_8),
                hash(password, Base64.getDecoder().decode(stored.split(":")[0])).getBytes(StandardCharsets.UTF_8));
        if (!username.equals(body.getOrDefault("username", "")) || !valid) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
        return trustedDevices.login(username, req, res);
    }

    @Operation(summary = "本地演示登录", description = "只在显式启用的本地演示配置下可用，不验证密码或短信。")
    @PostMapping("/demo-login") public Map<String, String> demoLogin(@RequestBody Map<String,String> body,
                                                                        HttpServletRequest req) {
        if (!demoLoginEnabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "本地演示登录未启用");
        if (!sms.demoPhone().equals(body.get("phone"))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "演示账号不正确");
        }
        HttpSession session = req.getSession(false);
        if (session == null) req.getSession(true);
        else req.changeSessionId();
        req.getSession(true).setAttribute("user", "本地演示管理员");
        return Map.of("user", "本地演示管理员", "demo", "true");
    }

    @Operation(summary = "发送短信验证码", description = "本地演示模式返回固定演示码。未配置短信服务时对其他手机号返回 503。")
    @PostMapping("/sms/send") public SmsVerificationService.Dispatch sendSms(
            @RequestBody Map<String,String> body, HttpServletRequest req) {
        String phone = body.getOrDefault("phone", "").trim();
        if (phone.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入手机号");
        return sms.send(req.getSession(true), "login", phone);
    }

    @Operation(summary = "短信验证码登录")
    @PostMapping("/sms/login") public Map<String,Object> smsLogin(
            @RequestBody Map<String,String> body, HttpServletRequest req, HttpServletResponse res) {
        String phone = body.getOrDefault("phone", "").trim();
        sms.verify(req.getSession(false), body.get("challengeId"), "login", phone, body.get("code"));
        if (!sms.isDemoDestination(phone)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "尚未配置手机号账号映射和短信服务");
        }
        HttpSession session = req.getSession(false);
        if (session == null) req.getSession(true);
        else req.changeSessionId();
        req.getSession(true).setAttribute("user", "本地演示管理员");
        return Map.of("user", "本地演示管理员", "demo", "true");
    }

    @Operation(summary = "重新发送新设备验证码")
    @PostMapping("/device/send") public SmsVerificationService.Dispatch resendDevice(
            @RequestBody Map<String,String> body, HttpServletRequest req) {
        return trustedDevices.resend(body.get("challengeId"), req);
    }

    @Operation(summary = "验证新设备并选择是否信任 90 天")
    @PostMapping("/device/verify") public Map<String,String> verifyDevice(
            @RequestBody Map<String,Object> body, HttpServletRequest req, HttpServletResponse res) {
        return trustedDevices.verify(
                String.valueOf(body.getOrDefault("challengeId", "")),
                String.valueOf(body.getOrDefault("code", "")),
                Boolean.TRUE.equals(body.get("trustDevice")), req, res);
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
