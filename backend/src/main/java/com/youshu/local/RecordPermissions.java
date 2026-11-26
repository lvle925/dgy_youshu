package com.youshu.local;

import java.util.List;
import java.util.Map;

final class RecordPermissions {
    private static final String PROJECTS = "/business/projectCluesUpdate/index";
    private static final Map<String, List<String>> ROUTES = Map.ofEntries(
        Map.entry("members", List.of("/member/index", "/member/role")),
        Map.entry("departments", List.of("/member/departments")),
        Map.entry("roles", List.of("/member/role", "/member/index")),
        Map.entry("companyArchives", List.of("/myCampus/corporateArchives/index", "/businessMap/index", "/home/index")),
        Map.entry("migrationWarnings", List.of("/myCampus/migrationWarning/index", "/home/index")),
        Map.entry("migrationRules", List.of("/myCampus/migrationWarning/index")),
        Map.entry("serviceRequests", List.of("/myCampus/guarantee/index", "/myCampus/visitManage/index", "/home/index")),
        Map.entry("biddingRecords", List.of("/bidding/index")),
        Map.entry("industryNodes", List.of("/industryChain/industryChart/index")),
        Map.entry("supplyRelations", List.of("/industryChain/industrySupply/index")),
        Map.entry("campusList", List.of("/myCampus/campusAdmin/index")),
        Map.entry("visitOrders", List.of("/myCampus/visitManage/index", "/myCampus/corporateArchives/index")),
        Map.entry("visitRecords", List.of("/myCampus/visitManage/index", "/subsidy/index")),
        Map.entry("policies", List.of("/policy/index", "/home/index")),
        Map.entry("clues", List.of(PROJECTS, "/business/businessInvestigate/index", "/business/businessHall/index", "/businessMap/index", "/home/index")),
        Map.entry("parksBuildings", List.of("/parksBuildings/index")),
        Map.entry("investigationTasks", List.of("/business/businessInvestigate/index")),
        Map.entry("matchCompanies", List.of("/business/businessHall/index")),
        Map.entry("opportunityModels", List.of("/business/businessHall/index")),
        Map.entry("tenantSettings", List.of("/setting/index")),
        Map.entry("aiScripts", List.of("/business/aiOutbound/tasks", "/business/aiOutbound/records", "/business/aiOutbound/dashboard")),
        Map.entry("aiTasks", List.of("/business/aiOutbound/tasks")),
        Map.entry("aiRecords", List.of("/business/aiOutbound/records", "/business/aiOutbound/dashboard"))
    );

    private RecordPermissions() {}

    static void check(WorkspaceAccess.Principal principal, String collection, String action) {
        if (principal.administrator()) return;
        if (action != null && collection.equals("members")) allowedForIdentity(principal, "/member/index", action);
        if (action != null && collection.equals("roles")) allowedForIdentity(principal, "/member/role", action);
        var allowed = ROUTES.getOrDefault(collection, List.of());
        if (collection.equals("policies") && action != null) allowed = List.of("/policy/index");
        if (collection.equals("clues") && action != null) allowed = action.equals("新增")
            ? List.of(PROJECTS, "/business/projectCluesUpdate/index", "/business/businessInvestigate/index", "/business/businessHall/index", "/businessMap/index")
            : List.of(PROJECTS, "/business/projectCluesUpdate/index");
        if (collection.equals("visitRecords") && action != null) allowed = List.of("/myCampus/visitManage/index");
        if (collection.equals("serviceRequests") && action != null) allowed = List.of("/myCampus/guarantee/index", "/myCampus/visitManage/index");
        if (allowed.stream().noneMatch(route -> principal.allows(route, WorkspaceAccess.groupFor(route), action)))
            throw WorkspaceAccess.denied("没有此业务操作权限");
    }
    private static void allowedForIdentity(WorkspaceAccess.Principal principal, String route, String action) {
        if (!principal.allows(route, "平台管理", action)) throw WorkspaceAccess.denied("没有账号权限维护权限");
    }
}
