package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
@Tag(name = "业务数据", description = "本地演示数据集的查询与维护")
public class RecordsController {
    private static final Set<String> COLLECTIONS = Set.of("members", "departments", "campusList", "visitOrders", "visitRecords", "roles", "policies", "clues", "parksBuildings", "investigationTasks", "matchCompanies",
        "opportunityModels", "tenantSettings", "aiScripts", "aiTasks", "aiRecords", "companyArchives", "migrationWarnings", "migrationRules", "serviceRequests", "biddingRecords", "industryNodes", "supplyRelations");
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final WorkspaceAccess access;
    private final AuditService audit;

    public RecordsController(JdbcTemplate jdbc, ObjectMapper mapper, WorkspaceAccess access, AuditService audit) throws IOException {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.access = access;
        this.audit = audit;
        ensureAccountSecurityColumn();
        Map<String, List<Map<String, Object>>> seeds = mapper.readValue(new ClassPathResource("seed.json").getInputStream(), new TypeReference<>() {});
        for (String collection : COLLECTIONS) {
            if (jdbc.queryForObject("SELECT COUNT(*) FROM seed_state WHERE collection=?", Integer.class, collection) == 0) {
                for (Map<String, Object> row : seeds.getOrDefault(collection, List.of())) save(collection, String.valueOf(row.get("id")), row);
                jdbc.update("INSERT INTO seed_state(collection) VALUES(?)", collection);
            }
        }
        ensureGovernmentRoles();
        migrateLegacyRoles();
        ensureParkScopeFields();
        ensureMemberScopeFields();
        ensureSyntheticProjectPhones();
        ensureDemoOutboundScript();
    }

    private void ensureParkScopeFields() {
        for (String collection : List.of("parksBuildings", "campusList")) {
            List<Map<String, Object>> rows = jdbc.query("SELECT id,payload FROM records WHERE collection=?",
                (rs, index) -> {
                    Map<String, Object> row = parse(rs.getString(2));
                    row.put("_recordId", rs.getString(1));
                    return row;
                }, collection);
            for (Map<String, Object> row : rows) {
                if (row.containsKey("park") && row.containsKey("parkId")) continue;
                String id = String.valueOf(row.remove("_recordId"));
                row.putIfAbsent("park", row.getOrDefault("name", ""));
                row.putIfAbsent("parkId", id);
                save(collection, id, row);
            }
        }
    }

    private void ensureParkMetadata(String collection, String id, Map<String, Object> row) {
        if (Set.of("parksBuildings", "campusList").contains(collection)) {
            row.putIfAbsent("park", row.getOrDefault("name", ""));
            row.putIfAbsent("parkId", id);
            return;
        }
        // 走访工单与走访记录以企业名关联业务，需补齐园区归属才能参与数据范围隔离。
        if (!Set.of("visitOrders", "visitRecords").contains(collection)) return;
        boolean hasPark = !String.valueOf(row.getOrDefault("park", "")).isBlank()
            || !String.valueOf(row.getOrDefault("parkId", "")).isBlank();
        if (hasPark) return;
        String park = resolveParkByCompany(row);
        if (park.isBlank()) return;
        row.put("park", park);
        row.putIfAbsent("parkId", park);
    }

    private void ensureMemberScopeFields() {
        Map<String, String> departmentIds = new HashMap<>();
        jdbc.query("SELECT id,payload FROM records WHERE collection='departments'", (rs, index) -> {
            Map<String, Object> department = parse(rs.getString(2));
            departmentIds.put(String.valueOf(department.getOrDefault("name", "")), rs.getString(1));
            return null;
        });
        departmentIds.put("招商运营部", "DPT-INVEST");
        departmentIds.put("园区服务部", "DPT-SERVICE");
        departmentIds.put("数据运营部", "DPT-ROOT");
        departmentIds.put("综合管理部", "DPT-ROOT");
        Map<String, String> parkIds = new HashMap<>();
        jdbc.query("SELECT id,payload FROM records WHERE collection='parksBuildings'", (rs, index) -> {
            Map<String, Object> park = parse(rs.getString(2));
            parkIds.put(String.valueOf(park.getOrDefault("name", "")), String.valueOf(park.getOrDefault("parkId", rs.getString(1))));
            return null;
        });
        List<Map<String, Object>> members = jdbc.query("SELECT id,payload FROM records WHERE collection='members'", (rs, index) -> {
            Map<String, Object> member = parse(rs.getString(2));
            member.put("_recordId", rs.getString(1));
            return member;
        });
        for (Map<String, Object> member : members) {
            boolean changed = false;
            if (!member.containsKey("departmentId") || String.valueOf(member.getOrDefault("departmentId", "")).isBlank()) {
                String departmentId = departmentIds.get(String.valueOf(member.getOrDefault("dept", "")));
                if (departmentId != null) {
                    member.put("departmentId", departmentId);
                    changed = true;
                }
            }
            boolean assignedParkNeedsMigration = "ASSIGNED_PARKS".equals(member.get("dataScope"))
                && (!(member.get("parkIds") instanceof List<?> assigned) || assigned.isEmpty())
                && !String.valueOf(member.getOrDefault("park", "")).isBlank()
                && !"全部园区".equals(member.get("park"));
            if (!member.containsKey("dataScope") || assignedParkNeedsMigration) {
                String roleId = String.valueOf(member.getOrDefault("roleId", ""));
                String role = String.valueOf(member.getOrDefault("role", ""));
                boolean allParks = Set.of("builtin-system-admin", "builtin-leader-readonly", "ROLE1", "ROLE5", "ROLE6").contains(roleId)
                    || Set.of("系统管理员", "安全保密员", "安全审计员", "只读领导视角").contains(role);
                member.put("dataScope", allParks ? "ALL_PARKS" : "ASSIGNED_PARKS");
                if (allParks) {
                    member.put("parkIds", List.of());
                    member.put("park", "全部园区");
                } else {
                    String park = String.valueOf(member.getOrDefault("park", ""));
                    String parkId = parkIds.get(park);
                    member.put("parkIds", List.of(parkId == null ? park : parkId));
                }
                changed = true;
            }
            if (changed) {
                String id = String.valueOf(member.remove("_recordId"));
                save("members", id, member);
            }
        }
    }

