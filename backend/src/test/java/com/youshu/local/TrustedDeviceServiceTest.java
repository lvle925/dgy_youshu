package com.youshu.local;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TrustedDeviceServiceTest {
    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private SmsVerificationService sms;
    private TrustedDeviceService service;

    @BeforeEach void setUp() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .addScript("classpath:schema.sql").build();
        jdbc = new JdbcTemplate(database);
        sms = new SmsVerificationService(java.time.Clock.systemUTC(), true, "127127", "127127");
        service = new TrustedDeviceService(jdbc, sms, true);
    }

    @AfterEach void tearDown() {
        database.shutdown();
    }

    @Test void verifiesNewDeviceAndRemembersItForNinetyDays() {
        MockHttpServletRequest firstRequest = new MockHttpServletRequest();
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        Map<String, Object> challenge = service.login("operator", firstRequest, firstResponse);

        assertEquals(true, challenge.get("requiresDeviceVerification"));
        assertEquals("127127", challenge.get("demoCode"));

        Map<String, String> verified = service.verify(
                String.valueOf(challenge.get("deviceChallengeId")),
                "127127", true, firstRequest, firstResponse);
        assertEquals("operator", verified.get("user"));
        assertNotNull(firstRequest.getSession(false).getAttribute("user"));

        String setCookie = firstResponse.getHeader("Set-Cookie");
        assertNotNull(setCookie);
        String token = setCookie.substring(setCookie.indexOf('=') + 1, setCookie.indexOf(';'));
        Cookie trustedCookie = new Cookie("YS_TRUSTED_DEVICE", token);

        MockHttpServletRequest trustedRequest = new MockHttpServletRequest();
        trustedRequest.setCookies(trustedCookie);
        Map<String, Object> trustedLogin = service.login("operator", trustedRequest, new MockHttpServletResponse());
        assertEquals("operator", trustedLogin.get("user"));
        assertFalse(trustedLogin.containsKey("requiresDeviceVerification"));

        long expiry = jdbc.queryForObject("SELECT expires_at FROM trusted_device", Long.class);
        long expectedDuration = java.time.Duration.ofDays(90).toMillis();
        assertTrue(expiry - System.currentTimeMillis() <= expectedDuration);
        assertTrue(expiry - System.currentTimeMillis() > expectedDuration - 10_000);
    }

    @Test void wrongDeviceCodeDoesNotAuthenticateOrTrustTheDevice() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        Map<String, Object> challenge = service.login("operator", request, new MockHttpServletResponse());

        assertThrows(ResponseStatusException.class, () -> service.verify(
                String.valueOf(challenge.get("deviceChallengeId")), "000000", true,
                request, new MockHttpServletResponse()));
        assertNull(request.getSession(false).getAttribute("user"));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM trusted_device", Integer.class));
    }
}
