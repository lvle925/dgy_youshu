package com.youshu.local;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;

import static org.junit.jupiter.api.Assertions.*;

class SmsVerificationServiceTest {
    @Test void demoCodeIsSessionBoundSingleUseAndExpires() {
        var service = new SmsVerificationService(Clock.systemUTC(), true, "127127", "127127");
        var session = new MockHttpSession();
        var dispatch = service.send(session, "login", "127127");

        assertEquals("127127", dispatch.demoCode());
        service.verify(session, dispatch.challengeId(), "login", "127127", "127127");
        assertThrows(ResponseStatusException.class,
                () -> service.verify(session, dispatch.challengeId(), "login", "127127", "127127"));
    }

    @Test void demoSmsIsRateLimitedAndUnavailableForOtherNumbers() {
        var service = new SmsVerificationService(Clock.systemUTC(), true, "127127", "127127");
        var session = new MockHttpSession();
        service.send(session, "login", "127127");

        assertThrows(ResponseStatusException.class, () -> service.send(session, "login", "127127"));
        assertThrows(ResponseStatusException.class, () -> service.send(session, "login", "13800138000"));
    }

    @Test void rejectsWrongCodeAndConsumesAfterTooManyAttempts() {
        var service = new SmsVerificationService(Clock.systemUTC(), true, "127127", "127127");
        var session = new MockHttpSession();
        var dispatch = service.send(session, "login", "127127");

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThrows(ResponseStatusException.class,
                    () -> service.verify(session, dispatch.challengeId(), "login", "127127", "000000"));
        }
        assertThrows(ResponseStatusException.class,
                () -> service.verify(session, dispatch.challengeId(), "login", "127127", "127127"));
    }
}
