# 腾讯位置服务接入契约（实测确认）

> **重要：腾讯地图只是当前演示用的临时服务商，不是项目绑定依赖。**
> 业务层通过 `MapProvider`（服务端）与 `MapBaseRenderer`（前端）两层契约访问地图能力，
> 腾讯实现位于这两层契约之下。部署到单位环境后如需改用政务内网 GIS、天地图、高德或自建服务，
> 新增一个实现并切换配置即可，业务页面与接口无需改动。替换步骤见文末「可替换服务商架构」。

密钥：
- Key（前端 JS API + 后端 WebService）：见 `.env` 的 `TENCENT_MAP_KEY`
- SecretKey（仅后端签名用，**禁止进入前端代码**）：见 `.env` 的 `TENCENT_MAP_SECRET_KEY`

> 本文档刻意不记录真实密钥值。密钥只允许存在于本机 `.env` 与部署环境的密钥管理中；
> `.env` 已被 `.gitignore` 忽略，不会进入版本库。

环境变量名：`TENCENT_MAP_KEY` / `TENCENT_MAP_SECRET_KEY`

## WebService 签名算法（官方 GET 方法）

```
sig = md5(请求路径 + "?" + 按参数名升序拼接的原始参数串 + SecretKey)
```

要点（踩过的坑）：
1. **路径**：`/ws/geocoder/v1` 与 `/ws/geocoder/v1/` 均可，但签名用的路径必须与实际请求路径一致。
2. **参数排序**：按参数名 ASCII 升序。
3. **参数值用原始未编码数据**参与签名；**实际发请求时**才把参数值做 URL 编码（UTF-8，空格转 `%20` 不是 `+`）。
4. `sig` 本身不参与签名；最终 URL 为 `...?参数&sig=<sig>`。
5. 错误形式：`SK+query+SK` 与 `URI+query+sig=SK` 都是错的，会返回 `status: 111`。

参考实现：`backend/src/main/java/com/youshu/local/TencentMapProvider.java`

## 错误码

| status | 含义 |
| --- | --- |
| 0 | 成功 |
| 110 | 请求来源未被授权（Key 域名白名单） |
| 111 | 签名验证失败 |
| 112 | IP 未被授权 |
| 121 | 此 key 每日调用量已达上限 |

## 配额现状（2026-11-26 实测）

Key 的 WebService 配额**极小**，连续调用十几次即触发 `status 121`。
- 因此所有查询必须**服务端缓存**（当前实现 TTL 6 小时）。
- 配额按接口独立计算，`geocoder`、`place/search`、`place/suggestion` 各自受限。
- `place/suggestion` 需要 `boundary` 或 `region` 参数。
- **JS API（底图瓦片）不受 WebService 配额限制**，可正常使用。

## JS API GL 实测契约

脚本地址：`https://map.qq.com/api/gljs?v=1.exp&key=<KEY>`（版本 1.8.3.2）

### 坐标换算（最关键）

```js
const screenPoint = map.projectToContainer(latLng);   // {x, y} 容器像素
const latLng = map.unprojectFromContainer({x, y});     // 反向
```
往返精度 1e-14，可放心用于围栏对齐。

注意：**没有** `map.project()` / `map.unproject()` / `map.getLayers()` / `map.getElement()` 这些方法。

### MultiPolygon（多边形围栏）

**必须用官方写法**——构造时直接传 `map` 与 `geometries`，`paths` 是**一维 LatLng 数组**：

```js
new TMap.MultiPolygon({
  id: "polygon-layer",
  map: map,
  styles: {
    polygon: new TMap.PolygonStyle({
      color: "rgba(22,82,184,0.18)",
      showBorder: true,
      borderColor: "#1652B8",
      borderWidth: 2,
    }),
  },
  geometries: [
    { id: "p1", styleId: "polygon", paths: [new TMap.LatLng(lat, lng), ...] },
  ],
});
```

踩过的坑（都会导致**静默不渲染**，不报错）：
- `add()` + `map.addLayer()` 组合 → 不渲染。必须构造时传 `map`。
- `paths` 写成二维 `[[LatLng...]]` → 不渲染。必须一维。
- 几何写成 `{ geometry: {...}, styleId }` → 抛 `Cannot read properties of undefined (reading 'styleId')`。
- 样式键名必须是几何 `styleId` 能匹配到的；用 `default` 作兜底键最稳妥。

