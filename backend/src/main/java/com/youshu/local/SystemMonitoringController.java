package com.youshu.local;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpSession;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemMonitoringController {
    private static final String ROUTE = "/system/interface-monitoring";
    private final JdbcTemplate jdbc;
    private final WorkspaceAccess access;
    private final ObjectMapper mapper;

    SystemMonitoringController(JdbcTemplate jdbc, WorkspaceAccess access, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.access = access;
        this.mapper = mapper;
    }

    @GetMapping("/interface-metrics")
    public Map<String, Object> interfaceMetrics(HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(ROUTE, "平台管理", null)) throw WorkspaceAccess.denied("没有查看数据服务监控权限");
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE object_type='API'", Long.class);
        long todayCount = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE object_type='API' AND occurred_at>=? AND occurred_at<?",
            Long.class, Timestamp.valueOf(today.atStartOfDay()), Timestamp.valueOf(today.plusDays(1).atStartOfDay()));
        long monthCount = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE object_type='API' AND occurred_at>=? AND occurred_at<?",
            Long.class, Timestamp.valueOf(today.withDayOfMonth(1).atStartOfDay()), Timestamp.valueOf(today.plusDays(1).atStartOfDay()));
        long successful = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE object_type='API' AND result_status='成功'", Long.class);
        long failed = jdbc.queryForObject("SELECT COUNT(*) FROM op_log WHERE object_type='API' AND result_status='失败'", Long.class);
        double averageDuration = jdbc.queryForObject("SELECT COALESCE(AVG(duration_ms),0) FROM op_log WHERE object_type='API'", Double.class);
        List<Map<String, Object>> departments = jdbc.query("SELECT department_id name,COUNT(*) count,SUM(result_status='失败') failures,ROUND(AVG(duration_ms),1) avgDuration FROM op_log WHERE object_type='API' GROUP BY department_id ORDER BY count DESC",
            (rs, index) -> Map.<String, Object>of("name", rs.getString("name"), "count", rs.getLong("count"), "failures", rs.getLong("failures"), "averageDuration", rs.getDouble("avgDuration")));
        List<Map<String, Object>> modules = jdbc.query("SELECT module name,COUNT(*) count,SUM(result_status='失败') failures,ROUND(AVG(duration_ms),1) avgDuration FROM op_log WHERE object_type='API' GROUP BY module ORDER BY count DESC",
            (rs, index) -> Map.<String, Object>of("name", rs.getString("name"), "count", rs.getLong("count"), "failures", rs.getLong("failures"), "averageDuration", rs.getDouble("avgDuration")));
        int dailyLimit = setting("dailyCallWarning", 10_000);
        int monthlyLimit = setting("monthlyCallWarning", 200_000);
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalCalls", total);
        metrics.put("todayCalls", todayCount);
        metrics.put("monthCalls", monthCount);
        metrics.put("successRate", total == 0 ? 100 : Math.round(successful * 10_000.0 / total) / 100.0);
        metrics.put("averageDuration", Math.round(averageDuration * 10.0) / 10.0);
        metrics.put("failures", failed);
        metrics.put("dailyThreshold", dailyLimit);
        metrics.put("monthlyThreshold", monthlyLimit);
        metrics.put("dailyWarning", todayCount >= dailyLimit);
        metrics.put("monthlyWarning", monthCount >= monthlyLimit);
        metrics.put("departments", departments);
        metrics.put("modules", modules);
        return metrics;
    }

    private int setting(String key, int fallback) {
        try {
            String payload = jdbc.queryForObject("SELECT payload FROM records WHERE collection='tenantSettings' AND id='workspace'", String.class);
            JsonNode value = mapper.readTree(payload).get(key);
            return value == null ? fallback : Math.max(1, value.asInt(fallback));
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