    private void ensureSyntheticProjectPhones() {
        List<Map<String, Object>> clues = jdbc.query("SELECT id,payload FROM records WHERE collection='clues'", (rs, index) -> {
            Map<String, Object> row = parse(rs.getString(2));
            row.put("_recordId", rs.getString(1));
            return row;
        });
        for (Map<String, Object> clue : clues) {
            Object value = clue.get("phone");
            if (!(value instanceof String phone) || !phone.matches("1\\d{2}\\*{4}\\d{4}")) continue;
            clue.put("phone", phone.substring(0, 3) + "0000" + phone.substring(7));
            String id = String.valueOf(clue.remove("_recordId"));
            save("clues", id, clue);
        }
    }

    private void ensureDemoOutboundScript() {
        String seedVersion = "aiScripts-demo-shanghai-v1";
        if (jdbc.queryForObject("SELECT COUNT(*) FROM seed_state WHERE collection=?", Integer.class, seedVersion) > 0) return;
        if (jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='aiScripts' AND id='上海市'", Integer.class) == 0) {
            Map<String, Object> script = new LinkedHashMap<>();
            script.put("id", "上海市");
            script.put("city", "上海市");
            script.put("opening", "您好，这里是上海市产业招商服务中心，想了解贵司下一步布局需求。");
            script.put("qa", "我们可以为您匹配上海市的产业政策、园区载体和产业链合作资源。");
            script.put("ending", "感谢您的时间，后续将由属地招商专员与您联系。");
            save("aiScripts", "上海市", script);
        }
        jdbc.update("INSERT IGNORE INTO seed_state(collection) VALUES(?)", seedVersion);
    }

