package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class GovernmentReportsController {
    private static final String HOME_ROUTE = "/home/index";
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final WorkspaceAccess access;
    private final AuditService audit;

    GovernmentReportsController(JdbcTemplate jdbc, ObjectMapper mapper, WorkspaceAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.access = access;
        this.audit = audit;
    }

    @GetMapping("/operation-brief")
    public Map<String, Object> operationBrief(@RequestParam(defaultValue = "") String city,
                                             @RequestParam(defaultValue = "") String park,
                                             HttpSession session, HttpServletRequest request) {
        var principal = access.current(session);
        if (!principal.allows(HOME_ROUTE, "首页", null) && !principal.allows("/myCampus/panoramicLnsight/index", "安商稳商", null))
            throw WorkspaceAccess.denied("没有查看运行简报权限");
        List<Map<String, Object>> policies = rows("policies");
        List<Map<String, Object>> clues = rows("clues");
        List<Map<String, Object>> requests = rows("serviceRequests");
        List<Map<String, Object>> migration = rows("migrationWarnings");
        policies = scope(principal, cityRows(policies, city), "park");
        clues = scope(principal, parkRows(cityRows(clues, city), park), "park");
        requests = scope(principal, parkRows(cityRows(requests, city), park), "park");
        migration = scope(principal, parkRows(cityRows(migration, city), park), "park");
        long requestsClosed = requests.stream().filter(row -> "已办结".equals(row.get("status"))).count();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        long overdue = requests.stream().filter(row -> !"已办结".equals(row.get("status")))
            .filter(row -> row.get("dueAt") != null && String.valueOf(row.get("dueAt")).compareTo(today.toString()) < 0).count();
        long highRisk = migration.stream().filter(row -> "高风险".equals(row.get("risk"))).count();
        Map<String, Object> brief = new LinkedHashMap<>();
        brief.put("generatedAt", Instant.now().toString());
        brief.put("city", city);
        brief.put("park", park);
        brief.put("policyCount", policies.size());
        brief.put("projectCount", clues.size());
        brief.put("projectStages", clues.stream().collect(java.util.stream.Collectors.groupingBy(
            row -> String.valueOf(row.getOrDefault("stage", "线索摸排")), java.util.stream.Collectors.counting())));
        brief.put("requestCount", requests.size());
        brief.put("requestClosed", requestsClosed);
        brief.put("requestOverdue", overdue);
        brief.put("migrationCount", migration.size());
        brief.put("migrationHighRisk", highRisk);
        audit.record(principal, "运行简报", "生成运行简报", "运行简报", city + (park.isBlank() ? "" : "/" + park), null,
            Map.of("policyCount", policies.size(), "projectCount", clues.size(), "requestCount", requests.size(), "migrationCount", migration.size()),
            "成功", request, 0);
        return brief;
    }

    private List<Map<String, Object>> rows(String collection) {
        return jdbc.query("SELECT payload FROM records WHERE collection=?", (rs, index) -> {
            try { return mapper.readValue(rs.getString(1), new TypeReference<Map<String, Object>>() {}); }
            catch (IOException exception) { throw new IllegalStateException(exception); }
        }, collection);
    }

    private List<Map<String, Object>> cityRows(List<Map<String, Object>> rows, String city) {
        if (city.isBlank()) return rows;
        return rows.stream().filter(row -> {
            String location = String.valueOf(row.getOrDefault("city", row.getOrDefault("targetCity",
                row.getOrDefault("region", row.getOrDefault("district", "")))));
            return location.isBlank() ? "上海市".equals(city) : location.contains(city) || city.contains(location) || "上海市".equals(city);
        }).toList();
    }

    private List<Map<String, Object>> parkRows(List<Map<String, Object>> rows, String park) {
        if (park.isBlank()) return rows;
        return rows.stream().filter(row -> String.valueOf(row.getOrDefault("park", row.getOrDefault("parkId", ""))).contains(park)).toList();
    }

    private List<Map<String, Object>> scope(WorkspaceAccess.Principal principal, List<Map<String, Object>> rows, String field) {
        if (principal.administrator() || "ALL_PARKS".equals(principal.dataScope())) return rows;
        if ("SELF_ONLY".equals(principal.dataScope())) return rows.stream().filter(row -> {
            String owner = String.valueOf(row.getOrDefault("ownerId", row.getOrDefault("owner", row.getOrDefault("createdBy", ""))));
            return owner.equals(principal.user()) || owner.equals(principal.memberId());
        }).toList();
        return rows.stream().filter(row -> principal.parkIds().contains(String.valueOf(row.getOrDefault("parkId", "")))
            || principal.parkIds().contains(String.valueOf(row.getOrDefault(field, "")))).toList();
    }
}
