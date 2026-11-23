package com.youshu.local;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuditService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    AuditService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public void record(WorkspaceAccess.Principal principal, String module, String action, String objectType,
                       String objectId, Object before, Object after, String result, HttpServletRequest request,
                       long durationMs) {
        if (request != null) request.setAttribute("audit.recorded", true);
        String actor = principal == null ? "" : principal.user();
        String departmentId = principal == null ? "" : principal.departmentId();
        jdbc.update("INSERT INTO op_log(occurred_at,actor,department_id,module,action,object_type,object_id," +
                "before_summary,after_summary,result_status,ip,user_agent,duration_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            LocalDateTime.now(ZoneId.of("Asia/Shanghai")), actor, departmentId, module, action,
            objectType == null ? "" : objectType, objectId == null ? "" : objectId,
            summary(before), summary(after), result,
            request == null || request.getRemoteAddr() == null ? "" : request.getRemoteAddr(),
            request == null || request.getHeader("User-Agent") == null ? "" : request.getHeader("User-Agent"), Math.max(0, durationMs));
    }

    public void recordLoginAttempt(String identity, String action, String result, Object details,
                                   HttpServletRequest request) {
        if (request != null) request.setAttribute("audit.recorded", true);
        jdbc.update("INSERT INTO op_log(occurred_at,actor,department_id,module,action,object_type,object_id," +
                "before_summary,after_summary,result_status,ip,user_agent,duration_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            LocalDateTime.now(ZoneId.of("Asia/Shanghai")), identity == null ? "" : identity, "", "认证", action,
            "账号", identity == null ? "" : identity, null, summary(details), result,
            request == null || request.getRemoteAddr() == null ? "" : request.getRemoteAddr(),
            request == null || request.getHeader("User-Agent") == null ? "" : request.getHeader("User-Agent"), 0);
    }

    private String summary(Object value) {
        if (value == null) return null;
        Object safeValue = value;
        if (value instanceof Map<?, ?> values) {
            Map<String, Object> safe = new LinkedHashMap<>();
            for (String key : new String[]{"name", "company", "title", "status", "stage", "role", "departmentId", "dataScope", "parkId", "department", "failedAttempts", "httpStatus", "trustedDevice", "sensitiveField", "count"}) {
                if (values.containsKey(key)) safe.put(key, values.get(key));
            }
            safeValue = safe;
        }
        try { return mapper.writeValueAsString(safeValue); }
        catch (JsonProcessingException exception) { return "{}"; }
    }
}
