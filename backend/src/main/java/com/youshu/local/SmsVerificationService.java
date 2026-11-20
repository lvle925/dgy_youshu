package com.youshu.local;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class SmsVerificationService {
    private static final String SESSION_KEY = SmsVerificationService.class.getName();
    private static final Duration CODE_LIFETIME = Duration.ofMinutes(5);
    private static final Duration RESEND_DELAY = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;

    private final Clock clock;

    @Value("${app.auth.demo-login-enabled:false}")
    private boolean demoLoginEnabled;

    @Value("${app.auth.demo-phone:127127}")
    private String demoPhone;

    @Value("${app.auth.demo-sms-code:127127}")
    private String demoCode;

    public SmsVerificationService() {
        this(Clock.systemUTC(), false, "127127", "127127");
    }

    SmsVerificationService(Clock clock) {
        this(clock, false, "127127", "127127");
    }

    SmsVerificationService(Clock clock, boolean demoLoginEnabled, String demoPhone, String demoCode) {
        this.clock = clock;
        this.demoLoginEnabled = demoLoginEnabled;
        this.demoPhone = demoPhone;
        this.demoCode = demoCode;
    }

    public record Dispatch(String challengeId, int expiresIn, int resendAfter, String demoCode) {}

    private record Challenge(String purpose, String destination, String code,
                             long expiresAt, long resendAt, int attempts) {
        Challenge withAttempt() {
            return new Challenge(purpose, destination, code, expiresAt, resendAt, attempts + 1);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Challenge> challenges(HttpSession session) {
        Object stored = session.getAttribute(SESSION_KEY);
        if (stored instanceof Map<?, ?>) return (Map<String, Challenge>) stored;
        Map<String, Challenge> created = new LinkedHashMap<>();
        session.setAttribute(SESSION_KEY, created);
        return created;
    }

    public Dispatch send(HttpSession session, String purpose, String destination) {
        requireDemoDelivery(destination);
        long now = clock.millis();
        synchronized (session) {
            Map<String, Challenge> entries = challenges(session);
            entries.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
            for (Challenge existing : entries.values()) {
                if (existing.purpose().equals(purpose) && existing.destination().equals(destination)
                        && existing.resendAt() > now) {
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                            "请等待 60 秒后再重新发送验证码");
                }
            }
            while (entries.size() >= 8) entries.remove(entries.keySet().iterator().next());
            String id = UUID.randomUUID().toString();
            entries.put(id, new Challenge(purpose, destination, demoCode,
                    now + CODE_LIFETIME.toMillis(), now + RESEND_DELAY.toMillis(), 0));
            return new Dispatch(id, (int) CODE_LIFETIME.toSeconds(), (int) RESEND_DELAY.toSeconds(), demoCode);
        }
    }

    public Dispatch resend(HttpSession session, String challengeId, String purpose) {
        long now = clock.millis();
        synchronized (session) {
            Challenge current = challenges(session).get(challengeId);
            if (current == null || current.expiresAt() <= now || !current.purpose().equals(purpose)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码已失效，请重新登录");
            }
            if (current.resendAt() > now) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "请等待 60 秒后再重新发送验证码");
            }
            challenges(session).put(challengeId, new Challenge(purpose, current.destination(), demoCode,
                    now + CODE_LIFETIME.toMillis(), now + RESEND_DELAY.toMillis(), current.attempts()));
            return new Dispatch(challengeId, (int) CODE_LIFETIME.toSeconds(), (int) RESEND_DELAY.toSeconds(), demoCode);
        }
    }

    public void verify(HttpSession session, String challengeId, String purpose, String destination, String code) {
        if (session == null || challengeId == null || code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入短信验证码");
        }
        Challenge challenge;
        synchronized (session) {
            challenge = challenges(session).get(challengeId);
            if (challenge == null || challenge.expiresAt() <= clock.millis()
                    || !challenge.purpose().equals(purpose) || !challenge.destination().equals(destination)) {
                challenges(session).remove(challengeId);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码已失效，请重新发送");
            }
            if (!matches(challenge.code(), code.trim())) {
                if (challenge.attempts() + 1 >= MAX_ATTEMPTS) challenges(session).remove(challengeId);
                else challenges(session).put(challengeId, challenge.withAttempt());
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码不正确");
            }
            challenges(session).remove(challengeId);
        }
    }

    public boolean isDemoDestination(String destination) {
        return demoLoginEnabled && demoPhone.equals(destination);
    }

    public boolean isDemoEnabled() {
        return demoLoginEnabled;
    }

    public String demoPhone() {
        return demoPhone;
    }

    public String demoCode() {
        return demoCode;
    }

    private void requireDemoDelivery(String destination) {
        if (!isDemoDestination(destination)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "尚未配置真实短信服务，请使用本地演示账号或账号密码登录");
        }
    }

    private boolean matches(String expected, String actual) {
        return MessageDigest.isEqual(expected.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                actual.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
