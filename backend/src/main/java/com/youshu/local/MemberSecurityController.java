package com.youshu.local;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/members")
public class MemberSecurityController {
    private final JdbcTemplate jdbc;
    private final RecordsController records;
    private final WorkspaceAccess access;
    private final AuditService audit;

    MemberSecurityController(JdbcTemplate jdbc, RecordsController records, WorkspaceAccess access, AuditService audit) {
        this.jdbc = jdbc;
        this.records = records;
        this.access = access;
        this.audit = audit;
    }

    @PostMapping("/{id}/unlock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlock(@PathVariable String id, HttpSession session, HttpServletRequest request) {
        var principal = requireAccountAdministrator(session);
        Map<String, Object> member = member(id);
        String username = String.valueOf(member.getOrDefault("username", ""));
        jdbc.update("DELETE FROM login_attempt WHERE username=?", username);
        audit.record(principal, "人员管理", "人工解锁账号", "成员", id, null,
            Map.of("username", username), "成功", request, 0);
    }

    @PostMapping("/{id}/force-logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forceLogout(@PathVariable String id, HttpSession session, HttpServletRequest request) {
        var principal = requireAccountAdministrator(session);
        Map<String, Object> member = member(id);
        String username = String.valueOf(member.getOrDefault("username", ""));
        access.revokeUserSessions(username);
        audit.record(principal, "人员管理", "强制下线", "成员", id, null,
            Map.of("username", username), "成功", request, 0);
    }

    @PostMapping("/{id}/reset-password")
    public Map<String, Object> resetPassword(@PathVariable String id, @RequestBody Map<String, String> body,
                                             HttpSession session, HttpServletRequest request) {
        var principal = requireAccountAdministrator(session);
        Map<String, Object> member = member(id);
        String username = String.valueOf(member.getOrDefault("username", ""));
        String password = body.getOrDefault("password", "");
        if (!access.validPassword(password))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "重置密码不符合系统复杂度策略");
        byte[] salt = new byte[16];
        new java.security.SecureRandom().nextBytes(salt);
        jdbc.update("UPDATE member_account SET password_hash=?,must_change_password=TRUE WHERE member_id=?",
            AuthController.hash(password, salt), id);
        access.revokeUserSessions(username);
        audit.record(principal, "人员管理", "管理员重置密码", "成员", id, null,
            Map.of("username", username, "requiresPasswordChange", true), "成功", request, 0);
        return Map.of("requiresPasswordChange", true);
    }

    @GetMapping("/lock-state")
    public List<Map<String, Object>> lockStates(HttpSession session) {
        requireMemberViewer(session);
        return jdbc.query("SELECT username,failed_attempts,locked_until,last_attempt_at FROM login_attempt WHERE locked_until>? ORDER BY username",
            (rs, index) -> Map.<String, Object>of("username", rs.getString("username"),
                "failedAttempts", rs.getInt("failed_attempts"), "lockedUntil", rs.getLong("locked_until"),
                "lastAttemptAt", rs.getLong("last_attempt_at")), System.currentTimeMillis());
    }

    private WorkspaceAccess.Principal requireMemberEditor(HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows("/member/index", "平台管理", "编辑"))
            throw WorkspaceAccess.denied("没有人员账号管理权限");
        return principal;
    }

    private WorkspaceAccess.Principal requireAccountAdministrator(HttpSession session) {
        var principal = requireMemberEditor(session);
        if (!principal.administrator() && !principal.role().equals("系统管理员") && !principal.role().equals("本地政务演示管理员"))
            throw WorkspaceAccess.denied("账号解锁、重置密码和强制下线由系统管理员执行");
        return principal;
    }

    private void requireMemberViewer(HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows("/member/index", "平台管理", null))
            throw WorkspaceAccess.denied("没有人员账号查看权限");
    }

    private Map<String, Object> member(String id) {
        return jdbc.query("SELECT payload FROM records WHERE collection='members' AND id=?", (rs, index) -> records.parse(rs.getString(1)), id)
            .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "成员不存在"));
    }
}
