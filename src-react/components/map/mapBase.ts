/**
 * 地图底图适配器契约。
 *
 * <p>本项目的地图底图当前由腾讯位置服务提供，但这属于**临时演示接入**：
 * 部署到单位环境后很可能改用政务内网 GIS、天地图、高德或自建服务。
 * 因此业务组件（`SpatialMap`）只依赖本接口，不感知具体服务商。
 *
 * <p>实现约定：
 * <ul>
 *   <li>`projectToContainer` / `unprojectFromContainer` 必须互为逆运算，
 *       否则圈选与点位会与底图错位。</li>
 *   <li>返回的坐标单位与容器 CSS 像素一致。</li>
 *   <li>`onViewportChange` 必须在地图移动或缩放时通知订阅方，用于重绘覆盖层。</li>
 * </ul>
 */
export type MapViewport = {
  /** 底层地图实例，供需要直接操作覆盖物图层的场景使用。 */
  instance: any;
  /** 经纬度 → 容器像素。 */
  projectToContainer: (position: [lng: number, lat: number]) => { x: number; y: number };
  /** 容器像素 → 经纬度。 */
  unprojectFromContainer: (point: { x: number; y: number }) => [lng: number, lat: number];
  setCenter: (position: [lng: number, lat: number]) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  /** 订阅地图视口变化，返回取消订阅函数。 */
  onViewportChange: (listener: () => void) => () => void;
  /**
   * 在底图上绘制围栏多边形。
   *
   * <p>由服务商适配器实现各自的图层 API，业务层只提供经纬度环。
   * 未实现时底图不显示围栏，SVG 覆盖层仍会绘制选区。
   *
   * @returns 清理函数，组件卸载时调用；无需清理时返回 undefined
   */
  drawFences?: (fences: MapFence[]) => (() => void) | void;
};

/** 一条围栏：id 用于标识，颜色区分是否落在选区内。 */
export type MapFence = {
  id: string;
  ring: Array<[lng: number, lat: number]>;
  active: boolean;
};

/**
 * 底图渲染器契约。
 *
 * <p>每个服务商提供一个实现，负责加载自己的 SDK、创建地图实例并产出
 * {@link MapViewport}。
 */
export type MapBaseRenderer = {
  /** 服务商标识，如 "tencent"、"amap"。 */
  provider: string;
  /** 渲染底图；就绪后通过 onReady 交付 viewport。 */
  render: (options: {
    container: HTMLElement;
    center: [lng: number, lat: number];
    zoom: number;
    onReady: (viewport: MapViewport) => void;
    onError: (message: string) => void;
  }) => void;
  /** 释放底图占用的资源。 */
  destroy?: () => void;
};
