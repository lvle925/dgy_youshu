package com.youshu.local;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
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

    public CaptchaService() { this(Clock.systemUTC(), null); }
    CaptchaService(Clock clock) { this(clock, null); }
    CaptchaService(Clock clock, Supplier<String> answerSupplier) { this.clock = clock; this.answerSupplier = answerSupplier; }

    private record Challenge(String answer, long expiresAt) {}
    public record Captcha(String id, String image, int expiresIn) {}

    @SuppressWarnings("unchecked")
    private Map<String, Challenge> challenges(HttpSession session) {
        var value = session.getAttribute(SESSION_KEY);
        if (value instanceof Map) return (Map<String, Challenge>) value;
        var entries = new LinkedHashMap<String, Challenge>();
        session.setAttribute(SESSION_KEY, entries);
        return entries;
    }

    public Captcha issue(HttpSession session) {
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
        return new Captcha(id, image, (int) LIFETIME.toSeconds());
    }

    public void verify(HttpSession session, String id, String answer) {
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

    private String render(String answer) {
        BufferedImage image = new BufferedImage(164, 52, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(new Color(239, 244, 251)); g.fillRect(0, 0, 164, 52);
            for (int i = 0; i < 5; i++) {
                g.setColor(new Color(165, 185, 215, 75));
                g.drawLine(random.nextInt(164), random.nextInt(52), random.nextInt(164), random.nextInt(52));
            }
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 29));
            for (int i = 0; i < answer.length(); i++) {
                var transform = g.getTransform();
                g.rotate((random.nextDouble() - .5) * .22, 25 + i * 35, 27);
                g.setColor(new Color(18 + random.nextInt(30), 62 + random.nextInt(35), 120 + random.nextInt(40)));
                g.drawString(answer.substring(i, i + 1), 17 + i * 35, 37 + random.nextInt(3));
                g.setTransform(transform);
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception exception) { throw new IllegalStateException("无法生成验证码", exception); }
        finally { g.dispose(); }
    }
}
