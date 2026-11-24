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
    private final WorkspaceAccess access;
    private final AuditService audit;

    @Value("${app.auth.demo-login-enabled:false}")
    private boolean demoLoginEnabled;

    public AuthController(JdbcTemplate jdbc, CaptchaService captcha, SmsVerificationService sms,
                          TrustedDeviceService trustedDevices, WorkspaceAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.captcha = captcha;
        this.sms = sms;
        this.trustedDevices = trustedDevices;
        this.access = access;
        this.audit = audit;
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
        status.put("initialized", count() > 0 || jdbc.queryForObject("SELECT COUNT(*) FROM member_account", Integer.class) > 0);
        status.put("authenticated", false);
        boolean demoSession = false;
        if (session != null) {
            try {
                demoSession = Boolean.TRUE.equals(session.getAttribute("demo"));
                if (session.getAttribute("user") != null) {
                    status.put("principal", access.current(session));
                    status.put("authenticated", true);
                }
            } catch (ResponseStatusException ex) {
                try { session.invalidate(); } catch (IllegalStateException ignored) { }
                status.put("reason", ex.getReason());
                demoSession = false;
            } catch (IllegalStateException expired) {
                status.put("reason", "登录会话已失效，请重新登录");
                demoSession = false;
            }
        }
        status.put("demoLoginEnabled", demoLoginEnabled);
        status.put("demoSession", demoSession);
        status.put("demoPhone", demoLoginEnabled ? sms.demoPhone() : "");
        return status;
    }

    private int count() { return jdbc.queryForObject("SELECT COUNT(*) FROM local_account", Integer.class); }

    static String hash(String password, byte[] salt) {
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
        if (username.length() < 3 || username.length() > 100 || !access.validPassword(password)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "账号至少3位，密码须符合系统复杂度策略");
        byte[] salt = new byte[16]; new SecureRandom().nextBytes(salt);
        jdbc.update("INSERT INTO local_account(id,username,password_hash) VALUES(1,?,?)", username, hash(password,salt));
        req.changeSessionId();
        HttpSession session = req.getSession(true);
        session.setAttribute("user", username);
        access.registerSession(session, username);
        audit.record(access.resolve(username), "认证", "初始化管理员", "账号", username, null,
            Map.of("status", "启用"), "成功", req, 0);
        return Map.of("user", username);
    }

    @Operation(summary = "管理员登录")
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,String> body,
                                                             HttpServletRequest req, HttpServletResponse res) {
        String loginName = body.getOrDefault("username", "").trim();
        try {
            captcha.verify(req.getSession(false), body.get("captchaId"), body.get("captcha"),
                    body.get("captchaToken"), req.getRemoteAddr());
            Map<String, Object> attempt = jdbc.query("SELECT failed_attempts,locked_until FROM login_attempt WHERE username=?",
                (rs, n) -> Map.<String, Object>of("failed", rs.getInt(1), "lockedUntil", rs.getLong(2)), loginName)
                .stream().findFirst().orElse(Map.of("failed", 0, "lockedUntil", 0L));
            long lockedUntil = ((Number) attempt.get("lockedUntil")).longValue();
            if (lockedUntil > System.currentTimeMillis()) {
                long remainingMinutes = Math.max(1, (lockedUntil - System.currentTimeMillis() + 59_999) / 60_000);
                throw new ResponseStatusException(HttpStatus.LOCKED, "账号已锁定，请约 " + remainingMinutes + " 分钟后重试或联系管理员解锁");
            }
            var users = jdbc.queryForList("SELECT username,password_hash FROM local_account WHERE username=? UNION ALL SELECT username,password_hash FROM member_account WHERE username=?", loginName, loginName);
            if (users.isEmpty()) return rejectLogin(loginName, req);
            String username = String.valueOf(users.get(0).get("USERNAME"));
            String stored = String.valueOf(users.get(0).get("PASSWORD_HASH"));
            String password = body.getOrDefault("password", "");
            boolean valid = password.length() <= 128 && MessageDigest.isEqual(
                    stored.getBytes(StandardCharsets.UTF_8),
                    hash(password, Base64.getDecoder().decode(stored.split(":")[0])).getBytes(StandardCharsets.UTF_8));
            if (!valid) return rejectLogin(loginName, req);
            var principal = access.resolve(username);
            jdbc.update("DELETE FROM login_attempt WHERE username=?", loginName);
            if (req.getSession(false) != null) {
                req.getSession(false).removeAttribute("demo");
                req.getSession(false).removeAttribute("user");
            }
            Map<String, Object> result = trustedDevices.login(username, req, res);
            boolean pending = Boolean.TRUE.equals(result.get("requiresDeviceVerification"));
            audit.record(principal, "认证", pending ? "新设备验证" : "密码登录", "账号", username, null,
                Map.of("status", pending ? "待验证" : "已建立会话"), "成功", req, 0);
            return result;
        } catch (ResponseStatusException failure) {
            if (!Boolean.TRUE.equals(req.getAttribute("audit.recorded"))) {
                audit.recordLoginAttempt(loginName, "密码登录校验失败", "失败",
                    Map.of("httpStatus", failure.getStatusCode().value()), req);
            }
            throw failure;
        }
    }

    @Operation(summary = "本地演示登录", description = "只在显式启用的本地演示配置下可用，不验证密码或短信。")
    @PostMapping("/demo-login") public Map<String, String> demoLogin(@RequestBody Map<String,String> body,
                                                                        HttpServletRequest req) {
        String identity = body.getOrDefault("phone", "");
        try {
            if (!demoLoginEnabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "本地演示登录未启用");
            if (!sms.demoPhone().equals(identity)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "演示账号不正确");
            }
            HttpSession session = req.getSession(false);
            if (session == null) req.getSession(true);
            else req.changeSessionId();
            req.getSession(true).setAttribute("user", "本地演示管理员");
            req.getSession(true).setAttribute("demo", true);
            access.registerSession(req.getSession(true), "本地演示管理员");
            audit.record(access.current(req.getSession(true)), "认证", "演示登录", "账号", "本地演示管理员", null,
                Map.of("status", "已建立会话"), "成功", req, 0);
            return Map.of("user", "本地演示管理员", "demo", "true");
        } catch (ResponseStatusException failure) {
            if (!Boolean.TRUE.equals(req.getAttribute("audit.recorded"))) {
                audit.recordLoginAttempt(identity, "演示登录校验失败", "失败",
                    Map.of("httpStatus", failure.getStatusCode().value()), req);
            }
            throw failure;
        }
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
        try {
            sms.verify(req.getSession(false), body.get("challengeId"), "login", phone, body.get("code"));
            if (!sms.isDemoDestination(phone)) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "尚未配置手机号账号映射和短信服务");
            }
            HttpSession session = req.getSession(false);
            if (session == null) req.getSession(true);
            else req.changeSessionId();
            req.getSession(true).setAttribute("user", "本地演示管理员");
            req.getSession(true).setAttribute("demo", true);
            access.registerSession(req.getSession(true), "本地演示管理员");
            audit.record(access.current(req.getSession(true)), "认证", "短信验证码登录", "账号", phone, null,
                Map.of("status", "已建立会话"), "成功", req, 0);
            return Map.of("user", "本地演示管理员", "demo", "true");
        } catch (ResponseStatusException failure) {
            if (!Boolean.TRUE.equals(req.getAttribute("audit.recorded"))) {
                audit.recordLoginAttempt(phone, "短信验证码登录失败", "失败",
                    Map.of("httpStatus", failure.getStatusCode().value()), req);
            }
            throw failure;
        }
    }

    @Operation(summary = "重新发送新设备验证码")
    @PostMapping("/device/send") public SmsVerificationService.Dispatch resendDevice(
            @RequestBody Map<String,String> body, HttpServletRequest req) {
        return trustedDevices.resend(body.get("challengeId"), req);
    }

    @Operation(summary = "验证新设备并选择是否信任 90 天")
    @PostMapping("/device/verify") public Map<String,String> verifyDevice(
            @RequestBody Map<String,Object> body, HttpServletRequest req, HttpServletResponse res) {
        String identity = String.valueOf(body.getOrDefault("challengeId", ""));
        try {
            identity = trustedDevices.pendingUsername(identity, req);
            access.resolve(identity);
            Map<String, String> result = trustedDevices.verify(
                    String.valueOf(body.getOrDefault("challengeId", "")),
                    String.valueOf(body.getOrDefault("code", "")),
                    Boolean.TRUE.equals(body.get("trustDevice")), req, res);
            audit.record(access.resolve(result.get("user")), "认证", "新设备验证通过", "账号", result.get("user"), null,
                Map.of("trustedDevice", Boolean.TRUE.equals(body.get("trustDevice"))), "成功", req, 0);
            return result;
        } catch (ResponseStatusException failure) {
            if (!Boolean.TRUE.equals(req.getAttribute("audit.recorded"))) {
                audit.recordLoginAttempt(identity, "新设备验证失败", "失败",
                    Map.of("httpStatus", failure.getStatusCode().value()), req);
            }
            throw failure;
        }
    }

    @Operation(summary = "管理员退出")
    @PostMapping("/logout") public Map<String,String> logout(HttpServletRequest req) {
        if (req.getSession(false) != null) {
            String username = String.valueOf(req.getSession(false).getAttribute("user"));
            WorkspaceAccess.Principal principal = null;
            try { principal = access.resolve(username); } catch (ResponseStatusException ignored) { }
            audit.record(principal, "认证", "退出登录", "账号", username, null, Map.of("status", "已退出"), "成功", req, 0);
            access.revokeSession(req.getSession(false));
            req.getSession(false).invalidate();
        }
        return Map.of("status", "ok");
    }

    @PostMapping("/change-password")
    public Map<String, String> changePassword(@RequestBody Map<String, String> body, HttpSession session, HttpServletRequest request) {
        var principal = access.current(session);
        String password = body.getOrDefault("password", "");
        if (!access.validPassword(password)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码不符合系统复杂度策略");
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        if (principal.memberId().isBlank()) {
            jdbc.update("UPDATE local_account SET password_hash=? WHERE username=?", hash(password, salt), principal.user());
        } else {
            jdbc.update("UPDATE member_account SET password_hash=?,must_change_password=FALSE WHERE member_id=?",
                hash(password, salt), principal.memberId());
        }
        audit.record(principal, "人员管理", "修改密码", "账号", principal.user(), null,
            Map.of("status", "已修改"), "成功", request, 0);
        return Map.of("status", "ok");
    }


    private Map<String, Object> rejectLogin(String username, HttpServletRequest request) {
        long now = System.currentTimeMillis();
        jdbc.update("INSERT INTO login_attempt(username,failed_attempts,locked_until,last_attempt_at) VALUES(?,1,0,?) " +
                "ON DUPLICATE KEY UPDATE failed_attempts=IF(locked_until>?,failed_attempts,failed_attempts+1), " +
                "locked_until=IF(locked_until>?,locked_until,IF(failed_attempts>=5,?,0)), last_attempt_at=VALUES(last_attempt_at)",
            username, now, now, now, now + 15 * 60_000L);
        Map<String, Object> attempt = jdbc.query("SELECT failed_attempts,locked_until FROM login_attempt WHERE username=?",
            (rs, n) -> Map.<String, Object>of("failed", rs.getInt(1), "lockedUntil", rs.getLong(2)), username).getFirst();
        audit.recordLoginAttempt(username, "密码校验失败", "失败",
            Map.of("failedAttempts", attempt.get("failed")), request);
        if (((Number) attempt.get("lockedUntil")).longValue() > now)
            throw new ResponseStatusException(HttpStatus.LOCKED, "连续验证失败，账号已锁定 15 分钟");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
    }
}
@Configuration
class ApiSecurity implements WebMvcConfigurer {
    private final WorkspaceAccess access;
    private final AuditService audit;

