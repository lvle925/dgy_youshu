package com.youshu.local;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "app.auth.demo-login-enabled=true",
    "app.auth.device-verification-enabled=false"
})
@AutoConfigureMockMvc
class WorkspaceFlowsTest {
    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv().getOrDefault(
            "TEST_MYSQL_URL",
            "jdbc:mysql://127.0.0.1:3307/youshu_test?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai"));
        registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("TEST_MYSQL_USERNAME", "youshu_test"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_MYSQL_PASSWORD", "youshu_test_password"));
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean CaptchaService captcha;

    @BeforeEach
    void resetDailyProjectUnlocks() {
        jdbc.update("DELETE FROM project_unlock");
    }

    @Test
    void concurrentUnlockChargesOnlyOnceAndRevealsContact() throws Exception {
        MockHttpSession owner = demo();
        mvc.perform(get("/api/workspace/points").session(owner)).andExpect(jsonPath("$.remaining").value(50));
        mvc.perform(get("/api/workspace/projects/D001/contact").session(owner)).andExpect(status().isForbidden());

        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> unlock(owner, "D001"));
            var second = workers.submit(() -> unlock(owner, "D001"));
            assertEquals(80, first.get() + second.get());
        }

        mvc.perform(get("/api/workspace/points").session(owner))
            .andExpect(jsonPath("$.remaining").value(40)).andExpect(jsonPath("$.unlockedIds[0]").value("D001"));
        mvc.perform(get("/api/workspace/projects/D001/contact").session(owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.contact").exists());
    }

    @Test
    void memberIsBoundToRoleAndLiveRoleChangesRevokeAccess() throws Exception {
        MockHttpSession owner = demo();
        String role = id(create(owner, "roles", Map.of("name", "政策查看验收", "permissions",
            List.of("route:/policy/index"), "status", "启用")));
        String username = "qa-" + UUID.randomUUID();
        String password = UUID.randomUUID().toString();
        create(owner, "members", Map.of("username", username, "initialPassword", password,
            "name", "验收账号", "status", "启用", "roleId", role))
            .andExpect(jsonPath("$.initialPassword").doesNotExist());
        var login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", username, "password", password))))
            .andExpect(status().isOk()).andReturn();
        var member = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/api/auth/status").session(member)).andExpect(jsonPath("$.principal.permissions[0]").value("route:/policy/index"));
        mvc.perform(get("/api/records/policies").session(member)).andExpect(status().isOk());
        mvc.perform(get("/api/records/members").session(member)).andExpect(status().isForbidden());
        mvc.perform(post("/api/records/policies").session(member).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());

        update(owner, "roles", role, Map.of("status", "停用")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/status").session(member)).andExpect(jsonPath("$.authenticated").value(false))
            .andExpect(jsonPath("$.reason").value("当前账号角色已停用，请联系管理员"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", username, "password", password))))
            .andExpect(status().isForbidden());
    }

    @Test
    void auditAndSettingsAreReadBackFromDatabase() throws Exception {
        MockHttpSession owner = demo();
        update(owner, "investigationTasks", "M001", Map.of("status", "已完成"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.history[0].operator").value("本地演示管理员"));
        mvc.perform(get("/api/records/investigationTasks").session(owner))
            .andExpect(jsonPath("$[0].history[0].to").value("已完成"));
        var script = Map.of("opening", "验收开场", "qa", "验收问答", "ending", "验收结束");
        mvc.perform(put("/api/records/aiScripts/config/苏州市").session(owner).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsBytes(script))).andExpect(status().isOk());
        mvc.perform(get("/api/records/aiScripts").session(owner))
            .andExpect(jsonPath("$[0].city").value("苏州市")).andExpect(jsonPath("$[0].opening").value("验收开场"));
    }

    @Test
    void verifiesTrustedDeviceUsingMySql() {
        var sms = new SmsVerificationService(Clock.systemUTC(), true, "127127", "127127");
        var trustedDevices = new TrustedDeviceService(jdbc, sms, true);
        String username = "trusted-" + UUID.randomUUID();
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();

        var challenge = trustedDevices.login(username, request, response);
        assertEquals(true, challenge.get("requiresDeviceVerification"));

        var verified = trustedDevices.verify(
            String.valueOf(challenge.get("deviceChallengeId")), "127127", true, request, response);
        assertEquals(username, verified.get("user"));
        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM trusted_device WHERE username=?", Integer.class, username));
    }

    private MockHttpSession demo() throws Exception {
        var result = mvc.perform(post("/api/auth/demo-login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"phone\":\"127127\"}")).andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private int unlock(MockHttpSession session, String id) throws Exception {
        var response = mvc.perform(post("/api/workspace/projects/{id}/unlock", id).session(session))
            .andExpect(status().isOk()).andReturn().getResponse();
        return json.readTree(response.getContentAsByteArray()).get("remaining").asInt();
    }

    private ResultActions create(MockHttpSession session, String collection, Map<String, ?> row) throws Exception {
        return mvc.perform(post("/api/records/{collection}", collection).session(session)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(row))).andExpect(status().isCreated());
    }

    private ResultActions update(MockHttpSession session, String collection, String id, Map<String, ?> row) throws Exception {
        return mvc.perform(put("/api/records/{collection}/{id}", collection, id).session(session)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(row)));
    }

    private String id(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsByteArray()).get("id").asText();
    }
}
