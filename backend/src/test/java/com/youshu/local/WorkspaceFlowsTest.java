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
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    void resetSecurityAndAuditState() {
        jdbc.update("DELETE FROM login_attempt");
        jdbc.update("DELETE FROM op_log");
        jdbc.update("DELETE FROM auth_session");
    }

    @Test
    void projectInformationIsVisibleAndSensitivePhoneReadsAreAudited() throws Exception {
        MockHttpSession owner = demo();
        mvc.perform(get("/api/records/clues").session(owner))
            .andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.containsString("苏州晶湛半导体有限公司")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("139****3821")));
        mvc.perform(post("/api/projects/D001/sensitive-contact").session(owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.contact").value("刘先生"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE action='查阅敏感联系方式' AND object_id='D001'", Integer.class));
        mvc.perform(get("/api/workspace/points").session(owner)).andExpect(status().isNotFound());
    }

    @Test
    void threePersonnelRolesCannotCrossAuditAndSensitiveBoundaries() throws Exception {
        MockHttpSession demo = demo();
        mvc.perform(post("/api/records/roles").session(demo).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("name", "伪造审计角色", "permissions", List.of("route:/member/log")))))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/records/roles").session(demo).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("name", "伪造敏感角色", "permissions", List.of(
                    "route:/business/projectCluesUpdate/index", "action:/business/projectCluesUpdate/index:view_sensitive")))))
            .andExpect(status().isForbidden());

        String memberId = id(create(demo, "members", Map.of("name", "系统管理员验收", "username", "sysadmin-" + UUID.randomUUID(),
            "initialPassword", "SysAdminPass123", "roleId", "builtin-system-admin", "status", "启用")));
        String username = jdbc.queryForObject("SELECT username FROM member_account WHERE member_id=?", String.class, memberId);
        MockHttpSession systemAdmin = login(username, "SysAdminPass123");
        mvc.perform(get("/api/audit/logs").session(systemAdmin)).andExpect(status().isForbidden());
        mvc.perform(get("/api/audit/statistics").session(systemAdmin)).andExpect(status().isForbidden());
        mvc.perform(post("/api/records/members").session(systemAdmin).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("name", "自我提权验收", "username", username,
                    "roleId", "builtin-security-officer", "status", "启用", "dataScope", "ALL_PARKS"))))
            .andExpect(status().isForbidden());

        String auditorId = id(create(demo, "members", Map.of("name", "安全审计员验收", "username", "auditor-" + UUID.randomUUID(),
            "initialPassword", "AuditorPass123", "roleId", "builtin-audit-officer", "status", "启用")));
        String auditorName = jdbc.queryForObject("SELECT username FROM member_account WHERE member_id=?", String.class, auditorId);
        MockHttpSession auditor = login(auditorName, "AuditorPass123");
        mvc.perform(get("/api/audit/logs").session(auditor)).andExpect(status().isOk());
        mvc.perform(post("/api/audit/export").session(auditor).contentType(MediaType.APPLICATION_JSON)
                .content("{\"route\":\"/member/log\",\"name\":\"audit.csv\"}"))
            .andExpect(status().isNoContent());
        mvc.perform(delete("/api/records/roles/builtin-audit-officer").session(auditor))
            .andExpect(status().isForbidden());
    }

    @Test
    void assignedParkScopeFiltersRowsAndBlocksCrossParkUpdates() throws Exception {
        MockHttpSession owner = demo();
        String role = id(create(owner, "roles", Map.of("name", "张江园区只读", "permissions", List.of("route:/parksBuildings/index", "action:/parksBuildings/index:edit"), "status", "启用")));
        String username = "park-" + UUID.randomUUID();
        String password = "ParkPass123456";
        String memberId = id(create(owner, "members", Map.of("username", username, "initialPassword", password,
            "name", "园区专员", "status", "启用", "roleId", role, "dataScope", "ASSIGNED_PARKS", "parkIds", List.of("张江人工智能岛"))));
        var login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", username, "password", password))))
            .andExpect(status().isOk()).andReturn();
        var member = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/api/records/parksBuildings").session(member))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("张江人工智能岛"))
            .andExpect(jsonPath("$[1]").doesNotExist());
        mvc.perform(put("/api/records/parksBuildings/K001").session(member).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"越权修改\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void selfOnlyScopeHidesUnassignedRecordsAndKeepsNewRecordsOwned() throws Exception {
        MockHttpSession owner = demo();
        jdbc.update("DELETE FROM records WHERE collection='clues' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.company')) IN ('未分配项目','本人负责项目')");
        create(owner, "clues", Map.of("company", "未分配项目", "intent", "测试", "region", "上海市"));
        String role = id(create(owner, "roles", Map.of("name", "本人项目范围", "permissions", List.of(
            "route:/business/projectCluesUpdate/index", "action:/business/projectCluesUpdate/index:create",
            "action:/business/projectCluesUpdate/index:edit"), "status", "启用")));
        String username = "self-only-" + UUID.randomUUID();
        String password = "SelfOnlyPass123";
        String memberId = id(create(owner, "members", Map.of("username", username, "initialPassword", password,
            "name", "本人项目专员", "status", "启用", "roleId", role, "dataScope", "SELF_ONLY")));
        var login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", username, "password", password))))
            .andExpect(status().isOk()).andReturn();
        var member = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/api/records/clues").session(member))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.company == '未分配项目')]").isEmpty());
        mvc.perform(post("/api/records/clues").session(member).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("company", "本人负责项目", "intent", "测试", "region", "上海市"))))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.ownerId").value(memberId));
        jdbc.update("DELETE FROM records WHERE collection='clues' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.company')) IN ('未分配项目','本人负责项目')");
        jdbc.update("DELETE FROM records WHERE collection='members' AND id=?", memberId);
        jdbc.update("DELETE FROM member_account WHERE member_id=?", memberId);
        jdbc.update("DELETE FROM records WHERE collection='roles' AND id=?", role);
    }

    @Test
    void fiveFailedPasswordAttemptsLockAccountForFifteenMinutes() throws Exception {
        MockHttpSession owner = demo();
        String role = id(create(owner, "roles", Map.of("name", "锁定测试角色", "permissions", List.of("route:/home/index"), "status", "启用")));
        String username = "locked-" + UUID.randomUUID();
        create(owner, "members", Map.of("username", username, "initialPassword", "CorrectPass123",
            "name", "锁定验收", "status", "启用", "roleId", role));
        for (int attempt = 0; attempt < 4; attempt++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsBytes(Map.of("username", username, "password", "WrongPass12345"))))
                .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", username, "password", "WrongPass12345"))))
            .andExpect(status().isLocked());
        assertEquals(5, jdbc.queryForObject("SELECT failed_attempts FROM login_attempt WHERE username=?", Integer.class, username));
    }

    @Test
    void completingLinkedVisitClosesPersistedServiceRequest() throws Exception {
        MockHttpSession owner = demo();
        String serviceId = id(create(owner, "serviceRequests", Map.of("name", "企业测试", "company", "企业测试",
            "title", "政策申报辅导", "status", "办理中", "park", "张江人工智能岛", "dueAt", "2026-12-01")));
        String visitId = id(create(owner, "visitOrders", Map.of("title", "企业诉求回访", "company", "企业测试",
            "serviceRequestId", serviceId, "status", "走访中", "park", "张江人工智能岛")));
        mvc.perform(post("/api/visits/{id}/complete", visitId).session(owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"result\":\"已完成政策申报材料辅导\",\"duration\":\"40 分钟\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.order.status").value("已完成"));
        assertEquals("已办结", jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.status')) FROM records WHERE collection='serviceRequests' AND id=?", String.class, serviceId));
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
            .andExpect(jsonPath("$[1].city").value("苏州市"))
            .andExpect(jsonPath("$[1].opening").value("验收开场"));
    }

    @Test
    void interfaceMonitoringCountsOnlyApiCallEvents() throws Exception {
        MockHttpSession owner = demo();
        Timestamp now = Timestamp.valueOf(LocalDateTime.now(ZoneId.of("Asia/Shanghai")));
        jdbc.update("INSERT INTO op_log(occurred_at,actor,department_id,module,action,object_type,object_id,result_status,ip,user_agent,duration_ms) " +
            "VALUES(?,?,?,?,?,?,?,?,?,?,?)", now, "demo", "DPT-INVEST", "企业档案", "查询接口", "API", "/api/records/companyArchives", "成功", "127.0.0.1", "test", 42);
        jdbc.update("INSERT INTO op_log(occurred_at,actor,department_id,module,action,object_type,object_id,result_status,ip,user_agent,duration_ms) " +
            "VALUES(?,?,?,?,?,?,?,?,?,?,?)", now, "demo", "DPT-INVEST", "企业档案", "编辑", "companyArchives", "COMPANY-1", "成功", "127.0.0.1", "test", 500);
        mvc.perform(get("/api/system/interface-metrics").session(owner))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalCalls").value(1))
            .andExpect(jsonPath("$.successRate").value(100.0))
            .andExpect(jsonPath("$.averageDuration").value(42.0));
        mvc.perform(get("/api/records/policies")).andExpect(status().isUnauthorized());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE object_type='API' AND result_status='失败'", Integer.class));
    }

    @Test
    void demoDataResetRestoresSeedsAndPreservesSecurityAdministration() throws Exception {
        MockHttpSession demo = demo();
        create(demo, "clues", Map.of("company", "演示重置验收记录", "intent", "演示", "region", "上海市"));
        mvc.perform(post("/api/demo/reset").session(demo))
            .andExpect(status().isOk()).andExpect(jsonPath("$.restoredRecords").isNumber());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='clues' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.company'))='演示重置验收记录'", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='roles' AND id='builtin-audit-officer'", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='tenantSettings' AND id='workspace'", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE action='恢复初始政务演示数据'", Integer.class));
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

    private MockHttpSession login(String username, String password) throws Exception {
        var result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", username, "password", password))))
            .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
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
