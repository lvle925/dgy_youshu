package com.youshu.local;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
public class TrustedDeviceService {
    private static final String COOKIE_NAME = "YS_TRUSTED_DEVICE";
    private static final String CHALLENGE_KEY = TrustedDeviceService.class.getName() + ".challenge";
    private static final Duration TRUST_LIFETIME = Duration.ofDays(90);

    private final JdbcTemplate jdbc;
    private final SmsVerificationService sms;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.auth.device-verification-enabled:false}")
    private boolean verificationEnabled;

    @Autowired
    public TrustedDeviceService(JdbcTemplate jdbc, SmsVerificationService sms) {
        this(jdbc, sms, false);
    }

    TrustedDeviceService(JdbcTemplate jdbc, SmsVerificationService sms, boolean verificationEnabled) {
        this.jdbc = jdbc;
        this.sms = sms;
        this.verificationEnabled = verificationEnabled;
    }

    private record Pending(String challengeId, String username, String phone) {}

    public Map<String, Object> login(String username, HttpServletRequest request, HttpServletResponse response) {
        if (!verificationEnabled || isTrusted(username, request)) {
            establishSession(request, username);
            return Map.of("user", username);
        }
        if (!sms.isDemoEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "未配置新设备短信服务，请联系管理员");
        }
        HttpSession session = request.getSession(true);
        String phone = sms.demoPhone();
        SmsVerificationService.Dispatch dispatch = sms.send(session, "device", phone);
        session.setAttribute(CHALLENGE_KEY, new Pending(dispatch.challengeId(), username, phone));
        return Map.of(
                "user", username,
                "requiresDeviceVerification", true,
                "deviceChallengeId", dispatch.challengeId(),
                "maskedPhone", phone,
                "demoCode", dispatch.demoCode()
        );
    }

    public SmsVerificationService.Dispatch resend(String challengeId, HttpServletRequest request) {
        Pending pending = pending(request.getSession(false), challengeId);
        return sms.resend(request.getSession(false), pending.challengeId(), "device");
    }

    public Map<String, String> verify(String challengeId, String code, boolean trustDevice,
                                      HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        Pending pending = pending(session, challengeId);
        sms.verify(session, pending.challengeId(), "device", pending.phone(), code);
        session.removeAttribute(CHALLENGE_KEY);
        if (trustDevice) rememberDevice(pending.username(), request, response);
        establishSession(request, pending.username());
        return Map.of("user", pending.username());
    }

    String pendingUsername(String challengeId, HttpServletRequest request) {
        return pending(request.getSession(false), challengeId).username();
    }

    private Pending pending(HttpSession session, String challengeId) {
        Object value = session == null ? null : session.getAttribute(CHALLENGE_KEY);
        if (!(value instanceof Pending pending) || !pending.challengeId().equals(challengeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "设备验证已过期，请重新登录");
        }
        return pending;
    }

    private boolean isTrusted(String username, HttpServletRequest request) {
        String token = cookieValue(request, COOKIE_NAME);
        if (token.isBlank()) return false;
        String tokenHash = hash(token);
        return jdbc.queryForObject(
                "SELECT COUNT(*) FROM trusted_device WHERE username=? AND token_hash=? AND expires_at>?",
                Integer.class, username, tokenHash, System.currentTimeMillis()) > 0;
    }

    private void rememberDevice(String username, HttpServletRequest request, HttpServletResponse response) {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        long expiresAt = System.currentTimeMillis() + TRUST_LIFETIME.toMillis();
        jdbc.update("DELETE FROM trusted_device WHERE username=? AND expires_at<=?", username, System.currentTimeMillis());
        jdbc.update("INSERT INTO trusted_device(username,token_hash,expires_at) VALUES(?,?,?)",
                username, hash(token), expiresAt);
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(request.isSecure())
                .sameSite("Strict")
                .path("/")
                .maxAge(TRUST_LIFETIME)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private void establishSession(HttpServletRequest request, String username) {
        HttpSession session = request.getSession(false);
        if (session == null) request.getSession(true);
        else request.changeSessionId();
        request.getSession(true).setAttribute("user", username);
    }

    private String cookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return "";
        for (Cookie cookie : cookies) if (name.equals(cookie.getName())) return cookie.getValue();
        return "";
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash trusted device token", exception);
        }
    }
}
