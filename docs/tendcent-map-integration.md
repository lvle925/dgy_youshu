# 腾讯位置服务接入契约（实测确认）

密钥：
- Key（前端 JS API + 后端 WebService）：`6WLBZ-7AMWQ-XED5P-4TMZK-2NLJ7-WYFOM`
- SecretKey（仅后端签名用，**禁止进入前端代码**）：`y9g2DszRXc4B3TwGLoXZF8BNSAJvRna0`

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

参考实现：`backend/src/main/java/com/youshu/local/TencentMapService.java`

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

## 相关文件

- 后端签名与调用：`backend/src/main/java/com/youshu/local/TencentMapService.java`
- 后端接口：`backend/src/main/java/com/youshu/local/GeoController.java`
- 前端封装：`src/api.js`（`geoStatus` / `geoGeocode` / `geoSuggest` / `geoParkBoundary`）
