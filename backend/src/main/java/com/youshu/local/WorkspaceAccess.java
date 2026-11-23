package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
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
        Map.entry("人员管理", "/member/index"), Map.entry("成员管理", "/member/index"), Map.entry("角色管理", "/member/role"),
        Map.entry("操作日志", "/member/log"), Map.entry("操作日志统计", "/member/logStatistics"),
        Map.entry("门店装修", "/setting/index"), Map.entry("接口计费", "/interfaceBilling/index"),
        Map.entry("招投标查询", "/bidding/index")
    );
    private static final Map<String, List<String>> GROUPS = Map.of(
        "首页", List.of("首页"),
        "智慧招商", List.of("政策管理", "企业查询", "产业图谱", "供应链", "园区楼宇", "商机地图", "商机大厅", "招投标查询"),
        "商机洞察", List.of("商机摸排", "企业扩张", "项目线索", "外呼任务", "通话记录", "数据看板"),
        "安商稳商", List.of("全景洞察", "园区管理", "企业档案", "迁移预警", "企服保障", "走访管理"),
        "平台管理", List.of("人员管理", "角色管理", "操作日志", "操作日志统计", "门店装修", "接口计费")
    );
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    WorkspaceAccess(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public record Principal(String user, String subject, String role, boolean administrator, Set<String> permissions) {
        public boolean allows(String route, String group, String action) {
            return administrator || permissions.contains("route:" + route)
                && (action == null || permissions.contains("button:" + group + ":" + action));
        }
    }

    Principal current(HttpSession session) {
        if (session == null || !(session.getAttribute("user") instanceof String username))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录");
        if (Boolean.TRUE.equals(session.getAttribute("demo"))) {
            return new Principal(username, "demo", "本地演示管理员", true, Set.of());
        }
        return resolve(username);
    }

    Principal resolve(String username) {
        boolean owner = jdbc.queryForObject("SELECT COUNT(*) FROM local_account WHERE username=?", Integer.class, username) > 0;
        List<Map<String, Object>> members = jdbc.query(
            "SELECT r.payload FROM member_account a JOIN records r ON r.collection='members' AND r.id=a.member_id WHERE a.username=?",
            (rs, n) -> decode(rs.getString(1)), username);
        if (owner && members.isEmpty()) return new Principal(username, "owner", "本地管理员", true, Set.of());
        if (members.isEmpty() || "停用".equals(members.getFirst().get("status"))) throw denied("账号已停用或移除");
        var member = members.getFirst();
        List<Map<String, Object>> roles = jdbc.query("SELECT payload FROM records WHERE collection='roles'",
            (rs, n) -> decode(rs.getString(1)));
        Map<String, Object> role = roles.stream().filter(row -> member.get("roleId") != null
            ? Objects.equals(String.valueOf(row.get("id")), String.valueOf(member.get("roleId")))
            : Objects.equals(row.get("name"), member.get("role"))).findFirst()
            .orElseThrow(() -> denied("账号尚未分配有效角色"));
        if ("停用".equals(role.get("status"))) throw denied("当前账号角色已停用，请联系管理员");
        return new Principal(username, "member:" + member.get("id"), String.valueOf(role.get("name")), false, permissions(role));
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
            if (all || labels.contains(group)) for (String action : List.of("新增", "编辑", "删除", "导出"))
                ids.add("button:" + group + ":" + action);
            if (labels.contains("数据导出")) ids.add("button:" + group + ":导出");
            if (group.equals("平台管理") && labels.contains("成员管理")) for (String action : List.of("新增", "编辑", "删除")) ids.add("button:" + group + ":" + action);
        });
        return ids;
    }

    private Map<String, Object> decode(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (IOException ex) { throw new IllegalStateException(ex); }
    }

    static ResponseStatusException denied(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }

    static String groupFor(String route) {
        return GROUPS.entrySet().stream()
            .filter(entry -> entry.getValue().stream().anyMatch(label -> route.equals(LEGACY_ROUTES.get(label))))
            .map(Map.Entry::getKey).findFirst().orElse("");
    }
}
