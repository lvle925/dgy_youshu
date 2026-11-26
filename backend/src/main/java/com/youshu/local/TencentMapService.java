package com.youshu.local;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 腾讯位置服务 WebService 封装。
 *
 * <p>SecretKey 仅存在于服务端环境变量，前端只调用本项目的 /api/geo 接口。
 * 由于免费配额有限，所有查询结果都会在本地缓存，避免重复消耗配额。
 */
@Service
public class TencentMapService {
    private static final Logger log = LoggerFactory.getLogger(TencentMapService.class);
    private static final String HOST = "https://apis.map.qq.com";
    private static final Duration CACHE_TTL = Duration.ofHours(6);

    private final RestClient restClient = RestClient.builder().build();
    private final ObjectMapper json = new ObjectMapper();

    @Value("${app.tencentmap.key:}")
    private String key;

    @Value("${app.tencentmap.secret-key:}")
    private String secretKey;

    /** 查询结果缓存：地址/关键词 → 解析结果。 */
    private final Map<String, CachedValue> cache = new ConcurrentHashMap<>();

    /**
     * 每日调用预算保护。
     * 腾讯位置服务免费额度很小，超限会返回 status 121。
     * 这里在本地先行计数，接近预算时直接短路，避免把配额浪费在必然失败的请求上。
     */
    private static final int DAILY_BUDGET = 200;
    private final AtomicInteger dailyCalls = new AtomicInteger();
    private volatile LocalDate budgetDate = LocalDate.now(ZoneId.of("Asia/Shanghai"));

    private record CachedValue(Instant expiresAt, Object payload) {}

    public boolean isConfigured() {
        return key != null && !key.isBlank() && secretKey != null && !secretKey.isBlank();
    }