    ApiSecurity(WorkspaceAccess access, AuditService audit) { this.access = access; this.audit = audit; }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                request.setAttribute("audit.startedAt", System.nanoTime());
                return true;
            }

            @Override public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                                  Object handler, Exception exception) {
                if (Boolean.TRUE.equals(request.getAttribute("audit.recorded"))) return;
                WorkspaceAccess.Principal principal = (WorkspaceAccess.Principal) request.getAttribute("audit.principal");
                long startedAt = request.getAttribute("audit.startedAt") instanceof Long value ? value : System.nanoTime();
                long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
                String method = request.getMethod();
                String action = switch (method) {
                    case "GET" -> "查询接口";
                    case "POST" -> "业务提交";
                    case "PUT", "PATCH" -> "业务更新";
                    case "DELETE" -> "业务删除";
                    default -> "接口调用";
                };
                int status = response.getStatus();
                String result = exception == null && status < 400 ? "成功" : "失败";
                String path = request.getRequestURI();
                String objectId = path.length() > 128 ? path.substring(0, 128) : path;
                audit.record(principal, moduleFor(path), action, "API", objectId, null, null, result, request, durationMs);
            }
        }).addPathPatterns("/api/**").excludePathPatterns("/api/auth/**", "/api/audit/**", "/api/health");

        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                WorkspaceAccess.Principal principal = access.current(request.getSession(false));
                request.setAttribute("audit.principal", principal);
                return true;
            }
        }).addPathPatterns("/api/**").excludePathPatterns("/api/auth/**", "/api/health");
    }

    private String moduleFor(String path) {
        if (path.startsWith("/api/records/")) return path.substring("/api/records/".length()).split("/")[0];
        if (path.startsWith("/api/projects/")) return "项目线索";
        if (path.startsWith("/api/visits/")) return "走访管理";
        if (path.startsWith("/api/members/")) return "人员管理";
        if (path.startsWith("/api/system/")) return "系统管理";
        return "业务接口";
    }
}
