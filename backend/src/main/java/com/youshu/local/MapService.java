package com.youshu.local;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 地图服务门面。
 *
 * <p>业务层只通过本类访问地图能力，不感知具体服务商。当前注册的服务商是
 * 腾讯位置服务（临时演示接入），后续如需切换到政务内网 GIS、天地图或高德，
 * 只需新增 {@link MapProvider} 实现并加入下方列表，再通过
 * {@code app.map.provider} 指定启用哪一个。
 *
 * <p>本类统一负责两件与服务商无关的事：
 * <ul>
 *   <li><b>结果缓存</b>：免费额度普遍很小，重复查询直接命中缓存。</li>
 *   <li><b>每日预算</b>：接近预算上限时短路，避免把配额浪费在必然失败的请求上。</li>
 * </ul>
 */
@Service
public class MapService {
    private static final Logger log = LoggerFactory.getLogger(MapService.class);
    private static final Duration CACHE_TTL = Duration.ofHours(6);
    private static final int DAILY_BUDGET = 200;

    private final Map<String, MapProvider> providers;

    @Value("${app.map.provider:tencent}")
    private String providerName;

    private final Map<String, CachedValue> cache = new ConcurrentHashMap<>();
    private final AtomicInteger dailyCalls = new AtomicInteger();
    private volatile LocalDate budgetDate = LocalDate.now(ZoneId.of("Asia/Shanghai"));
    private volatile boolean quotaExhausted;

    private record CachedValue(Instant expiresAt, Object payload) {}

    public MapService(List<MapProvider> availableProviders) {
        this.providers = new ConcurrentHashMap<>();
        for (MapProvider provider : availableProviders) {
            this.providers.put(provider.name(), provider);
        }
    }

    /** 当前启用的服务商；配置缺失或未注册时回退到第一个已注册的实现。 */
    public MapProvider provider() {
        MapProvider selected = providers.get(providerName);
        if (selected != null) return selected;
        return providers.values().stream()
            .filter(MapProvider::configured)
            .findFirst()
            .orElseGet(() -> providers.values().stream().findFirst().orElse(null));
    }

    /** 是否具备可用地图能力（服务商已注册且凭据齐备）。 */
    public boolean configured() {
        MapProvider current = provider();
        return current != null && current.configured();
    }

    /** 服务商标识，供前端展示与日志。 */
    public String providerName() {
        MapProvider current = provider();
        return current == null ? "offline" : current.name();
    }

    /** 服务商展示名。 */
    public String providerDisplayName() {
        MapProvider current = provider();
        return current == null ? "离线示意底图" : current.displayName();
    }

    public Map<String, Object> geocode(String address, String region) {
        if (address == null || address.isBlank() || !configured()) return Map.of();
        String cacheKey = "geo:" + region + ":" + address.trim();
        Object cached = readCache(cacheKey);
        if (cached instanceof Map<?, ?> map) return castMap(map);
        if (!budgetAvailable()) return Map.of();
        Map<String, Object> result = invoke("地址解析", () -> provider().geocode(address.trim(), region));
        if (result == null) return Map.of();
        if (!result.isEmpty()) writeCache(cacheKey, result);
        return result;
    }

    public List<Map<String, Object>> suggest(String keyword, String region) {
        if (keyword == null || keyword.isBlank() || !configured()) return List.of();
        String cacheKey = "sug:" + region + ":" + keyword.trim();
        Object cached = readCache(cacheKey);
        if (cached instanceof List<?> list) return castList(list);
        if (!budgetAvailable()) return List.of();
        List<Map<String, Object>> result = invoke("关键词联想", () -> provider().suggest(keyword.trim(), region));
        if (result == null) return List.of();
        if (!result.isEmpty()) writeCache(cacheKey, result);
        return result;
    }

    public List<Map<String, Object>> searchPlaces(String name, String city) {
        if (name == null || name.isBlank() || !configured()) return List.of();
        String cacheKey = "place:" + city + ":" + name.trim();
        Object cached = readCache(cacheKey);
        if (cached instanceof List<?> list) return castList(list);
        if (!budgetAvailable()) return List.of();
        List<Map<String, Object>> result = invoke("地点检索", () -> provider().searchPlaces(name.trim(), city));
        if (result == null) return List.of();
        if (!result.isEmpty()) writeCache(cacheKey, result);
        return result;
    }

    /**
     * 每日预算是否仍然可用。
     * 服务商返回配额耗尽信号后会短路到次日预算重置为止。
     */
    private boolean budgetAvailable() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        if (!today.equals(budgetDate)) {
            budgetDate = today;
            dailyCalls.set(0);
            quotaExhausted = false;
        }
        return !quotaExhausted && dailyCalls.get() < DAILY_BUDGET;
    }

    /** 记录一次实际发出的远程请求。 */
    private void countRemoteCall() {
        dailyCalls.incrementAndGet();
    }

    /**
     * 执行一次远程查询，统一处理计数与配额耗尽信号。
     */
    private <T> T invoke(String operation, RemoteCall<T> call) {
        countRemoteCall();
        try {
            return call.execute();
        } catch (MapQuotaExceededException cause) {
            quotaExhausted = true;
            log.warn("地图服务配额已耗尽，后续{}请求将短路至次日", operation);
            return null;
        }
    }

    @FunctionalInterface
    private interface RemoteCall<T> {
        T execute();
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

    private static Map<String, Object> castMap(Map<?, ?> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        source.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> castList(List<?> source) {
        return (List<Map<String, Object>>) source;
    }
}
