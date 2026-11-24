package com.youshu.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/demo")
public class DemoDataResetController {
    private static final Set<String> PRESERVED_COLLECTIONS = Set.of("members", "roles", "departments", "tenantSettings");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final WorkspaceAccess access;
    private final AuditService audit;
    private final boolean demoLoginEnabled;

    DemoDataResetController(JdbcTemplate jdbc, ObjectMapper mapper, WorkspaceAccess access, AuditService audit,
                            @org.springframework.beans.factory.annotation.Value("${app.auth.demo-login-enabled:false}") boolean demoLoginEnabled) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.access = access;
        this.audit = audit;
        this.demoLoginEnabled = demoLoginEnabled;
    }

    @PostMapping("/reset")
    @Transactional
    public Map<String, Object> reset(HttpSession session, HttpServletRequest request) throws IOException {
        if (!demoLoginEnabled || session == null || !Boolean.TRUE.equals(session.getAttribute("demo")))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "演示数据恢复功能未启用");
        WorkspaceAccess.Principal principal = access.current(session);
        Map<String, List<Map<String, Object>>> seeds = mapper.readValue(
            new ClassPathResource("seed.json").getInputStream(), new TypeReference<>() {});
        int restored = 0;
        for (Map.Entry<String, List<Map<String, Object>>> entry : seeds.entrySet()) {
            String collection = entry.getKey();
            if (PRESERVED_COLLECTIONS.contains(collection)) continue;
            jdbc.update("DELETE FROM records WHERE collection=?", collection);
            for (Map<String, Object> source : entry.getValue()) {
                Map<String, Object> row = new LinkedHashMap<>(source);
                jdbc.update("INSERT INTO records(collection,id,payload) VALUES(?,?,?)",
                    collection, String.valueOf(row.get("id")), mapper.writeValueAsString(row));
                restored++;
            }
        }
        audit.record(principal, "系统管理", "恢复初始政务演示数据", "演示数据", "seed.json", null,
            Map.of("recordsRestored", restored, "preserved", PRESERVED_COLLECTIONS), "成功", request, 0);
        return Map.of("restoredRecords", restored, "preservedCollections", PRESERVED_COLLECTIONS);
    }
}
