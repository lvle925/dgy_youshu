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
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
@Tag(name = "业务数据", description = "本地演示数据集的查询与维护")
public class RecordsController {
    private static final Set<String> COLLECTIONS = Set.of("members", "campusList", "visitOrders", "visitRecords", "roles", "policies", "clues", "parksBuildings", "investigationTasks", "matchCompanies",
        "opportunityModels", "tenantSettings", "aiScripts", "aiTasks", "aiRecords");
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final WorkspaceAccess access;
    private static final List<String> LOCKED_FIELDS = List.of("contact", "phone", "note", "competitors", "analysis", "conversation", "followUps");

    public RecordsController(JdbcTemplate jdbc, ObjectMapper mapper, WorkspaceAccess access) throws IOException {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.access = access;
        Map<String, List<Map<String, Object>>> seeds = mapper.readValue(new ClassPathResource("seed.json").getInputStream(), new TypeReference<>() {});
        for (String collection : COLLECTIONS) {
            if (jdbc.queryForObject("SELECT COUNT(*) FROM seed_state WHERE collection=?", Integer.class, collection) == 0) {
                for (Map<String, Object> row : seeds.getOrDefault(collection, List.of())) save(collection, String.valueOf(row.get("id")), row);
                jdbc.update("INSERT INTO seed_state(collection) VALUES(?)", collection);
            }
        }
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
        jdbc.update("MERGE INTO records(collection,id,payload) KEY(collection,id) VALUES(?,?,?)", collection, id, encode(row));
    }
    private WorkspaceAccess.Principal authorize(HttpSession session, String collection, String action) {
        check(collection);
        var principal = access.current(session);
        RecordPermissions.check(principal, collection, action);
        return principal;
    }

    private Map<String, Object> visible(String collection, boolean unlocked, Map<String, Object> row) {
        if (collection.equals("clues") && !unlocked) {
            LOCKED_FIELDS.forEach(row::remove);
            if (row.get("company") instanceof String name && name.length() > 1)
                row.put("company", name.charAt(0) + "•••" + name.charAt(name.length() - 1));
        }
        return row;
    }

    private void checkIdentityScope(WorkspaceAccess.Principal principal, String collection, Map<String, Object> row) {
        if (principal.administrator()) return;
        if (collection.equals("roles") && !principal.permissions().containsAll(access.permissions(row)))
            throw WorkspaceAccess.denied("只能维护自身权限范围内的角色");
        if (collection.equals("members")) {
            String roleId = String.valueOf(row.getOrDefault("roleId", ""));
            var roles = jdbc.query("SELECT payload FROM records WHERE collection='roles'", (rs, n) -> parse(rs.getString(1)));
            var role = roles.stream().filter(item -> roleId.isBlank()
                ? Objects.equals(item.get("name"), row.get("role")) : roleId.equals(String.valueOf(item.get("id")))).findFirst();
            if (role.isEmpty() || !principal.permissions().containsAll(access.permissions(role.get())))
                throw WorkspaceAccess.denied("只能维护自身权限范围内的成员");
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
            if (password.length() < 10 || password.length() > 128)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码须为 10 到 128 个字符");
            byte[] salt = new byte[16];
            new SecureRandom().nextBytes(salt);
            jdbc.update("MERGE INTO member_account(member_id,username,password_hash) KEY(member_id) VALUES(?,?,?)",
                id, username, AuthController.hash(password, salt));
        }
        row.put("username", username);
    }