### MultiPolyline（折线）

```js
new TMap.MultiPolyline({
  map: map,
  styles: { line: new TMap.PolylineStyle({ color: "#1652B8", width: 4 }) },
  geometries: [{ id: "pl1", styleId: "line", paths: [new TMap.LatLng(...), ...] }],
});
```
注意 `paths` 同样是**一维** LatLng 数组；传嵌套数组会抛 `e.flat is not a function`。

### MultiMarker（标记）

```js
new TMap.MultiMarker({
  map: map,
  styles: { pin: new TMap.MarkerStyle({ width: 24, height: 24, anchor: { x: 12, y: 24 }, src: "..." }) },
  geometries: [{ id: "m1", position: new TMap.LatLng(lat, lng), styleId: "pin" }],
});
```

## 底图实测效果

`new TMap.Map(container, { center: new TMap.LatLng(31.2053, 121.6143), zoom: 12 })`
渲染出完整真实瓦片：路网、河道、POI 标注、缩放控件与版权标识，区域与张江高科完全对应。

## 可替换服务商架构

腾讯实现被隔离在两层契约之下，其余代码只依赖契约：

| 层 | 契约 | 当前实现 | 门面/分发 |
| --- | --- | --- | --- |
| 服务端 | `backend/.../MapProvider.java` | `TencentMapProvider.java` | `MapService.java` |
| 前端 | `src-react/components/map/mapBase.ts` | `tencentMapBase.tsx` | `MapBaseCanvas.tsx` |

统一返回结构由契约固定，因此换服务商时调用方零改动：

- `geocode(address, region)` → `{ lng, lat, title, address, district }`
- `suggest(keyword, region)` → `[{ title, address, district, lng, lat }]`
- `searchPlaces(name, city)` → `[{ id, title, address, lng, lat, polygon? }]`
- `MapViewport` → `projectToContainer` / `unprojectFromContainer` / `setCenter` / `setZoom` /
  `getZoom` / `onViewportChange` / `drawFences`

`MapService` 统一处理与服务商无关的两件事：查询结果缓存（TTL 6 小时）与每日预算（200 次）。
服务商把各自的配额耗尽错误码转换成契约异常 `MapQuotaExceededException`，门面捕获后熔断到次日，
不感知具体服务商。

### 新增其它服务商

1. 服务端新建类实现 `MapProvider`，实现 `name()` / `displayName()` / `configured()` 及三个查询方法；
   加 `@Component` 后会被 `MapService` 构造函数自动注册。
2. 前端新建 `xxxMapBase.ts`，导出 `MapBaseRenderer` 实现，提供同一套 `MapViewport` 方法。
3. 在 `src-react/components/map/MapBaseCanvas.tsx` 的 `RENDERERS` 注册表加一行。
4. 配置 `MAP_PROVIDER=<新服务商 name>` 与 `VITE_MAP_PROVIDER=<同一 name>`。
5. 若新服务商不需要前端 JS API（例如纯内网 GIS 返回瓦片地址），保留一个空实现也可，
   离线示意底图仍可用。

### 切换方式

```dotenv
# 服务端选择 WebService 服务商，前端选择底图渲染器，两者名称保持一致
MAP_PROVIDER=tencent
VITE_MAP_PROVIDER=tencent
```

不配置任何凭据时 `/api/geo/status` 返回 `configured=false`，前端自动回退到离线 SVG 示意底图，
页面仍可完整操作（定位与围栏使用本地示例数据）。

## 相关文件

- 服务端契约：`backend/src/main/java/com/youshu/local/MapProvider.java`
- 服务端配额异常：`backend/src/main/java/com/youshu/local/MapQuotaExceededException.java`
- 服务端门面：`backend/src/main/java/com/youshu/local/MapService.java`
- 腾讯服务端实现：`backend/src/main/java/com/youshu/local/TencentMapProvider.java`
- 后端接口：`backend/src/main/java/com/youshu/local/GeoController.java`
- 前端契约：`src-react/components/map/mapBase.ts`
- 前端分发：`src-react/components/map/MapBaseCanvas.tsx`
- 腾讯前端实现：`src-react/components/map/tencentMapBase.tsx`
- 前端封装：`src/api.js`（`geoStatus` / `geoGeocode` / `geoSuggest` / `geoParkBoundary`）
