package com.youshu.local;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpSession;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 地图数据接口：地址解析、关键词联想、园区边界。
 * 腾讯位置服务凭据仅保留在服务端，前端不接触 SecretKey。
 */
@RestController
@RequestMapping("/api/geo")
public class GeoController {
    private static final String ROUTE = "/businessMap/index";
    private final MapService maps;
    private final WorkspaceAccess access;

    GeoController(MapService maps, WorkspaceAccess access) {
        this.maps = maps;
        this.access = access;
    }

    @Operation(summary = "地图服务配置状态")
    @GetMapping("/status")
    public Map<String, Object> status(HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(ROUTE, "智慧招商", null)) throw WorkspaceAccess.denied("没有查看地图权限");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("configured", maps.configured());
        payload.put("provider", maps.providerName());
        payload.put("providerName", maps.providerDisplayName());
        return payload;
    }

    @Operation(summary = "地址解析为经纬度")
    @GetMapping("/geocode")
    public Map<String, Object> geocode(
            @RequestParam String address,
            @RequestParam(required = false) String region,
            HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(ROUTE, "智慧招商", null)) throw WorkspaceAccess.denied("没有查看地图权限");
        Map<String, Object> result = maps.geocode(address, region);
        if (result.isEmpty()) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("found", false);
            payload.put("message", "未能解析该地址，请尝试更精确的园区或道路名称");
            return payload;
        }
        Map<String, Object> payload = new LinkedHashMap<>(result);
        payload.put("found", true);
        return payload;
    }

    @Operation(summary = "关键词联想候选地点")
    @GetMapping("/suggest")
    public Map<String, Object> suggest(
            @RequestParam String keyword,
            @RequestParam(required = false) String region,
            HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(ROUTE, "智慧招商", null)) throw WorkspaceAccess.denied("没有查看地图权限");
        List<Map<String, Object>> items = maps.suggest(keyword, region);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", items);
        payload.put("count", items.size());
        return payload;
    }

    @Operation(summary = "园区边界查询")
    @GetMapping("/park-boundary")
    public Map<String, Object> parkBoundary(
            @RequestParam String name,
            @RequestParam(required = false) String city,
            HttpSession session) {
        var principal = access.current(session);
        if (!principal.allows(ROUTE, "智慧招商", null)) throw WorkspaceAccess.denied("没有查看地图权限");
        List<Map<String, Object>> items = maps.searchPlaces(name, city);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", items);
        payload.put("count", items.size());
        return payload;
    }
}