    @Operation(summary = "检查 API 服务")
    @GetMapping("/health") public Map<String, String> health() { return Map.of("status", "ok"); }
    @Operation(summary = "列出一个业务数据集的记录")
    @GetMapping("/records/{collection}") public List<Map<String, Object>> list(@PathVariable String collection, HttpSession session) {
        var principal = authorize(session, collection, null);
        Set<String> unlocked = collection.equals("clues") ? new HashSet<>(jdbc.queryForList(
            "SELECT project_id FROM project_unlock WHERE username=?", String.class, principal.subject())) : Set.of();
        return jdbc.query("SELECT payload FROM records WHERE collection=? ORDER BY id", (rs, n) -> {
            var row = parse(rs.getString(1));
            return visible(collection, unlocked.contains(String.valueOf(row.get("id"))), row);
        }, collection);
    }
    @Operation(summary = "新增业务记录")
    @PostMapping("/records/{collection}") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public Map<String, Object> create(@PathVariable String collection, @RequestBody Map<String, Object> row, HttpSession session) {
        var principal = authorize(session, collection, "新增");
        if (Set.of("aiScripts", "tenantSettings").contains(collection))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请通过配置接口保存");
        String id = UUID.randomUUID().toString();
        row.put("id", id);
        checkIdentityScope(principal, collection, row);
        if (collection.equals("members")) saveMemberAccount(id, row);
        save(collection, id, row);
        return visible(collection, false, row);
    }
    @Operation(summary = "更新业务记录")
    @PutMapping("/records/{collection}/{id}") @Transactional
    public Map<String, Object> update(@PathVariable String collection, @PathVariable String id,
                                      @RequestBody Map<String, Object> patch, HttpSession session) {
        var principal = authorize(session, collection, "编辑");
        Map<String, Object> row = jdbc.query("SELECT payload FROM records WHERE collection=? AND id=? FOR UPDATE",
            (rs, n) -> parse(rs.getString(1)), collection, id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
        if (collection.equals("clues") && !WorkspaceController.isUnlocked(jdbc, principal.subject(), id))
            throw WorkspaceAccess.denied("请先解锁项目");
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
        checkIdentityScope(principal, collection, row);
        row.putAll(patch);
        row.put("id", id);
        if (collection.equals("members")) saveMemberAccount(id, row);
        save(collection, id, row);
        return row;
    }
    @PutMapping("/records/{collection}/config/{key}") @Transactional
    public synchronized Map<String, Object> saveConfig(@PathVariable String collection, @PathVariable String key,
                                                        @RequestBody Map<String, Object> row, HttpSession session) {
        if (!Set.of("tenantSettings", "aiScripts").contains(collection) || key.isBlank() || key.length() > 80
            || collection.equals("tenantSettings") && !key.equals("workspace"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "无效的配置标识");
        boolean exists = jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection=? AND id=?", Integer.class, collection, key) > 0;
        authorize(session, collection, collection.equals("tenantSettings") || exists ? "编辑" : "新增");
        if (collection.equals("aiScripts")) {
            for (String field : List.of("opening", "qa", "ending"))
                if (!(row.get(field) instanceof String value) || value.isBlank() || value.length() > 4000)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请补齐三个话术环节");
            row.put("city", key);
        }
        row.put("id", key);
        save(collection, key, row);
        return row;
    }

    @Operation(summary = "删除业务记录")
    @DeleteMapping("/records/{collection}/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void delete(@PathVariable String collection, @PathVariable String id, HttpSession session) {
        var principal = authorize(session, collection, "删除");
        if (Set.of("members", "roles").contains(collection)) {
            jdbc.query("SELECT payload FROM records WHERE collection=? AND id=? FOR UPDATE", (rs, n) -> parse(rs.getString(1)), collection, id)
                .stream().findFirst().ifPresent(row -> checkIdentityScope(principal, collection, row));
        }
        if (collection.equals("members")) jdbc.update("DELETE FROM member_account WHERE member_id=?", id);
        if (jdbc.update("DELETE FROM records WHERE collection=? AND id=?", collection, id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在");
    }
    @Operation(summary = "完成走访工单并生成走访记录")
    @PostMapping("/visits/{id}/complete") @Transactional
    public Map<String, Object> complete(@PathVariable String id, @RequestBody Map<String, Object> input, HttpSession session) {
        if (!access.current(session).allows("/myCampus/visitManage/index", "安商稳商", "编辑"))
            throw WorkspaceAccess.denied("没有完成走访权限");
        List<String> found = jdbc.query("SELECT payload FROM records WHERE collection='visitOrders' AND id=? FOR UPDATE", (rs, n) -> rs.getString(1), id);
        if (found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "工单不存在");
        Map<String, Object> order = parse(found.get(0));
        if ("已完成".equals(order.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "工单已完成");
        String result = String.valueOf(input.getOrDefault("result", "")).trim();
        if (result.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请填写走访结果");
        order.put("status", "已完成");
        save("visitOrders", id, order);
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("id", UUID.randomUUID().toString()); record.put("orderId", id);
        record.put("title", order.getOrDefault("title", "")); record.put("company", order.getOrDefault("company", ""));
        record.put("owner", order.getOrDefault("owner", "")); record.put("date", java.time.LocalDate.now().toString());
        record.put("result", result); record.put("duration", input.getOrDefault("duration", ""));
        save("visitRecords", String.valueOf(record.get("id")), record);
        return Map.of("order", order, "record", record);
    }
}
