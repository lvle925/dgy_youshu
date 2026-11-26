import { useEffect, useRef, useState } from "react";
import type { MapBaseRenderer, MapViewport } from "./mapBase";
import { tencentMapRenderer } from "./tencentMapBase";

/**
 * 地图底图容器：按服务商分发到对应的渲染器。
 *
 * <p>新增服务商时，在下方注册表登记渲染器即可，
 * 业务组件无需感知具体实现。
 */
const RENDERERS: Record<string, MapBaseRenderer> = {
  [tencentMapRenderer.provider]: tencentMapRenderer,
};

/** 当前启用的底图服务商，与后端 app.map.provider 保持一致。 */
const ACTIVE_PROVIDER = import.meta.env.VITE_MAP_PROVIDER || "tencent";

export function MapBaseCanvas({
  center,
  zoom = 12,
  onReady,
  onError,
  className,
}: {
  center: [lng: number, lat: number];
  zoom?: number;
  onReady?: (viewport: MapViewport) => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<MapViewport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    const element = containerRef.current;
    if (!element) return;
    const renderer = RENDERERS[ACTIVE_PROVIDER];
    if (!renderer) {
      setFailed(true);
      onError?.(`未注册的地图底图服务商：${ACTIVE_PROVIDER}`);
      return;
    }
    renderer.render({
      container: element,
      center,
      zoom,
      onReady: (viewport) => {
        if (disposed) return;
        viewportRef.current = viewport;
        onReady?.(viewport);
      },
      onError: (message) => {
        if (disposed) return;
        setFailed(true);
        onError?.(message);
      },
    });
    return () => {
      disposed = true;
      viewportRef.current = null;
      renderer.destroy?.();
    };
    // 底图实例只创建一次，中心与缩放变化由 viewport 驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewportRef.current?.setCenter(center);
  }, [center]);

  return <div
    ref={containerRef}
    className={className ? `map-base-canvas ${className}` : "map-base-canvas"}
    data-failed={failed ? "true" : undefined}
    data-provider={ACTIVE_PROVIDER}
    aria-label="地图底图"
  />;
}
