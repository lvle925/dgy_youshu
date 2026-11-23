package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class WorkspaceAccess {
    private static final Map<String, String> LEGACY_ROUTES = Map.ofEntries(
        Map.entry("首页", "/home/index"), Map.entry("政策管理", "/policy/index"),
        Map.entry("企业查询", "/subsidy/index"), Map.entry("产业图谱", "/industryChain/industryChart/index"),
        Map.entry("供应链", "/industryChain/industrySupply/index"), Map.entry("园区楼宇", "/parksBuildings/index"),
        Map.entry("商机地图", "/businessMap/index"), Map.entry("商机大厅", "/business/businessHall/index"),
        Map.entry("商机摸排", "/business/businessInvestigate/index"), Map.entry("企业扩张", "/business/projectClues/index"),
        Map.entry("项目线索", "/business/projectCluesUpdate/index"), Map.entry("外呼任务", "/business/aiOutbound/tasks"),
        Map.entry("通话记录", "/business/aiOutbound/records"), Map.entry("数据看板", "/business/aiOutbound/dashboard"),
        Map.entry("全景洞察", "/myCampus/panoramicLnsight/index"), Map.entry("园区管理", "/myCampus/campusAdmin/index"),
        Map.entry("企业档案", "/myCampus/corporateArchives/index"), Map.entry("迁移预警", "/myCampus/migrationWarning/index"),
        Map.entry("企服保障", "/myCampus/guarantee/index"), Map.entry("走访管理", "/myCampus/visitManage/index"),
        Map.entry("人员管理", "/member/index"), Map.entry("组织架构", "/member/departments"),
        Map.entry("角色管理", "/member/role"), Map.entry("操作日志", "/member/log"),
        Map.entry("操作日志统计", "/member/logStatistics"), Map.entry("系统与门户配置", "/setting/index"),
        Map.entry("数据服务与接口监控", "/system/interface-monitoring"), Map.entry("招投标查询", "/bidding/index")
    );
    private static final Map<String, List<String>> GROUPS = Map.of(
        "首页", List.of("首页"),
        "智慧招商", List.of("政策管理", "企业查询", "产业图谱", "供应链", "园区楼宇", "商机地图", "商机大厅", "招投标查询"),
        "商机洞察", List.of("商机摸排", "企业扩张", "项目线索", "外呼任务", "通话记录", "数据看板"),
        "安商稳商", List.of("全景洞察", "园区管理", "企业档案", "迁移预警", "企服保障", "走访管理"),
        "平台管理", List.of("人员管理", "组织架构", "角色管理", "操作日志", "操作日志统计", "系统与门户配置", "数据服务与接口监控")
    );
    private static final Map<String, String> ACTION_IDS = Map.of(
        "新增", "create", "编辑", "edit", "删除", "delete", "导出", "export", "查看敏感信息", "view_sensitive"
    );

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    WorkspaceAccess(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public record Principal(
        String user,
        String subject,
        String role,
        boolean administrator,
        Set<String> permissions,
        String departmentId,
        String dataScope,
        List<String> parkIds,
        String memberId,
        boolean mustChangePassword,
        String displayName,
        String departmentName,
        boolean watermarkEnabled,
        int sessionTimeoutMinutes
    ) {
        public boolean allows(String route, String group, String action) {
            if (administrator) return true;
            if (!permissions.contains("route:" + route)) return false;
            if (action == null) return true;
            String actionId = ACTION_IDS.getOrDefault(action, action);
            return permissions.contains("action:" + route + ":" + actionId)
                || permissions.contains("button:" + group + ":" + action);
        }
    }

    Principal current(HttpSession session) {
        if (session == null || !(session.getAttribute("user") instanceof String username))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录");
        long now = System.currentTimeMillis();
        int timeout = sessionTimeoutMinutes();
        int updated = jdbc.update("UPDATE auth_session SET expires_at=? WHERE session_id=? AND username=? AND expires_at>?",
            now + timeout * 60_000L, session.getId(), username, now);
        if (updated == 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "登录会话已失效，请重新登录");
        session.setMaxInactiveInterval(timeout * 60);
        if (Boolean.TRUE.equals(session.getAttribute("demo")))
            return new Principal(username, "demo", "本地政务演示管理员", false, demoPermissions(), "", "ALL_PARKS", List.of(), "", false,
                "本地政务演示管理员", "政府演示单位", watermarkEnabled(), timeout);
        return resolve(username);
    }

    void registerSession(HttpSession session, String username) {
        int timeout = sessionTimeoutMinutes();
        session.setMaxInactiveInterval(timeout * 60);
        jdbc.update("INSERT INTO auth_session(session_id,username,expires_at) VALUES(?,?,?) " +
                "ON DUPLICATE KEY UPDATE username=VALUES(username), expires_at=VALUES(expires_at)",
            session.getId(), username, System.currentTimeMillis() + timeout * 60_000L);
    }

    void revokeSession(HttpSession session) {
        if (session != null) jdbc.update("DELETE FROM auth_session WHERE session_id=?", session.getId());
    }

    void revokeUserSessions(String username) {
        jdbc.update("DELETE FROM auth_session WHERE username=?", username);
    }

    Principal resolve(String username) {
        boolean owner = jdbc.queryForObject("SELECT COUNT(*) FROM local_account WHERE username=?", Integer.class, username) > 0;
        List<Map<String, Object>> members = jdbc.query(
            "SELECT r.payload, a.must_change_password FROM member_account a JOIN records r ON r.collection='members' AND r.id=a.member_id WHERE a.username=?",
            (rs, n) -> {
                Map<String, Object> row = decode(rs.getString(1));
                row.put("mustChangePassword", rs.getBoolean(2));
                return row;
            }, username);
        if (owner && members.isEmpty()) {
            Map<String, Object> systemRole = jdbc.query("SELECT payload FROM records WHERE collection='roles' AND id='builtin-system-admin'",
                (rs, index) -> decode(rs.getString(1))).stream().findFirst().orElseThrow(() -> denied("系统管理员角色尚未初始化"));
            return new Principal(username, "owner", "系统管理员", false, permissions(systemRole), "", "ALL_PARKS", List.of(), "", false,
                username, "政府内部用户", watermarkEnabled(), sessionTimeoutMinutes());
        }
        if (members.isEmpty() || "停用".equals(members.getFirst().get("status"))) throw denied("账号已停用或移除");
        Map<String, Object> member = members.getFirst();
        Object validUntil = member.get("validUntil");
        if (validUntil instanceof String date && !date.isBlank()) {
            try {
                if (LocalDate.parse(date).isBefore(LocalDate.now(ZoneId.of("Asia/Shanghai")))) throw denied("账号已超过有效期，请联系管理员");
            } catch (java.time.format.DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "账号有效期配置无效");
            }
        }
        List<Map<String, Object>> roles = jdbc.query("SELECT payload FROM records WHERE collection='roles'",
            (rs, n) -> decode(rs.getString(1)));
        Map<String, Object> role = roles.stream().filter(row -> member.get("roleId") != null
            ? Objects.equals(String.valueOf(row.get("id")), String.valueOf(member.get("roleId")))
            : Objects.equals(row.get("name"), member.get("role"))).findFirst()
            .orElseThrow(() -> denied("账号尚未分配有效角色"));
        if ("停用".equals(role.get("status"))) throw denied("当前账号角色已停用，请联系管理员");
        List<String> parkIds = stringList(member.get("parkIds"));
        String scope = String.valueOf(member.getOrDefault("dataScope", "ASSIGNED_PARKS"));
        if (!Set.of("ALL_PARKS", "ASSIGNED_PARKS", "SELF_ONLY").contains(scope)) scope = "ASSIGNED_PARKS";
        return new Principal(username, "member:" + member.get("id"), String.valueOf(role.get("name")), false,
            permissions(role), String.valueOf(member.getOrDefault("departmentId", "")), scope, parkIds,
            String.valueOf(member.get("id")), Boolean.TRUE.equals(member.get("mustChangePassword")),
            String.valueOf(member.getOrDefault("name", username)),
            String.valueOf(member.getOrDefault("dept", member.getOrDefault("departmentName", ""))), watermarkEnabled(), sessionTimeoutMinutes());
    }

    Set<String> permissions(Map<String, Object> role) {
        Set<String> ids = new HashSet<>();
        if (role.get("permissions") instanceof List<?> saved) {
            saved.stream().filter(String.class::isInstance).map(String.class::cast).forEach(ids::add);
            return ids;
        }
        List<?> labels = role.get("perms") instanceof List<?> list ? list : List.of();
        GROUPS.forEach((group, entries) -> {
            boolean all = labels.contains("全部菜单");
            entries.stream().filter(label -> all || labels.contains(group) || labels.contains(label)
                || label.equals("人员管理") && labels.contains("成员管理"))
                .forEach(label -> ids.add("route:" + LEGACY_ROUTES.get(label)));
            if (all || labels.contains(group)) for (String action : List.of("新增", "编辑", "删除", "导出", "查看敏感信息"))
                ids.add("button:" + group + ":" + action);
            if (labels.contains("数据导出")) ids.add("button:" + group + ":导出");
            if (group.equals("平台管理") && labels.contains("成员管理")) for (String action : List.of("新增", "编辑", "删除")) ids.add("button:" + group + ":" + action);
        });
        return ids;
    }

    public static Map<String, String> routeGroups() {
        Map<String, String> result = new HashMap<>();
        GROUPS.forEach((group, entries) -> entries.forEach(label -> result.put(LEGACY_ROUTES.get(label), group)));
        return result;
    }

    private int sessionTimeoutMinutes() {
        try {
            String payload = jdbc.queryForObject("SELECT payload FROM records WHERE collection='tenantSettings' AND id='workspace'", String.class);
            Object value = decode(payload).get("sessionTimeoutMinutes");
            if (value instanceof Number number) return Math.max(5, Math.min(240, number.intValue()));
        } catch (Exception ignored) {
            // Initial setup uses the government default until the system policy is saved.
        }
        return 30;
    }

    boolean validPassword(String password) {
        if (password == null) return false;
        Map<String, Object> settings = systemSettings();
        int minimum = settings.get("passwordMinLength") instanceof Number number ? number.intValue() : 12;
        minimum = Math.max(12, Math.min(64, minimum));
        boolean requireLetter = !Boolean.FALSE.equals(settings.get("requirePasswordLetter"));
        boolean requireNumber = !Boolean.FALSE.equals(settings.get("requirePasswordNumber"));
        return password.length() >= minimum && password.length() <= 128
            && (!requireLetter || password.matches("(?s).*[A-Za-z].*"))
            && (!requireNumber || password.matches("(?s).*\\d.*"));
    }

    private boolean watermarkEnabled() {
        return !Boolean.FALSE.equals(systemSettings().get("watermarkEnabled"));
    }

    private Map<String, Object> systemSettings() {
        try {
            String payload = jdbc.queryForObject("SELECT payload FROM records WHERE collection='tenantSettings' AND id='workspace'", String.class);
            return decode(payload);
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> items)) return List.of();
        return items.stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }

    private Set<String> demoPermissions() {
        Set<String> permissions = new HashSet<>();
        routeGroups().forEach((route, group) -> {
            permissions.add("route:" + route);
            for (String action : List.of("create", "edit", "delete", "export"))
                permissions.add("action:" + route + ":" + action);
        });
        permissions.add("action:/business/projectCluesUpdate/index:view_sensitive");
        return permissions;
    }

    private Map<String, Object> decode(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (IOException ex) { throw new IllegalStateException(ex); }
    }

    static ResponseStatusException denied(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }

    static String groupFor(String route) {
        return routeGroups().getOrDefault(route, "");
    }
}
