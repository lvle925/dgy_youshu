package com.youshu.local;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {
    private static final int DAILY_LIMIT = 50;
    private static final int UNLOCK_COST = 10;
    private static final ZoneId QUOTA_ZONE = ZoneId.of("Asia/Shanghai");
    private static final String PROJECT_ROUTE = "/business/projectCluesUpdate/index";
    private final JdbcTemplate jdbc;
    private final WorkspaceAccess access;
    private final RecordsController records;

    WorkspaceController(JdbcTemplate jdbc, WorkspaceAccess access, RecordsController records) {
        this.jdbc = jdbc;
        this.access = access;
        this.records = records;
    }

    record Points(int limit, int remaining, List<String> unlockedIds) {}

    @GetMapping("/points")
    Points points(HttpSession session) {
        return balance(access.current(session).subject(), LocalDate.now(QUOTA_ZONE));
    }

    @PostMapping("/projects/{id}/unlock")
    @Transactional
    public Points unlock(HttpSession session, @PathVariable String id) {
        var principal = access.current(session);
        if (!principal.allows(PROJECT_ROUTE, "商机洞察", "编辑"))
            throw WorkspaceAccess.denied("没有解锁项目权限");
        String user = principal.subject();
        LocalDate today = LocalDate.now(QUOTA_ZONE);
        jdbc.update("MERGE INTO project_wallet(username) KEY(username) VALUES(?)", user);
        jdbc.queryForObject("SELECT username FROM project_wallet WHERE username=? FOR UPDATE", String.class, user);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM records WHERE collection='clues' AND id=?", Integer.class, id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "项目已不存在");
        Points current = balance(user, today);
        if (current.unlockedIds().contains(id)) return current;
        if (current.remaining() < UNLOCK_COST)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "今日积分不足，明日 00:00 恢复");
        jdbc.update("INSERT INTO project_unlock(username, project_id, charged_on) VALUES(?,?,?)", user, id, today);
        return balance(user, today);
    }

    @GetMapping("/projects/{id}/contact")
    Map<String, Object> contact(HttpSession session, @PathVariable String id) {
        var principal = access.current(session);
        if (!principal.allows(PROJECT_ROUTE, "商机洞察", null))
            throw WorkspaceAccess.denied("没有项目线索访问权限");
        if (!isUnlocked(jdbc, principal.subject(), id)) throw WorkspaceAccess.denied("请先解锁项目");
        return jdbc.query("SELECT payload FROM records WHERE collection='clues' AND id=?", (rs, n) ->
            records.parse(rs.getString(1)), id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "项目已不存在"));
    }

    static boolean isUnlocked(JdbcTemplate jdbc, String user, String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM project_unlock WHERE username=? AND project_id=?", Integer.class, user, id) > 0;
    }

    private Points balance(String user, LocalDate today) {
        int spent = jdbc.queryForObject("SELECT COUNT(*) FROM project_unlock WHERE username=? AND charged_on=?",
            Integer.class, user, today) * UNLOCK_COST;
        List<String> ids = jdbc.queryForList("SELECT project_id FROM project_unlock WHERE username=? ORDER BY project_id",
            String.class, user);
        return new Points(DAILY_LIMIT, Math.max(0, DAILY_LIMIT - spent), ids);
    }
}
