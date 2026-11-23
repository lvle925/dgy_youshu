package com.youshu.local;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@RestController
@RequestMapping("/api/audit")
public class AuditController {
    private static final String LOG_ROUTE = "/member/log";
    private static final String STATISTICS_ROUTE = "/member/logStatistics";
    private final JdbcTemplate jdbc;
    private final WorkspaceAccess access;
    private final AuditService audit;

    AuditController(JdbcTemplate jdbc, WorkspaceAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.access = access;
        this.audit = audit;
    }

    @GetMapping("/logs")
    public List<Map<String, Object>> logs(HttpSession session,
                                          @RequestParam(defaultValue = "1000") int limit,
                                          @RequestParam(required = false) String query,
                                          @RequestParam(required = false) String module,
                                          @RequestParam(required = false) String actor) {
        var principal = access.current(session);
        if (!principal.allows(LOG_ROUTE, "平台管理", null)) throw WorkspaceAccess.denied("没有查看操作审计权限");
        int boundedLimit = Math.max(1, Math.min(limit, 5000));
        return jdbc.query("SELECT id,occurred_at,actor,department_id,module,action,object_type,object_id," +
                "before_summary,after_summary,result_status,ip,user_agent,duration_ms FROM op_log " +
                "WHERE (? IS NULL OR CONCAT_WS(' ',module,action,object_type,object_id,actor) LIKE ?) " +
                "AND (? IS NULL OR module=?) AND (? IS NULL OR actor=?) ORDER BY id DESC LIMIT ?",
            (rs, rowNum) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", rs.getLong("id"));
                row.put("time", rs.getTimestamp("occurred_at").toLocalDateTime().toString());
                row.put("operator", rs.getString("actor"));
                row.put("departmentId", rs.getString("department_id"));
                row.put("type", rs.getString("module"));
                row.put("title", rs.getString("action"));
                row.put("objectType", rs.getString("object_type"));
                row.put("objectId", rs.getString("object_id"));
                row.put("before", rs.getString("before_summary"));
                row.put("after", rs.getString("after_summary"));
                row.put("status", rs.getString("result_status"));
                row.put("ip", rs.getString("ip"));
                row.put("userAgent", rs.getString("user_agent"));
                row.put("durationMs", rs.getLong("duration_ms"));
                return row;
            }, query, query == null ? null : "%" + query + "%", module, module, actor, actor, boundedLimit);
    }

    @GetMapping("/statistics")
    public Map<String, Object> statistics(HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(STATISTICS_ROUTE, "平台管理", null)) throw WorkspaceAccess.denied("没有查看审计统计权限");
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM op_log", Long.class);
        long todayCount = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE occurred_at>=? AND occurred_at<?",
            Long.class, Timestamp.valueOf(today.atStartOfDay()), Timestamp.valueOf(today.plusDays(1).atStartOfDay()));
        long errors = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE result_status='失败'", Long.class);
        List<Map<String, Object>> trend = jdbc.query("SELECT DATE(occurred_at) day,COUNT(*) count FROM op_log " +
                "WHERE occurred_at>=? GROUP BY DATE(occurred_at) ORDER BY day",
            (rs, index) -> Map.<String, Object>of("date", rs.getDate("day").toLocalDate().toString(), "count", rs.getLong("count")),
            Timestamp.valueOf(today.minusDays(6).atStartOfDay()));
        List<Map<String, Object>> distribution = jdbc.query("SELECT action name,COUNT(*) count FROM op_log " +
                "GROUP BY action ORDER BY count DESC",
            (rs, index) -> Map.<String, Object>of("name", rs.getString("name"), "count", rs.getLong("count")));
        List<Map<String, Object>> operators = jdbc.query("SELECT actor name,COUNT(*) count FROM op_log WHERE actor<>'' " +
                "GROUP BY actor ORDER BY count DESC",
            (rs, index) -> Map.<String, Object>of("name", rs.getString("name"), "count", rs.getLong("count")));
        return Map.of("total", total, "today", todayCount, "exceptions", errors,
            "trend", trend, "distribution", distribution, "operators", operators);
    }

    @PostMapping("/export")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void export(@RequestBody Map<String, Object> requestBody, HttpSession session, HttpServletRequest request) {
        var principal = access.current(session);
        String route = String.valueOf(requestBody.getOrDefault("route", ""));
        String group = WorkspaceAccess.groupFor(route);
        if (group.isBlank() || !principal.allows(route, group, "导出"))
            throw WorkspaceAccess.denied("没有该页面的数据导出权限");
        audit.record(principal, group, "批量导出", "数据报表",
            String.valueOf(requestBody.getOrDefault("name", "")), null,
            Map.of("name", requestBody.getOrDefault("name", ""), "count", requestBody.getOrDefault("count", 0)),
            "成功", request, 0);
    }
}
