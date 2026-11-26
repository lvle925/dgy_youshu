import type { MapBaseRenderer, MapFence, MapViewport } from "./mapBase";

/**
 * 腾讯地图 JS API GL 底图适配器。
 *
 * <p>当前项目的临时演示接入。若改用其它服务商，新增一个
 * {@link MapBaseRenderer} 实现并在 {@link MapBaseCanvas} 中按 provider 分发即可，
 * 本文件可整体保留或移除。
 */

const SCRIPT_ID = "tencent-map-gljs";
/**
 * 腾讯地图 JS API 的 Key 会随浏览器请求公开，属于半公开凭据，
 * 仍支持通过 VITE_TENCENT_MAP_KEY 覆盖，以便部署时替换为各自的 Key。
 */
const DEFAULT_KEY = import.meta.env.VITE_TENCENT_MAP_KEY || "6WLBZ-7AMWQ-XED5P-4TMZK-2NLJ7-WYFOM";

declare global {
  interface Window {
    TMap?: any;
  }
}

let loaderPromise: Promise<void> | null = null;

/** 加载腾讯地图 JS API GL 脚本，重复调用共享同一个 Promise。 */
function loadTencentMap(): Promise<void> {
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    if (window.TMap) {
      resolve();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const finish = () => {
      if (window.TMap) resolve();
      else reject(new Error("腾讯地图脚本加载后未暴露 TMap"));
    };
    script.addEventListener("load", finish);
    script.addEventListener("error", () => reject(new Error("腾讯地图脚本加载失败")));
    if (!existing) {
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${DEFAULT_KEY}`;
      document.head.appendChild(script);
    }
  });
  return loaderPromise;
}

/**
 * 创建腾讯地图底图。
 *
 * <p>注意腾讯地图的覆盖物写法约定（踩过坑，务必保持）：
 * <ul>
 *   <li>必须在构造时传 {@code map} 与 {@code geometries}，
 *       用 {@code add()} + {@code addLayer()} 组合会静默不渲染。</li>
 *   <li>{@code paths} 是一维 LatLng 数组，写成嵌套数组会抛
 *       {@code e.flat is not a function}。</li>
 *   <li>几何写成 {@code { geometry: {...}, styleId }} 会抛
 *       {@code Cannot read properties of undefined (reading 'styleId')}。</li>
 * </ul>
 */
export const tencentMapRenderer: MapBaseRenderer = {
  provider: "tencent",
  render: ({ container, center, zoom, onReady, onError }) => {
    let disposed = false;
    loadTencentMap()
      .then(() => {
        if (disposed) return;
        const TMap = window.TMap;
        if (!TMap) throw new Error("腾讯地图 SDK 未就绪");
        const map = new TMap.Map(container, {
          center: new TMap.LatLng(center[1], center[0]),
          zoom,
          pitch: 0,
          rotation: 0,
          baseMap: { type: "vector", features: ["base", "building3d"] },
        });
        const viewport: MapViewport = {
          instance: map,
          projectToContainer: (position) => {
            const point = map.projectToContainer(new TMap.LatLng(position[1], position[0]));
            return { x: point.x, y: point.y };
          },
          unprojectFromContainer: (point) => {
            const result = map.unprojectFromContainer({ x: point.x, y: point.y });
            return [result.lng, result.lat];
          },
          setCenter: (position) => map.setCenter(new TMap.LatLng(position[1], position[0])),
          setZoom: (value) => map.setZoom(value),
          getZoom: () => map.getZoom(),
          onViewportChange: (listener) => {
            map.on("move", listener);
            return () => map.off("move", listener);
          },
          drawFences: (fences: MapFence[]) => {
            const styles = {
              fence: new TMap.PolygonStyle({ color: "rgba(22,82,184,0.16)", showBorder: true, borderColor: "#1652B8", borderWidth: 2 }),
              fenceActive: new TMap.PolygonStyle({ color: "rgba(200,146,46,0.24)", showBorder: true, borderColor: "#C8922E", borderWidth: 2 }),
            };
            const layer = new TMap.MultiPolygon({ id: "park-fences", map, styles, geometries: [] });
            layer.setGeometries(fences.map((fence) => ({
              id: fence.id,
              styleId: fence.active ? "fenceActive" : "fence",
              paths: fence.ring.map(([lng, lat]) => new TMap.LatLng(lat, lng)),
            })));
            return () => { try { layer.destroy?.(); } catch { /* 忽略销毁异常 */ } };
          },
        };
        onReady(viewport);
      })
      .catch((cause) => {
        if (disposed) return;
        onError(cause instanceof Error ? cause.message : "腾讯地图底图加载失败");
      });
  },
};
