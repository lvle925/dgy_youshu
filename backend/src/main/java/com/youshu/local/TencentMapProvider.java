package com.youshu.local;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 腾讯位置服务实现。
 *
 * <p>当前项目的临时演示接入方案。若改用其它服务商，
 * 新增一个 {@link MapProvider} 实现并在 {@link MapService} 中注册即可，
 * 本类可整体保留或移除。
 *
 * <p>签名算法（官方 GET 方法）：
 * {@code sig = md5(请求路径 + "?" + 按参数名升序拼接的原始参数串 + SecretKey)}。
 * 参数值参与签名时必须是**未编码**的原始数据，实际发请求时才做 URL 编码。
 */
@Component
public class TencentMapProvider implements MapProvider {
    private static final Logger log = LoggerFactory.getLogger(TencentMapProvider.class);
    private static final String HOST = "https://apis.map.qq.com";

    private final RestClient restClient = RestClient.builder().build();
    private final ObjectMapper json = new ObjectMapper();

    @Value("${app.tencentmap.key:}")
    private String key;

    @Value("${app.tencentmap.secret-key:}")
    private String secretKey;

    @Override
    public String name() {
        return "tencent";
    }

    @Override
    public String displayName() {
        return "腾讯位置服务";
    }

    @Override
    public boolean configured() {
        return key != null && !key.isBlank() && secretKey != null && !secretKey.isBlank();
    }

    @Override
    public Map<String, Object> geocode(String address, String region) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("address", address);
        if (region != null && !region.isBlank()) params.put("region", region);
        params.put("output", "json");
        try {
            JsonNode result = call("/ws/geocoder/v1", params).path("result");
            JsonNode location = result.path("location");
            if (location.isMissingNode()) return Map.of();
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("lng", location.path("lng").asDouble());
            payload.put("lat", location.path("lat").asDouble());
            payload.put("title", result.path("title").asText(""));
            payload.put("address", result.path("address").asText(""));
            payload.put("district", result.path("address_components").path("district").asText(""));
            return payload;
        } catch (Exception cause) {
            log.warn("腾讯地图地址解析失败：{}", cause.getMessage());
            return Map.of();
        }
    }

    @Override
    public List<Map<String, Object>> suggest(String keyword, String region) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("keyword", keyword);
        if (region != null && !region.isBlank()) params.put("region", region);
        params.put("output", "json");
        try {
            JsonNode data = call("/ws/place/v1/suggestion", params).path("data");
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
            return payload;
        } catch (Exception cause) {
            log.warn("腾讯地图关键词联想失败：{}", cause.getMessage());
            return List.of();
        }
    }

    @Override
    public List<Map<String, Object>> searchPlaces(String name, String city) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("keyword", name);
        if (city != null && !city.isBlank()) params.put("region", city);
        params.put("output", "json");
        params.put("page_size", "5");
        try {
            JsonNode data = call("/ws/place/v1/search", params).path("data");
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
                    // 地点检索返回 polygon 时即为真实多边形，可直接用于园区围栏
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
            return payload;
        } catch (Exception cause) {
            log.warn("腾讯地图地点检索失败：{}", cause.getMessage());
            return List.of();
        }
    }

    /**
     * 调用腾讯位置服务 WebService 接口。
     *
     * @param path 请求路径，如 {@code /ws/geocoder/v1}；签名与请求必须使用同一路径
     */
    private JsonNode call(String path, Map<String, String> params) throws Exception {
        // 1. 按参数名 ASCII 升序，值为原始未编码数据
        Map<String, String> sorted = new TreeMap<>(params);
        sorted.put("key", key);
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

        URI uri = URI.create(HOST + path + "?" + queryForSend + "&sig=" + signature);
        String body = restClient.get().uri(uri).retrieve().body(String.class);
        JsonNode node = json.readTree(body == null ? "{}" : body);
        int status = node.path("status").asInt(-1);
        if (status == 121) throw new MapQuotaExceededException("腾讯位置服务返回 121：此 key 每日调用量已达上限");
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
}
