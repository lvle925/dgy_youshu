package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectWorkflowController {
    private static final String PROJECT_ROUTE = "/business/projectCluesUpdate/index";
    private static final List<String> STAGES = List.of("线索摸排", "研判评审", "载体选址匹配", "拟签约", "落地纳统");
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final WorkspaceAccess access;
    private final AuditService audit;

    ProjectWorkflowController(JdbcTemplate jdbc, ObjectMapper mapper, WorkspaceAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.access = access;
        this.audit = audit;
    }

    @PostMapping("/{id}/sensitive-contact")
    public Map<String, Object> sensitiveContact(@PathVariable String id, HttpSession session, HttpServletRequest request) {
        var principal = access.current(session);
        if (!principal.allows(PROJECT_ROUTE, "商机洞察", "查看敏感信息"))
            throw WorkspaceAccess.denied("没有查看明文联系方式的权限");
        Map<String, Object> row = load(id, false);
        requireScope(principal, row);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("company", row.getOrDefault("company", ""));
        result.put("contact", row.getOrDefault("contact", ""));
        result.put("phone", row.getOrDefault("phone", ""));
        audit.record(principal, "项目线索", "查阅敏感联系方式", "项目线索", id, null,
            Map.of("company", row.getOrDefault("company", ""), "sensitiveField", "contact,phone"), "成功", request, 0);
        return result;
    }

    @PostMapping("/{id}/stage")
    @Transactional
    public Map<String, Object> changeStage(@PathVariable String id, @RequestBody Map<String, String> body,
                                           HttpSession session, HttpServletRequest request) {
        var principal = requireEditor(session);
        Map<String, Object> row = load(id, true);
        requireScope(principal, row);
        String nextStage = body.getOrDefault("stage", "");
        int currentIndex = STAGES.indexOf(String.valueOf(row.getOrDefault("stage", STAGES.getFirst())));
        int nextIndex = STAGES.indexOf(nextStage);
        if (nextIndex < 0 || nextIndex < currentIndex || nextIndex > currentIndex + 1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "项目只能按政务推进阶段顺序流转");
        if (nextIndex == currentIndex) return publicRow(row);
        List<Object> history = new ArrayList<>(row.get("history") instanceof List<?> items ? items : List.of());
        history.add(Map.of("from", STAGES.get(currentIndex), "to", nextStage,
            "operator", principal.user(), "time", Instant.now().toString()));
        Map<String, Object> before = new LinkedHashMap<>(row);
        row.put("stage", nextStage);
        row.put("history", history);
        save(id, row);
        audit.record(principal, "项目线索", "推进阶段", "项目线索", id, before, row, "成功", request, 0);
        return publicRow(row);
    }

    @PostMapping("/{id}/claim")
    @Transactional
    public Map<String, Object> claim(@PathVariable String id, HttpSession session, HttpServletRequest request) {
        var principal = requireEditor(session);
        Map<String, Object> row = load(id, true);
        requireScope(principal, row);
        String ownerId = String.valueOf(row.getOrDefault("ownerId", ""));
        if (!ownerId.isBlank() && !ownerId.equals(principal.user()) && !ownerId.equals(principal.memberId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "该企业已由 " + row.getOrDefault("owner", "其他专员") + " 跟进。请联系归属人员或将项目退回公海后再认领。");
        String company = String.valueOf(row.getOrDefault("company", "")).trim();
        List<Map<String, Object>> duplicates = jdbc.query("SELECT payload FROM records WHERE collection='clues' AND id<>?",
            (rs, index) -> decode(rs.getString(1)), id).stream()
            .filter(item -> company.equalsIgnoreCase(String.valueOf(item.getOrDefault("company", "")).trim()))
            .filter(item -> {
                String assigned = String.valueOf(item.getOrDefault("ownerId", ""));
                return !assigned.isBlank() && !assigned.equals(principal.user()) && !assigned.equals(principal.memberId());
            }).toList();
        if (!duplicates.isEmpty()) {
            Map<String, Object> duplicate = duplicates.getFirst();
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "撞单提醒：该企业已由 " + duplicate.getOrDefault("owner", "其他专员") + " 在跟进，可先核实归属或退回公海。");
        }
        Map<String, Object> before = new LinkedHashMap<>(row);
        row.put("ownerId", principal.memberId().isBlank() ? principal.user() : principal.memberId());
        row.put("owner", principal.user());
        row.put("ownerDepartment", principal.departmentId());
        row.put("claimedAt", Instant.now().toString());
        save(id, row);
        audit.record(principal, "项目线索", "公海认领", "项目线索", id, before, row, "成功", request, 0);
        return publicRow(row);
    }

    @PostMapping("/{id}/release")
    @Transactional
    public Map<String, Object> release(@PathVariable String id, HttpSession session, HttpServletRequest request) {
        var principal = requireEditor(session);
        Map<String, Object> row = load(id, true);
        requireScope(principal, row);
        String ownerId = String.valueOf(row.getOrDefault("ownerId", ""));
        if (!principal.administrator() && !ownerId.equals(principal.user()) && !ownerId.equals(principal.memberId()))
            throw WorkspaceAccess.denied("只能将本人负责的项目退回公海");
        Map<String, Object> before = new LinkedHashMap<>(row);
        row.remove("ownerId");
        row.remove("owner");
        row.remove("ownerDepartment");
        row.remove("claimedAt");
        row.put("releasedAt", Instant.now().toString());
        save(id, row);
        audit.record(principal, "项目线索", "退回公海", "项目线索", id, before, row, "成功", request, 0);
        return row;
    }

    private WorkspaceAccess.Principal requireEditor(HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(PROJECT_ROUTE, "商机洞察", "编辑")) throw WorkspaceAccess.denied("没有项目线索流转权限");
        return principal;
    }

    private Map<String, Object> load(String id, boolean forUpdate) {
        String sql = "SELECT payload FROM records WHERE collection='clues' AND id=?" + (forUpdate ? " FOR UPDATE" : "");
        return jdbc.query(sql, (rs, index) -> decode(rs.getString(1)), id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "项目线索不存在"));
    }

    private void requireScope(WorkspaceAccess.Principal principal, Map<String, Object> row) {
        if (principal.administrator() || "ALL_PARKS".equals(principal.dataScope())) return;
        if ("SELF_ONLY".equals(principal.dataScope())) {
            String owner = String.valueOf(row.getOrDefault("ownerId", row.getOrDefault("owner", row.getOrDefault("createdBy", ""))));
            if (owner.equals(principal.user()) || owner.equals(principal.memberId())) return;
        } else if (principal.parkIds().contains(String.valueOf(row.getOrDefault("parkId", "")))
            || principal.parkIds().contains(String.valueOf(row.getOrDefault("park", "")))) return;
        throw WorkspaceAccess.denied("超出当前账号的数据范围");
    }

    private void save(String id, Map<String, Object> row) {
        try {
            jdbc.update("UPDATE records SET payload=? WHERE collection='clues' AND id=?", mapper.writeValueAsString(row), id);
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private Map<String, Object> publicRow(Map<String, Object> source) {
        Map<String, Object> row = new LinkedHashMap<>(source);
        if (row.get("phone") instanceof String phone && phone.matches("1\\d{10}"))
            row.put("phone", phone.substring(0, 3) + "****" + phone.substring(7));
        return row;
    }

    private Map<String, Object> decode(String json) {
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (IOException exception) { throw new IllegalStateException(exception); }
    }
}