    private void ensureAccountSecurityColumn() {
        Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() " +
            "AND table_name='member_account' AND column_name='must_change_password'", Integer.class);
        if (existing == 0) jdbc.execute("ALTER TABLE member_account ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE");
    }

    private void ensureGovernmentRoles() {
        Set<String> routes = WorkspaceAccess.routeGroups().keySet();
        List<Map<String, Object>> templates = new ArrayList<>();
        Set<String> systemRoutes = routes.stream()
            .filter(route -> !route.equals("/member/log") && !route.equals("/member/logStatistics"))
            .collect(java.util.stream.Collectors.toSet());
        templates.add(roleTemplate("builtin-system-admin", "系统管理员", "管账号与菜单，不代替安全保密审批或日志审计", systemRoutes,
            Set.of("/member/index", "/member/departments", "/member/role", "/setting/index"), Set.of("create", "edit", "delete", "export")));
        templates.add(roleTemplate("builtin-security-officer", "安全保密员", "维护数据范围、敏感信息策略与授权审批",
            Set.of("/member/index", "/business/projectCluesUpdate/index"),
            Set.of("/member/index", "/business/projectCluesUpdate/index"), Set.of("edit", "view_sensitive")));
        templates.add(roleTemplate("builtin-audit-officer", "安全审计员", "只读查看全量审计日志和统计，允许导出审计台账", Set.of("/member/log", "/member/logStatistics"), Set.of("/member/log"), Set.of("export")));
        templates.add(roleTemplate("builtin-park-specialist", "园区招商专员", "负责园区范围内的招商项目与企业服务", routes.stream()
            .filter(route -> !route.startsWith("/member/") && !route.equals("/setting/index") && !route.equals("/system/interface-monitoring")).collect(java.util.stream.Collectors.toSet()),
            Set.of("/business/businessInvestigate/index", "/business/businessHall/index", "/business/projectClues/index", "/business/projectCluesUpdate/index", "/myCampus/guarantee/index", "/myCampus/visitManage/index"), Set.of("create", "edit", "export")));
        templates.add(roleTemplate("builtin-leader-readonly", "只读领导视角", "查看全域招商和安商稳商运行情况", routes, Set.of(), Set.of()));
        for (Map<String, Object> role : templates) {
            if (jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='roles' AND id=?", Integer.class, role.get("id")) == 0) {
                save("roles", String.valueOf(role.get("id")), role);
            } else if (Boolean.TRUE.equals(role.get("immutable"))) {
                save("roles", String.valueOf(role.get("id")), role);
            }
        }
    }

    private void migrateLegacyRoles() {
        Map<String, String> replacements = Map.of(
            "ROLE1", "builtin-system-admin", "ROLE2", "builtin-park-specialist", "ROLE3", "builtin-park-specialist",
            "ROLE4", "builtin-park-specialist", "ROLE5", "builtin-leader-readonly", "ROLE6", "builtin-leader-readonly"
        );
        Map<String, String> roleNames = Map.of(
            "超级管理员", "系统管理员", "招商主管", "园区招商专员", "招商专员", "园区招商专员",
            "园区管理员", "园区招商专员", "数据分析师", "只读领导视角", "只读成员", "只读领导视角"
        );
        List<Map<String, Object>> legacyRoles = jdbc.query("SELECT payload FROM records WHERE collection='roles' AND id IN ('ROLE1','ROLE2','ROLE3','ROLE4','ROLE5','ROLE6')",
            (rs, index) -> parse(rs.getString(1)));
        if (legacyRoles.isEmpty()) return;
        List<Map<String, Object>> members = jdbc.query("SELECT id,payload FROM records WHERE collection='members'",
            (rs, index) -> {
                Map<String, Object> row = parse(rs.getString(2));
                row.put("_recordId", rs.getString(1));
                return row;
            });
        Map<String, String> departmentIds = new HashMap<>();
        jdbc.query("SELECT id,payload FROM records WHERE collection='departments'", (rs, index) -> {
            Map<String, Object> department = parse(rs.getString(2));
            departmentIds.put(String.valueOf(department.getOrDefault("name", "")), rs.getString(1));
            return null;
        });
        Map<String, String> parkIds = new HashMap<>();
        jdbc.query("SELECT id,payload FROM records WHERE collection='parksBuildings'", (rs, index) -> {
            Map<String, Object> park = parse(rs.getString(2));
            parkIds.put(String.valueOf(park.getOrDefault("name", "")), String.valueOf(park.getOrDefault("parkId", rs.getString(1))));
            return null;
        });
        for (Map<String, Object> member : members) {
            String oldRoleId = String.valueOf(member.getOrDefault("roleId", ""));
            String oldRoleName = String.valueOf(member.getOrDefault("role", ""));
            String nextRoleId = replacements.get(oldRoleId);
            if (nextRoleId == null) {
                nextRoleId = replacements.entrySet().stream().filter(entry -> Objects.equals(
                    legacyRoles.stream().filter(role -> Objects.equals(String.valueOf(role.get("id")), entry.getKey())).map(role -> String.valueOf(role.get("name"))).findFirst().orElse(""), oldRoleName))
                    .map(Map.Entry::getValue).findFirst().orElse(null);
            }
            String nextRoleName = roleNames.get(oldRoleName);
            boolean changed = false;
            if (nextRoleId != null && nextRoleName != null) {
                member.put("roleId", nextRoleId);
                member.put("role", nextRoleName);
                changed = true;
            }
            if (!member.containsKey("departmentId")) {
                String departmentId = departmentIds.get(String.valueOf(member.getOrDefault("dept", "")));
                if (departmentId != null) {
                    member.put("departmentId", departmentId);
                    changed = true;
                }
            }
            if (!member.containsKey("dataScope")) {
                boolean allParks = Set.of("ROLE1", "ROLE5", "ROLE6").contains(oldRoleId);
                member.put("dataScope", allParks ? "ALL_PARKS" : "ASSIGNED_PARKS");
                if (allParks) {
                    member.put("parkIds", List.of());
                    member.put("park", "全部园区");
                } else {
                    String park = String.valueOf(member.getOrDefault("park", ""));
                    String parkId = parkIds.get(park);
                    member.put("parkIds", parkId == null ? List.of() : List.of(parkId));
                }
                changed = true;
            }
            if (changed) {
                String id = String.valueOf(member.remove("_recordId"));
                save("members", id, member);
            }
        }
        jdbc.update("DELETE FROM records WHERE collection='roles' AND id IN ('ROLE1','ROLE2','ROLE3','ROLE4','ROLE5','ROLE6')");
    }

    private Map<String, Object> roleTemplate(String id, String name, String description, Set<String> visibleRoutes,
                                             Set<String> actionRoutes, Set<String> actionNames) {
        List<String> permissions = new ArrayList<>();
        visibleRoutes.forEach(route -> permissions.add("route:" + route));
        actionRoutes.forEach(route -> actionNames.forEach(action -> permissions.add("action:" + route + ":" + action)));
        boolean criticalRole = Set.of("builtin-system-admin", "builtin-security-officer", "builtin-audit-officer").contains(id);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("code", id);
        row.put("desc", description);
        row.put("status", "启用");
        row.put("members", 0);
        row.put("immutable", criticalRole);
        row.put("exclusiveGroup", criticalRole ? "THREE_PERSONNEL" : "");
        row.put("perms", List.of());
        row.put("permissions", permissions);
        return row;
    }
    private void check(String name) {
        if (!COLLECTIONS.contains(name)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "未知数据集");
    }
    Map<String, Object> parse(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (IOException ex) { throw new IllegalStateException(ex); }
    }
    private String encode(Map<String, Object> row) {
        try { return mapper.writeValueAsString(row); }
        catch (IOException ex) { throw new IllegalArgumentException(ex); }
    }
    private void save(String collection, String id, Map<String, Object> row) {
        jdbc.update("INSERT INTO records(collection,id,payload) VALUES(?,?,?) " +
                "ON DUPLICATE KEY UPDATE payload=VALUES(payload)", collection, id, encode(row));
    }
    private WorkspaceAccess.Principal authorize(HttpSession session, String collection, String action) {
        check(collection);
        var principal = access.current(session);
        RecordPermissions.check(principal, collection, action);
        return principal;
    }

    private Map<String, Object> visible(String collection, Map<String, Object> source) {
        Map<String, Object> row = new LinkedHashMap<>(source);
        if (row.get("phone") instanceof String phone && phone.matches("1\\d{10}"))
            row.put("phone", phone.substring(0, 3) + "****" + phone.substring(7));
        return row;
    }

    /**
     * 公共集合：内容本身与园区无关（政策、产业节点、招投标、账号与组织结构等），
     * 全园区共享，不参与数据范围隔离。
     */
    private static final Set<String> PUBLIC_COLLECTIONS = Set.of(
        "members", "roles", "departments", "tenantSettings", "aiScripts",
        "policies", "industryNodes", "supplyRelations", "biddingRecords"
    );

    /**
     * 线索集合：公海线索允许全园区查看（项目需跨园区流转与认领），
     * 但已归属到具体园区的线索仍按园区授权隔离。
     */
    private static final Set<String> OPEN_POOL_COLLECTIONS = Set.of("clues");

    private boolean inScope(WorkspaceAccess.Principal principal, Map<String, Object> row) {
        return inScope(principal, null, row);
    }

    private boolean inScope(WorkspaceAccess.Principal principal, String collection, Map<String, Object> row) {
        if (principal.administrator() || "ALL_PARKS".equals(principal.dataScope())) return true;
        String parkId = String.valueOf(row.getOrDefault("parkId", ""));
        String parkName = String.valueOf(row.getOrDefault("park", ""));
        if ("SELF_ONLY".equals(principal.dataScope())) {
            String ownerId = String.valueOf(row.getOrDefault("ownerId", row.getOrDefault("owner", row.getOrDefault("createdBy", ""))));
            return ownerId.equals(principal.user()) || ownerId.equals(principal.memberId());
        }
        if (principal.parkIds().isEmpty()) return false;
        if (!parkId.isBlank() || !parkName.isBlank())
            return principal.parkIds().contains(parkId) || principal.parkIds().contains(parkName);
        if (collection != null && PUBLIC_COLLECTIONS.contains(collection)) return true;
        // 无园区归属时，先尝试按关联企业反查园区；查不到再按集合语义判定。
        String derivedPark = resolveParkByCompany(row);
        if (!derivedPark.isBlank()) return principal.parkIds().contains(derivedPark);
        if (collection != null && OPEN_POOL_COLLECTIONS.contains(collection)) return true;
        // 私有业务数据无法判定园区归属时不予放行，避免跨园区可见。
        return false;
    }

    /**
     * 走访记录等以企业名关联业务的数据，可通过企业档案反查其所属园区。
     */
    private String resolveParkByCompany(Map<String, Object> row) {
        String company = String.valueOf(row.getOrDefault("company", "")).trim();
        if (company.isBlank()) return "";
        List<String> parks = jdbc.query(
            "SELECT payload FROM records WHERE collection='companyArchives'",
            (rs, index) -> {
                Map<String, Object> archive = parse(rs.getString(1));
                String name = String.valueOf(archive.getOrDefault("name", "")).trim();
                if (!name.equals(company)) return "";
                String park = String.valueOf(archive.getOrDefault("park", "")).trim();
                String parkId = String.valueOf(archive.getOrDefault("parkId", "")).trim();
                return parkId.isBlank() ? park : parkId;
            }
        );
        return parks.stream().filter(park -> !park.isBlank()).findFirst().orElse("");
    }

    private void requireScope(WorkspaceAccess.Principal principal, Map<String, Object> row) {
        if (!inScope(principal, row)) throw WorkspaceAccess.denied("超出当前账号的数据范围");
    }

    private void requireScope(WorkspaceAccess.Principal principal, String collection, Map<String, Object> row) {
        if (!inScope(principal, collection, row)) throw WorkspaceAccess.denied("超出当前账号的数据范围");
    }

    private void checkIdentityScope(WorkspaceAccess.Principal principal, String collection, Map<String, Object> row) {
        if (collection.equals("members")) validateMemberFields(row);
        if (collection.equals("roles") && hasAuditPermission(row)
            && !"builtin-audit-officer".equals(String.valueOf(row.get("id"))))
            throw WorkspaceAccess.denied("审计查看与导出权限仅能授予不可变的安全审计员角色");
        if (collection.equals("roles") && hasSensitivePermission(row)
            && !"builtin-security-officer".equals(String.valueOf(row.get("id"))))
            throw WorkspaceAccess.denied("敏感明文查阅权限由安全保密员角色统一管理");
        boolean systemAdministrator = principal.administrator() || principal.role().equals("系统管理员");
        if (systemAdministrator && collection.equals("members")
            && (String.valueOf(row.get("id")).equals(principal.memberId())
                || String.valueOf(row.getOrDefault("username", "")).equals(principal.user()))
            && memberRoleHasSensitivePermission(row))
            throw WorkspaceAccess.denied("系统管理员不能为本人授予敏感明文查看权限");
        if (principal.administrator() || principal.role().equals("系统管理员")) return;
        if (collection.equals("members") && principal.role().equals("安全保密员")) return;
        if (collection.equals("roles") && !principal.permissions().containsAll(access.permissions(row)))
            throw WorkspaceAccess.denied("只能维护自身权限范围内的角色");
        if (collection.equals("members")) {
            String roleId = String.valueOf(row.getOrDefault("roleId", ""));
            var roles = jdbc.query("SELECT payload FROM records WHERE collection='roles'", (rs, n) -> parse(rs.getString(1)));
            var role = roles.stream().filter(item -> roleId.isBlank()
                ? Objects.equals(item.get("name"), row.get("role")) : roleId.equals(String.valueOf(item.get("id")))).findFirst();
            if (role.isEmpty() || "停用".equals(role.get().get("status")) || !principal.permissions().containsAll(access.permissions(role.get())))
                throw WorkspaceAccess.denied("只能维护自身权限范围内的成员");
        }
    }

    private boolean hasSensitivePermission(Map<String, Object> row) {
        return row.get("permissions") instanceof List<?> permissions
            && permissions.stream().filter(String.class::isInstance).map(String.class::cast)
                .anyMatch(permission -> permission.endsWith(":view_sensitive"));
    }

    private boolean hasAuditPermission(Map<String, Object> row) {
        if (!(row.get("permissions") instanceof List<?> permissions)) return false;
        return permissions.stream().filter(String.class::isInstance).map(String.class::cast)
            .anyMatch(permission -> permission.equals("route:/member/log")
                || permission.equals("route:/member/logStatistics")
                || permission.equals("action:/member/log:export"));
    }

    private boolean memberRoleHasSensitivePermission(Map<String, Object> row) {
        String roleId = String.valueOf(row.getOrDefault("roleId", ""));
        String roleName = String.valueOf(row.getOrDefault("role", ""));
        return jdbc.query("SELECT payload FROM records WHERE collection='roles'", (rs, n) -> parse(rs.getString(1)))
            .stream()
            .filter(role -> (!roleId.isBlank() && roleId.equals(String.valueOf(role.get("id"))))
                || (roleId.isBlank() && roleName.equals(String.valueOf(role.get("name")))))
            .findFirst()
            .map(this::hasSensitivePermission)
            .orElse(false);
    }

    private void validateMemberFields(Map<String, Object> row) {
        String scope = String.valueOf(row.getOrDefault("dataScope", "ASSIGNED_PARKS"));
        if (!Set.of("ALL_PARKS", "ASSIGNED_PARKS", "SELF_ONLY").contains(scope))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的数据范围");
        String departmentId = String.valueOf(row.getOrDefault("departmentId", ""));
        if (!departmentId.isBlank() && jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='departments' AND id=? AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.status'))<>'停用'", Integer.class, departmentId) == 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请选择有效的所属部门");
        Object assignedParks = row.get("parkIds");
        if (assignedParks instanceof List<?> parks) {
            for (Object park : parks) {
                String parkId = String.valueOf(park);
                if (jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='parksBuildings' " +
                    "AND (id=? OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.parkId'))=? OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.park'))=? OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.name'))=?)",
                    Integer.class, parkId, parkId, parkId, parkId) == 0)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "授权园区不存在：" + parkId);
            }
        }
    }

    private void validateDepartment(Map<String, Object> row, String id) {
        String parentId = String.valueOf(row.getOrDefault("parentId", ""));
        if (parentId.isBlank()) return;
        if (parentId.equals(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "部门不能设置为自身的上级组织");
        Map<String, Object> parent = jdbc.query("SELECT payload FROM records WHERE collection='departments' AND id=?",
            (rs, index) -> parse(rs.getString(1)), parentId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "所选上级组织不存在"));
        Set<String> ancestors = new HashSet<>();
        while (parent != null) {
            String ancestorId = String.valueOf(parent.get("id"));
            if (!ancestors.add(ancestorId) || ancestorId.equals(id))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "组织树不能形成循环隶属关系");
            String nextParentId = String.valueOf(parent.getOrDefault("parentId", ""));
            if (nextParentId.isBlank()) break;
            parent = jdbc.query("SELECT payload FROM records WHERE collection='departments' AND id=?",
                (rs, index) -> parse(rs.getString(1)), nextParentId).stream().findFirst().orElse(null);
        }
    }

    private void saveMemberAccount(String id, Map<String, Object> row) {
        Object supplied = row.remove("initialPassword");
        String password = supplied == null ? "" : String.valueOf(supplied);
        String username = String.valueOf(row.getOrDefault("username", "")).trim();
        if (username.isEmpty()) {
            if (!password.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请填写登录账号");
            jdbc.update("DELETE FROM member_account WHERE member_id=?", id);
            return;
        }
        if (!username.matches("[\\p{L}\\p{N}_.@-]{3,100}") || username.equals("本地演示管理员")
            || jdbc.queryForObject("SELECT COUNT(*) FROM local_account WHERE username=?", Integer.class, username) > 0
            || jdbc.queryForObject("SELECT COUNT(*) FROM member_account WHERE username=? AND member_id<>?", Integer.class, username, id) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "登录账号无效或已被使用");
        if (password.isEmpty()) {
            if (jdbc.update("UPDATE member_account SET username=? WHERE member_id=?", username, id) == 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请为新账号设置初始密码");
        } else {
            if (!access.validPassword(password))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码不符合系统复杂度策略");
            byte[] salt = new byte[16];
            new SecureRandom().nextBytes(salt);
            jdbc.update("INSERT INTO member_account(member_id,username,password_hash,must_change_password) VALUES(?,?,?,TRUE) " +
                    "ON DUPLICATE KEY UPDATE username=VALUES(username), password_hash=VALUES(password_hash), must_change_password=TRUE",
                id, username, AuthController.hash(password, salt));
            access.revokeUserSessions(username);
        }
        row.put("username", username);
            row.put("mustChangePassword", true);
    }

    @Operation(summary = "检查 API 服务")
    @GetMapping("/health") public Map<String, String> health() { return Map.of("status", "ok"); }
    @Operation(summary = "列出一个业务数据集的记录")
    @GetMapping("/records/{collection}") public List<Map<String, Object>> list(@PathVariable String collection, HttpSession session) {
        var principal = authorize(session, collection, null);
        return jdbc.query("SELECT payload FROM records WHERE collection=? ORDER BY id", (rs, n) -> parse(rs.getString(1)), collection)
            .stream().filter(row -> Set.of("members", "roles", "departments").contains(collection) || inScope(principal, collection, row))
            .map(row -> visible(collection, row)).toList();
    }
    @Operation(summary = "新增业务记录")
    @PostMapping("/records/{collection}") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public Map<String, Object> create(@PathVariable String collection, @RequestBody Map<String, Object> row, HttpSession session, HttpServletRequest request) {
        var principal = authorize(session, collection, "新增");
        if (Set.of("aiScripts", "tenantSettings").contains(collection))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请通过配置接口保存");
        String id = UUID.randomUUID().toString();
        row.put("id", id);
        ensureParkMetadata(collection, id, row);
        if ("SELF_ONLY".equals(principal.dataScope())) {
            row.putIfAbsent("ownerId", principal.memberId().isBlank() ? principal.user() : principal.memberId());
            row.putIfAbsent("owner", principal.displayName());
            row.putIfAbsent("createdBy", principal.user());
        }
        if (collection.equals("departments")) validateDepartment(row, id);
        if (collection.equals("members") && principal.memberId().isBlank()
            && String.valueOf(row.getOrDefault("username", "")).equals(principal.user()) && memberRoleHasSensitivePermission(row))
            throw WorkspaceAccess.denied("系统管理员不能为本人授予敏感明文查看权限");
        checkIdentityScope(principal, collection, row);
        if (!principal.administrator() && !Set.of("members", "roles", "tenantSettings", "aiScripts", "departments").contains(collection)) requireScope(principal, collection, row);
        if (collection.equals("members")) saveMemberAccount(id, row);
        save(collection, id, row);
        audit.record(principal, collection, "新增", collection, id, null, row, "成功", request, 0);
        return visible(collection, row);
    }
    @Operation(summary = "更新业务记录")
    @PutMapping("/records/{collection}/{id}") @Transactional
    public Map<String, Object> update(@PathVariable String collection, @PathVariable String id,
                                      @RequestBody Map<String, Object> patch, HttpSession session, HttpServletRequest request) {
        var principal = authorize(session, collection, "编辑");
        Map<String, Object> row = jdbc.query("SELECT payload FROM records WHERE collection=? AND id=? FOR UPDATE",
            (rs, n) -> parse(rs.getString(1)), collection, id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
        if (!Set.of("members", "roles", "departments").contains(collection)) requireScope(principal, collection, row);
        Map<String, Object> before = new LinkedHashMap<>(row);
        if (collection.equals("investigationTasks")) {
            patch.remove("history");
            if (patch.containsKey("status") && !Objects.equals(row.get("status"), patch.get("status"))) {
                if (patch.get("status") == null || !Set.of("待跟进", "摸排中", "已确认", "已完成").contains(patch.get("status")))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的摸排状态");
                List<Object> history = new ArrayList<>(row.get("history") instanceof List<?> list ? list : List.of());
                history.add(Map.of("from", String.valueOf(row.get("status")), "to", patch.get("status"),
                    "operator", principal.user(), "time", Instant.now().toString()));
                patch.put("history", history);
                patch.put("updated", java.time.LocalDate.now(java.time.ZoneId.of("Asia/Shanghai")).toString());
            }
        }
        if (collection.equals("roles") && Boolean.TRUE.equals(row.get("immutable")))
            throw WorkspaceAccess.denied("等保内置角色不可修改");
        if (collection.equals("members") && principal.role().equals("安全保密员")
            && !Set.of("dataScope", "parkIds", "park", "sensitiveInfoPolicy").containsAll(patch.keySet()))
            throw WorkspaceAccess.denied("安全保密员仅可维护数据范围与敏感信息策略，账号和角色由系统管理员维护");
        row.putAll(patch);
        row.put("id", id);
        if (collection.equals("members") && principal.memberId().isBlank()
            && String.valueOf(row.getOrDefault("username", "")).equals(principal.user()) && memberRoleHasSensitivePermission(row))
            throw WorkspaceAccess.denied("系统管理员不能为本人授予敏感明文查看权限");
        ensureParkMetadata(collection, id, row);
        checkIdentityScope(principal, collection, row);
        if (collection.equals("departments")) validateDepartment(row, id);
        if (!Set.of("members", "roles", "departments").contains(collection)) requireScope(principal, collection, row);
        if (collection.equals("members")) saveMemberAccount(id, row);
        save(collection, id, row);
        audit.record(principal, collection, "编辑", collection, id, before, row, "成功", request, 0);
        return visible(collection, row);
    }
    @PutMapping("/records/{collection}/config/{key}") @Transactional
    public synchronized Map<String, Object> saveConfig(@PathVariable String collection, @PathVariable String key,
                                                        @RequestBody Map<String, Object> row, HttpSession session, HttpServletRequest request) {
        if (!Set.of("tenantSettings", "aiScripts").contains(collection) || key.isBlank() || key.length() > 80
            || collection.equals("tenantSettings") && !key.equals("workspace"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的配置标识");
        boolean exists = jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection=? AND id=?", Integer.class, collection, key) > 0;
        var principal = authorize(session, collection, collection.equals("tenantSettings") || exists ? "编辑" : "新增");
        Map<String, Object> before = exists ? jdbc.query("SELECT payload FROM records WHERE collection=? AND id=?", (rs, n) -> parse(rs.getString(1)), collection, key).getFirst() : null;
        if (collection.equals("aiScripts")) {
            for (String field : List.of("opening", "qa", "ending"))
                if (!(row.get(field) instanceof String value) || value.isBlank() || value.length() > 4000)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请补齐三个话术环节");
            row.put("city", key);
        }
        row.put("id", key);
        save(collection, key, row);
        audit.record(principal, collection, "保存配置", collection, key, before, row, "成功", request, 0);
        return row;
    }

    @Operation(summary = "删除业务记录")
    @DeleteMapping("/records/{collection}/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void delete(@PathVariable String collection, @PathVariable String id, HttpSession session, HttpServletRequest request) {
        var principal = authorize(session, collection, "删除");
        Map<String, Object> before = jdbc.query("SELECT payload FROM records WHERE collection=? AND id=? FOR UPDATE", (rs, n) -> parse(rs.getString(1)), collection, id)
            .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
        if (!Set.of("members", "roles", "departments").contains(collection)) requireScope(principal, collection, before);
        if (collection.equals("roles") && Boolean.TRUE.equals(before.get("immutable")))
            throw WorkspaceAccess.denied("等保内置角色不可删除或修改");
        if (collection.equals("roles") && jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='members' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.roleId'))=?", Integer.class, id) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "仍有成员绑定此角色，无法删除");
        if (collection.equals("departments") && jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='departments' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.parentId'))=?", Integer.class, id) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "仍有下级组织节点，无法删除");
        if (collection.equals("departments") && jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='members' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.departmentId'))=?", Integer.class, id) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "仍有成员归属此部门，无法删除");
        if (Set.of("members", "roles").contains(collection)) checkIdentityScope(principal, collection, before);
        if (collection.equals("members")) {
            String username = String.valueOf(before.getOrDefault("username", ""));
            access.revokeUserSessions(username);
        }
        if (collection.equals("members")) jdbc.update("DELETE FROM member_account WHERE member_id=?", id);
        if (jdbc.update("DELETE FROM records WHERE collection=? AND id=?", collection, id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在");
        audit.record(principal, collection, "删除", collection, id, before, null, "成功", request, 0);
    }
    @Operation(summary = "完成走访工单并生成走访记录")
    @PostMapping("/visits/{id}/complete") @Transactional
    public Map<String, Object> complete(@PathVariable String id, @RequestBody Map<String, Object> input, HttpSession session, HttpServletRequest request) {
        var principal = access.current(session);
        if (!principal.allows("/myCampus/visitManage/index", "安商稳商", "编辑"))
            throw WorkspaceAccess.denied("没有完成走访权限");
        List<String> found = jdbc.query("SELECT payload FROM records WHERE collection='visitOrders' AND id=? FOR UPDATE", (rs, n) -> rs.getString(1), id);
        if (found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "工单不存在");
        Map<String, Object> order = parse(found.get(0));
        requireScope(principal, "visitOrders", order);
        if ("已完成".equals(order.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "工单已完成");
        String result = String.valueOf(input.getOrDefault("result", "")).trim();
        if (result.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请填写走访结果");
        order.put("status", "已完成");
        save("visitOrders", id, order);
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", UUID.randomUUID().toString()); record.put("orderId", id);
        record.put("title", order.getOrDefault("title", "")); record.put("company", order.getOrDefault("company", ""));
        record.put("owner", order.getOrDefault("owner", "")); record.put("date", java.time.LocalDate.now().toString());
        record.put("ownerId", order.getOrDefault("ownerId", principal.memberId().isBlank() ? principal.user() : principal.memberId()));
        record.put("createdBy", principal.user()); record.put("departmentId", order.getOrDefault("departmentId", principal.departmentId()));
        record.put("park", order.getOrDefault("park", "")); record.put("parkId", order.getOrDefault("parkId", ""));
        record.put("result", result); record.put("duration", input.getOrDefault("duration", ""));
        save("visitRecords", String.valueOf(record.get("id")), record);
        audit.record(principal, "走访管理", "走访完成并归档", "走访工单", id, Map.of("status", "走访中"), Map.of("status", "已完成", "result", result), "成功", request, 0);
        String serviceRequestId = String.valueOf(order.getOrDefault("serviceRequestId", ""));
        if (!serviceRequestId.isBlank()) {
            Map<String, Object> serviceRequest = jdbc.query("SELECT payload FROM records WHERE collection='serviceRequests' AND id=? FOR UPDATE",
                (rs, n) -> parse(rs.getString(1)), serviceRequestId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "关联企业诉求不存在"));
            requireScope(principal, "serviceRequests", serviceRequest);
            Map<String, Object> before = new LinkedHashMap<>(serviceRequest);
            serviceRequest.put("status", "已办结");
            serviceRequest.put("resolution", result);
            serviceRequest.put("closedAt", java.time.Instant.now().toString());
            serviceRequest.put("visitRecordId", record.get("id"));
            save("serviceRequests", serviceRequestId, serviceRequest);
            audit.record(principal, "企服保障", "走访反馈并办结诉求", "企业诉求", serviceRequestId, before, serviceRequest, "成功", request, 0);
        }
        return Map.of("order", order, "record", record);
    }

    @PostMapping("/members/import")
    @Transactional
    public Map<String, Object> importMembers(@RequestBody List<Map<String, Object>> input, HttpSession session,
                                            HttpServletRequest request) {
        var principal = authorize(session, "members", "新增");
        if (input.isEmpty() || input.size() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "单次导入须包含 1 到 500 位成员");
        List<Map<String, Object>> prepared = new ArrayList<>();
        Set<String> userNames = new HashSet<>();
        for (Map<String, Object> source : input) {
            Map<String, Object> row = new LinkedHashMap<>(source);
            String name = String.valueOf(row.getOrDefault("name", "")).trim();
            if (name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "导入成员缺少姓名，整批未写入");
            String username = String.valueOf(row.getOrDefault("username", "")).trim();
            if (!username.isBlank() && !userNames.add(username))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "导入文件中存在重复登录账号，整批未写入");
            row.put("name", name);
            row.putIfAbsent("status", "启用");
            checkIdentityScope(principal, "members", row);
            prepared.add(row);
        }
        for (Map<String, Object> row : prepared) {
            String id = UUID.randomUUID().toString();
            row.put("id", id);
            saveMemberAccount(id, row);
            save("members", id, row);
        }
        audit.record(principal, "人员管理", "批量导入成员", "成员", String.valueOf(prepared.size()), null,
            Map.of("count", prepared.size()), "成功", request, 0);
        return Map.of("count", prepared.size());
    }
}
