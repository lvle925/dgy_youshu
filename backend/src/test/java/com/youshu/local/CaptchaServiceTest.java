package com.youshu.local;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;
import javax.imageio.ImageIO;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.http.HttpMethod.POST;

import static org.junit.jupiter.api.Assertions.*;

class CaptchaServiceTest {
    @Test void issuesAndConsumesSingleUseChallengeBoundToSession() throws Exception {
        var service = new CaptchaService(Clock.systemUTC(), () -> "A2BC");
        HttpSession session = new MockHttpSession();
        var captcha = service.issue(session);
        assertTrue(captcha.image().startsWith("data:image/png;base64,"));
        var image = ImageIO.read(new ByteArrayInputStream(Base64.getDecoder().decode(captcha.image().substring("data:image/png;base64,".length()))));
        assertEquals(188, image.getWidth());
        assertEquals(60, image.getHeight());
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

    @Test void verifiesTurnstileTokenWithCloudflareSiteverify() {
        RestClient.Builder clientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(clientBuilder).build();
        CaptchaService service = new CaptchaService(Clock.systemUTC(), () -> "A2BC",
                clientBuilder.build(), "test-site-key", "test-secret-key");

        var challenge = service.issue(new MockHttpSession());
        assertEquals("turnstile", challenge.provider());
        assertEquals("test-site-key", challenge.siteKey());

        server.expect(requestTo("https://challenges.cloudflare.com/turnstile/v0/siteverify"))
                .andExpect(method(POST))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("secret=test-secret-key")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("response=token-value")))
                .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));

        service.verify(null, "", "", "token-value", "127.0.0.1");
        server.verify();
    }

    @Test void rejectsTurnstileTokenWhenSiteverifyFails() {
        RestClient.Builder clientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(clientBuilder).build();
        CaptchaService service = new CaptchaService(Clock.systemUTC(), () -> "A2BC",
                clientBuilder.build(), "test-site-key", "test-secret-key");
        server.expect(requestTo("https://challenges.cloudflare.com/turnstile/v0/siteverify"))
                .andRespond(withSuccess("{\"success\":false}", MediaType.APPLICATION_JSON));

        assertThrows(ResponseStatusException.class,
                () -> service.verify(null, "", "", "invalid-token", ""));
        server.verify();
    }
}
