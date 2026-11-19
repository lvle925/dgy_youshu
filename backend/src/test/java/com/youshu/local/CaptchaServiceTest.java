package com.youshu.local;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class CaptchaServiceTest {
    @Test void issuesAndConsumesSingleUseChallengeBoundToSession() {
        var service = new CaptchaService(Clock.systemUTC(), () -> "A2BC");
        HttpSession session = new MockHttpSession();
        var captcha = service.issue(session);
        assertTrue(captcha.image().startsWith("data:image/png;base64,"));
        assertEquals(300, captcha.expiresIn());
        assertNotNull(session.getAttribute(CaptchaService.class.getName()));
        service.verify(session, captcha.id(), "a2bc");
        assertThrows(ResponseStatusException.class, () -> service.verify(session, captcha.id(), "A2BC"));
    }

    @Test void expiresChallengeAfterFiveMinutes() {
        var now = new AtomicReference<>(Instant.parse("2026-11-19T00:00:00Z"));
        Clock clock = new Clock() {
            @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId zone) { return this; }
            @Override public Instant instant() { return now.get(); }
        };
        var service = new CaptchaService(clock, () -> "A2BC");
        HttpSession session = new MockHttpSession();
        var captcha = service.issue(session);
        now.updateAndGet(instant -> instant.plusSeconds(301));
        assertThrows(ResponseStatusException.class, () -> service.verify(session, captcha.id(), "A2BC"));
    }

    @Test void rejectsWrongAnswerAndOtherSession() {
        var service = new CaptchaService(Clock.systemUTC(), () -> "A2BC");
        HttpSession first = new MockHttpSession();
        HttpSession other = new MockHttpSession();
        var captcha = service.issue(first);
        assertThrows(ResponseStatusException.class, () -> service.verify(other, captcha.id(), "A2BC"));
        assertThrows(ResponseStatusException.class, () -> service.verify(first, captcha.id(), "WRNG"));
        assertThrows(ResponseStatusException.class, () -> service.verify(first, captcha.id(), "A2BC"));
    }
}
