import { useEffect, useRef, useState } from "react";

/**
 * 腾讯地图底图容器。
 *
 * 只负责渲染真实瓦片底图；园区围栏、点位与圈选仍由上层 SVG 覆盖层绘制，
 * 以保持既有 GeoJSON 契约与坐标换算逻辑不变。
 */

const SCRIPT_ID = "tencent-map-gljs";
/**
 * 腾讯地图 JS API 的 Key 会随浏览器请求公开，属于半公开凭据，
 * 仍支持通过 VITE_TENCENT_MAP_KEY 覆盖，以便部署时替换为各自的 Key。
 */
const DEFAULT_KEY = import.meta.env.VITE_TENCENT_MAP_KEY || "6WLBZ-7AMWQ-XED5P-4TMZK-2NLJ7-WYFOM";

type LatLngTuple = [lng: number, lat: number];

declare global {
  interface Window {
    TMap?: any;
    __qqMapReady?: Promise<void>;
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

export type TencentMapHandle = {
  /** 底层 TMap.Map 实例，用于创建多边形等覆盖物图层。 */
  instance: any;
  projectToContainer: (position: LatLngTuple) => { x: number; y: number };
  unprojectFromContainer: (point: { x: number; y: number }) => LatLngTuple;
  setCenter: (position: LatLngTuple) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  /** 订阅地图视口变化（移动/缩放），返回取消订阅函数。 */
  onViewportChange: (listener: () => void) => () => void;
};

export function TencentMapCanvas({
  center,
  zoom = 12,
  onReady,
  onError,
  className,
}: {
  center: LatLngTuple;
  zoom?: number;
  onReady?: (handle: TencentMapHandle) => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    const element = containerRef.current;
    if (!element) return;

    loadTencentMap()
      .then(() => {
        if (disposed || !element) return;
        const TMap = window.TMap;
        if (!TMap) throw new Error("腾讯地图 SDK 未就绪");
        const map = new TMap.Map(element, {
          center: new TMap.LatLng(center[1], center[0]),
          zoom,
          pitch: 0,
          rotation: 0,
          baseMap: { type: "vector", features: ["base", "building3d"] },
        });
        mapRef.current = map;
        const handle: TencentMapHandle = {
          instance: map,
          projectToContainer: (position) => {
            const point = map.projectToContainer(new TMap.LatLng(position[1], position[0]));
            return { x: point.x, y: point.y };
          },
          unprojectFromContainer: (point) => {
            const result = map.unprojectFromContainer({ x: point.x, y: point.y });
            return [result.lng, result.lat] as LatLngTuple;
          },
          setCenter: (position) => map.setCenter(new TMap.LatLng(position[1], position[0])),
          setZoom: (value) => map.setZoom(value),
          getZoom: () => map.getZoom(),
          onViewportChange: (listener) => {
            map.on("move", listener);
            return () => map.off("move", listener);
          },
        };
        onReady?.(handle);
      })
      .catch((cause) => {
        if (disposed) return;
        setFailed(true);
        onError?.(cause instanceof Error ? cause.message : "腾讯地图底图加载失败");
      });

    return () => {
      disposed = true;
      try {
        mapRef.current?.destroy?.();
      } catch {
        // 组件卸载时忽略销毁异常
      }
      mapRef.current = null;
    };
    // 底图实例只创建一次，中心与缩放变化由外部 handle 驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.TMap) return;
    map.setCenter(new window.TMap.LatLng(center[1], center[0]));
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(zoom);
  }, [zoom]);

  return <div
    ref={containerRef}
    className={className ? `tencent-map-canvas ${className}` : "tencent-map-canvas"}
    data-failed={failed ? "true" : undefined}
    aria-label="腾讯地图底图"
  />;
}
