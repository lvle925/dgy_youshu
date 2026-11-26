package com.youshu.local;

import java.util.List;
import java.util.Map;

/**
 * 地图服务提供者契约。
 *
 * <p>本项目的地图能力目前由腾讯位置服务提供，但该接入属于**临时演示方案**：
 * 部署到单位环境后，很可能改用政务内网 GIS 服务、天地图、高德或自建服务。
 * 因此业务层只依赖本接口，不感知具体服务商；更换服务商时新增一个实现即可，
 * 调用方（{@link GeoController}）无需改动。
 *
 * <p>实现约定：
 * <ul>
 *   <li>实现类只负责"把请求发出去、把结果解析成统一结构"，不负责缓存与限流，
 *       这两项由 {@link MapService} 统一处理。</li>
 *   <li>所有实现必须是无状态的（可安全复用为单例）。</li>
 *   <li>凭据只从服务端配置读取，禁止进入前端代码。</li>
 * </ul>
 */
public interface MapProvider {

    /** 服务商标识，用于日志与前端展示，如 "tencent"、"amap"、"internal-gis"。 */
    String name();

    /** 展示名称，用于前端提示。 */
    String displayName();

    /** 是否已配置可用凭据。未配置时地图回退到离线示意底图。 */
    boolean configured();

    /**
     * 地址解析：把地址或地名解析为经纬度。
     *
     * @return {@code {lng, lat, title, address, district}}；无法解析时返回空 Map
     */
    Map<String, Object> geocode(String address, String region);

    /**
     * 关键词联想：返回候选地点列表。
     *
     * @return 元素包含 {@code title, address, district, lng, lat}；无结果时返回空列表
     */
    List<Map<String, Object>> suggest(String keyword, String region);

    /**
     * 园区边界查询：返回该园区/地点的候选记录。
     *
     * <p>元素包含 {@code id, title, address, lng, lat}；
     * 服务商提供真实多边形时，额外包含 {@code polygon}，为 GeoJSON 环的
     * {@code [[lng, lat], ...]} 坐标数组。
     *
     * @return 无结果时返回空列表
     */
    List<Map<String, Object>> searchPlaces(String name, String city);
}