    /**
     * 每日预算是否仍然可用。超限时不再发起远程请求。
     */
    private boolean budgetAvailable() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        if (!today.equals(budgetDate)) {
            budgetDate = today;
            dailyCalls.set(0);
        }
        return dailyCalls.get() < DAILY_BUDGET;
    }

    /** 远程返回配额耗尽时停止后续请求，直到次日重置。 */
    private void markQuotaExhausted() {
        dailyCalls.set(DAILY_BUDGET);
    }

    /**
     * 地址解析：把用户输入的地址或名称解析为经纬度。
     * 返回 {@code {lng, lat, title, address, district}}；未配置或失败时返回空 Map。
     */
    public Map<String, Object> geocode(String address, String region) {
        if (!isConfigured() || address == null || address.isBlank()) return Map.of();
        if (!budgetAvailable()) return Map.of();
        String cacheKey = "geo:" + region + ":" + address.trim();
        Object cached = readCache(cacheKey);
        if (cached instanceof Map<?, ?> map) return castMap(map);

        Map<String, String> params = new LinkedHashMap<>();
        params.put("address", address.trim());
        if (region != null && !region.isBlank()) params.put("region", region.trim());
        params.put("key", key);
        params.put("output", "json");

        try {
            JsonNode node = call("/ws/geocoder/v1", params);
            JsonNode result = node.path("result");
            if (result.isMissingNode() || result.isNull()) return Map.of();
            JsonNode location = result.path("location");
            if (location.isMissingNode()) return Map.of();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("lng", location.path("lng").asDouble());
            payload.put("lat", location.path("lat").asDouble());
            payload.put("title", result.path("title").asText(""));
            payload.put("address", result.path("address").asText(""));
            payload.put("district", result.path("address_components").path("district").asText(""));
            writeCache(cacheKey, payload);
            return payload;
        } catch (Exception cause) {
            log.warn("腾讯地图地址解析失败：{}", cause.getMessage());
            return Map.of();
        }
    }

    /**
     * 关键词联想：返回候选地点列表，供地图页地址搜索下拉使用。
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> suggest(String keyword, String region) {
        if (!isConfigured() || keyword == null || keyword.isBlank()) return List.of();
        if (!budgetAvailable()) return List.of();
        String cacheKey = "sug:" + region + ":" + keyword.trim();
        Object cached = readCache(cacheKey);
        if (cached instanceof List<?> list) return (List<Map<String, Object>>) list;

        Map<String, String> params = new LinkedHashMap<>();
        params.put("keyword", keyword.trim());
        if (region != null && !region.isBlank()) params.put("region", region.trim());
        params.put("key", key);
        params.put("output", "json");

        try {
            JsonNode node = call("/ws/place/v1/suggestion", params);
            JsonNode data = node.path("data");
            List<Map<String, Object>> payload = new ArrayList<>();
            if (data.isArray()) {
                for (JsonNode item : data) {
                    JsonNode location = item.path("location");
                    if (location.isMissingNode()) continue;
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("title", item.path("title").asText(""));
                    entry.put("address", item.path("address").asText(""));
                    entry.put("district", item.path("district").asText(""));
                    entry.put("type", item.path("type").asText(""));
                    entry.put("lng", location.path("lng").asDouble());
                    entry.put("lat", location.path("lat").asDouble());
                    payload.add(entry);
                }
            }
            writeCache(cacheKey, payload);
            return payload;
        } catch (Exception cause) {
            log.warn("腾讯地图关键词联想失败：{}", cause.getMessage());
            return List.of();
        }
    }

    /**
     * 园区边界：优先取真实行政区/园区多边形，取不到时返回空列表由前端回退到本地示意围栏。
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> parkBoundary(String name, String city) {
        if (!isConfigured() || name == null || name.isBlank()) return List.of();
        if (!budgetAvailable()) return List.of();
        String cacheKey = "bnd:" + city + ":" + name.trim();
        Object cached = readCache(cacheKey);
        if (cached instanceof List<?> list) return (List<Map<String, Object>>) list;

        Map<String, String> params = new LinkedHashMap<>();
        params.put("keyword", name.trim());
        if (city != null && !city.isBlank()) params.put("region", city.trim());
        params.put("key", key);
        params.put("output", "json");

        try {
            JsonNode node = call("/ws/place/v1/search", params);
            JsonNode data = node.path("data");
            List<Map<String, Object>> payload = new ArrayList<>();
            if (data.isArray()) {
                for (JsonNode item : data) {
                    JsonNode location = item.path("location");
                    if (location.isMissingNode()) continue;
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("id", item.path("id").asText(""));
                    entry.put("title", item.path("title").asText(""));
                    entry.put("address", item.path("address").asText(""));
                    entry.put("lng", location.path("lng").asDouble());
                    entry.put("lat", location.path("lat").asDouble());
                    // 腾讯地点检索返回 polygon 时直接使用真实多边形
                    JsonNode polygon = item.path("polygon");
                    if (polygon.isArray() && polygon.size() > 2) {
                        List<List<Double>> ring = new ArrayList<>();
                        for (JsonNode point : polygon) {
                            ring.add(List.of(point.path("lng").asDouble(), point.path("lat").asDouble()));
                        }
                        entry.put("polygon", ring);
                    }
                    payload.add(entry);
                }
            }
            writeCache(cacheKey, payload);
            return payload;
        } catch (Exception cause) {
            log.warn("腾讯地图园区边界查询失败：{}", cause.getMessage());
            return List.of();
        }
    }

    /**
     * 调用腾讯位置服务 WebService 接口。
     *
     * <p>签名算法（官方 GET 方法）：参数按名称升序、值为未编码原始数据，
     * 签名为 md5(请求路径 + "?" + 排序参数串 + SecretKey)，请求时再对参数值做 URL 编码。
     */
    private JsonNode call(String path, Map<String, String> params) throws Exception {
        // 1. 按参数名 ASCII 升序，值为原始未编码数据
        Map<String, String> sorted = new TreeMap<>(params);
        String queryForSign = sorted.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + entry.getValue())
            .reduce((left, right) -> left + "&" + right)
            .orElse("");

        // 2. 签名
        String signature = md5(path + "?" + queryForSign + secretKey);

        // 3. 请求时对参数值做 URL 编码，但保持与签名一致的顺序
        String queryForSend = sorted.entrySet().stream()
            .map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
            .reduce((left, right) -> left + "&" + right)
            .orElse("");

        dailyCalls.incrementAndGet();
        URI uri = URI.create(HOST + path + "?" + queryForSend + "&sig=" + signature);
        String body = restClient.get().uri(uri).retrieve().body(String.class);
        JsonNode node = json.readTree(body == null ? "{}" : body);
        int status = node.path("status").asInt(-1);
        if (status == 121) {
            markQuotaExhausted();
            throw new IllegalStateException("腾讯位置服务返回 121：此 key 每日调用量已达上限");
        }
        if (status != 0) {
            throw new IllegalStateException("腾讯位置服务返回 " + status + "：" + node.path("message").asText("未知错误"));
        }
        return node;
    }

    private static String urlEncode(String value) {
        try {
            // 腾讯要求参数值单独编码：UTF-8 且空格转 %20（而非 +）
            return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
        } catch (Exception cause) {
            throw new IllegalStateException("参数编码失败", cause);
        }
    }

    private static String md5(String source) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("MD5");
        byte[] bytes = digest.digest(source.getBytes(StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        for (byte value : bytes) builder.append(String.format("%02x", value));
        return builder.toString();
    }

    private Object readCache(String cacheKey) {
        CachedValue value = cache.get(cacheKey);
        if (value == null) return null;
        if (value.expiresAt().isBefore(Instant.now())) {
            cache.remove(cacheKey);
            return null;
        }
        return value.payload();
    }

    private void writeCache(String cacheKey, Object payload) {
        cache.put(cacheKey, new CachedValue(Instant.now().plus(CACHE_TTL), payload));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Map<?, ?> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        source.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }
}
