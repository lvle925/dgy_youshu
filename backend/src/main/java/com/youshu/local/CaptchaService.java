package com.youshu.local;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public class CaptchaService {
    private static final String SESSION_KEY = CaptchaService.class.getName();
    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final Duration LIFETIME = Duration.ofMinutes(5);
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;
    private final Supplier<String> answerSupplier;
    private final RestClient restClient;

    @Value("${app.auth.turnstile-site-key:}")
    private String turnstileSiteKey;

    @Value("${app.auth.turnstile-secret-key:}")
    private String turnstileSecretKey;

    public CaptchaService() { this(Clock.systemUTC(), null, RestClient.create(), "", ""); }
    CaptchaService(Clock clock) { this(clock, null, RestClient.create(), "", ""); }
    CaptchaService(Clock clock, Supplier<String> answerSupplier) { this(clock, answerSupplier, RestClient.create(), "", ""); }
    CaptchaService(Clock clock, Supplier<String> answerSupplier, RestClient restClient) {
        this(clock, answerSupplier, restClient, "", "");
    }
    CaptchaService(Clock clock, Supplier<String> answerSupplier, RestClient restClient,
                   String turnstileSiteKey, String turnstileSecretKey) {
        this.clock = clock;
        this.answerSupplier = answerSupplier;
        this.restClient = restClient;
        this.turnstileSiteKey = turnstileSiteKey;
        this.turnstileSecretKey = turnstileSecretKey;
    }

    private record Challenge(String answer, long expiresAt) {}
    public record Captcha(String provider, String siteKey, String id, String image, int expiresIn) {}

    @SuppressWarnings("unchecked")
    private Map<String, Challenge> challenges(HttpSession session) {
        var value = session.getAttribute(SESSION_KEY);
        if (value instanceof Map) return (Map<String, Challenge>) value;
        var entries = new LinkedHashMap<String, Challenge>();
        session.setAttribute(SESSION_KEY, entries);
        return entries;
    }

    public Captcha issue(HttpSession session) {
        if (turnstileEnabled()) return new Captcha("turnstile", turnstileSiteKey, "", "", 300);
        StringBuilder answer = new StringBuilder();
        if (answerSupplier != null) answer.append(answerSupplier.get());
        else for (int i = 0; i < 4; i++) answer.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        if (answer.length() != 4) throw new IllegalStateException("验证码必须为4位");
        String id = UUID.randomUUID().toString();
        String image = render(answer.toString());
        synchronized (session) {
            var entries = challenges(session);
            entries.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= clock.millis());
            while (entries.size() >= 4) entries.remove(entries.keySet().iterator().next());
            entries.put(id, new Challenge(answer.toString(), clock.millis() + LIFETIME.toMillis()));
        }
        return new Captcha("image", "", id, image, (int) LIFETIME.toSeconds());
    }

    public void verify(HttpSession session, String id, String answer) {
        verify(session, id, answer, "", "");
    }

    public void verify(HttpSession session, String id, String answer, String token, String remoteIp) {
        if (turnstileEnabled()) {
            verifyTurnstile(token, remoteIp);
            return;
        }
        if (session == null || id == null || id.isBlank() || answer == null || answer.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入图片验证码");
        Challenge challenge;
        synchronized (session) { challenge = challenges(session).remove(id); }
        if (challenge == null || challenge.expiresAt() <= clock.millis())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码已失效，请点击图片刷新");
        String normalized = answer.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() != 4 || !MessageDigest.isEqual(challenge.answer().getBytes(StandardCharsets.US_ASCII), normalized.getBytes(StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "验证码不正确，请重新输入");
    }

    private boolean turnstileEnabled() {
        boolean siteKeyConfigured = turnstileSiteKey != null && !turnstileSiteKey.isBlank();
        boolean secretConfigured = turnstileSecretKey != null && !turnstileSecretKey.isBlank();
        if (siteKeyConfigured != secretConfigured) {
            throw new IllegalStateException("Turnstile requires both site and secret keys");
        }
        return siteKeyConfigured;
    }

    private void verifyTurnstile(String token, String remoteIp) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请完成人机验证");
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", turnstileSecretKey);
        form.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) form.add("remoteip", remoteIp);
        try {
            Map<?, ?> result = restClient.post()
                    .uri("https://challenges.cloudflare.com/turnstile/v0/siteverify")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "人机验证未通过，请重试");
            }
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "人机验证服务暂不可用，请稍后重试", exception);
        }
    }

    private String render(String answer) {
        BufferedImage image = new BufferedImage(188, 60, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setPaint(new GradientPaint(0, 0, new Color(250, 252, 255), 188, 60, new Color(233, 240, 250)));
            g.fillRect(0, 0, 188, 60);
            for (int i = 0; i < 38; i++) {
                int shade = 185 + random.nextInt(46);
                g.setColor(new Color(shade, Math.min(255, shade + 2), 255));
                int size = 1 + random.nextInt(3);
                g.fillOval(random.nextInt(188), random.nextInt(60), size, size);
            }
            for (int i = 0; i < 4; i++) {
                g.setColor(new Color(120, 147, 184, 58));
                g.setStroke(new BasicStroke(1.2f + random.nextFloat()));
                int y = 8 + random.nextInt(44);
                g.draw(new java.awt.geom.QuadCurve2D.Float(-8, y, 70, y + random.nextInt(17) - 8,
                        196, 5 + random.nextInt(50)));
            }
            String[] fonts = {Font.SANS_SERIF, Font.SERIF, Font.MONOSPACED, Font.DIALOG};
            for (int i = 0; i < answer.length(); i++) {
                Graphics2D character = (Graphics2D) g.create();
                try {
                    int x = 22 + i * 40 + random.nextInt(5) - 2;
                    int y = 41 + random.nextInt(7) - 3;
                    character.rotate((random.nextDouble() - .5) * .22, x + 14, y - 13);
                    character.setFont(new Font(fonts[random.nextInt(fonts.length)], Font.BOLD, 31 + random.nextInt(3)));
                    character.setColor(new Color(18 + random.nextInt(26), 56 + random.nextInt(32), 113 + random.nextInt(42)));
                    character.drawString(answer.substring(i, i + 1), x, y);
                } finally {
                    character.dispose();
                }
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (IOException exception) { throw new IllegalStateException("无法生成验证码", exception); }
        finally { g.dispose(); }
    }
}
