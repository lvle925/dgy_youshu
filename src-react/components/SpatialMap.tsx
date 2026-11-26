import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Hand, MapPin, Pentagon, RotateCcw, Square, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapBaseCanvas } from "@/components/map/MapBaseCanvas";
import type { MapViewport } from "@/components/map/mapBase";

export type ScreenPoint = { x: number; y: number };
export type GeoPosition = [lng: number, lat: number];
export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoPosition[][];
};
export type SpatialFeature<Geometry = { type: "Point"; coordinates: GeoPosition } | GeoJsonPolygon> = {
  type: "Feature";
  geometry: Geometry;
  properties: Record<string, unknown> & { id: string };
};
export type SpatialFeatureCollection = { type: "FeatureCollection"; features: SpatialFeature[] };
export type ParkPoint = { id: string; name: string; district: string; industry: string; enterprises: number; position: GeoPosition };
type Tool = "pan" | "polygon" | "rectangle";
export type Boundary = SpatialFeature<GeoJsonPolygon> & { properties: { id: string; selectionTool: "polygon" | "rectangle" } };

const MAP_BOUNDS = { west: 121.15, east: 121.9, south: 30.86, north: 31.42 };
const SCREEN_BOUNDS = { left: 6, right: 94, top: 6, bottom: 94 };

/** 离线示意地图的线性投影：经纬度 → viewBox 0-100 空间。 */
function project(position: GeoPosition): ScreenPoint {
  const [lng, lat] = position;
  return {
    x: SCREEN_BOUNDS.left + (lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west) * (SCREEN_BOUNDS.right - SCREEN_BOUNDS.left),
    y: SCREEN_BOUNDS.bottom - (lat - MAP_BOUNDS.south) / (MAP_BOUNDS.north - MAP_BOUNDS.south) * (SCREEN_BOUNDS.bottom - SCREEN_BOUNDS.top),
  };
}

function unproject(point: ScreenPoint): GeoPosition {
  return [
    MAP_BOUNDS.west + (point.x - SCREEN_BOUNDS.left) / (SCREEN_BOUNDS.right - SCREEN_BOUNDS.left) * (MAP_BOUNDS.east - MAP_BOUNDS.west),
    MAP_BOUNDS.south + (SCREEN_BOUNDS.bottom - point.y) / (SCREEN_BOUNDS.bottom - SCREEN_BOUNDS.top) * (MAP_BOUNDS.north - MAP_BOUNDS.south),
  ];
}

function boundaryPoints(boundary: Boundary | null): GeoPosition[] {
  if (!boundary) return [];
  return boundary.geometry.coordinates[0]?.slice(0, -1) ?? [];
}

/**
 * 判断经纬度是否落在选区内。
 *
 * 运算全部在经纬度空间完成，与具体投影方式无关，
 * 因此离线示意底图与腾讯地图真实底图可以共用同一套判定口径。
 */
export function containsPoint(boundary: Boundary | null, position: GeoPosition) {
  if (!boundary) return true;
  const ring = boundaryPoints(boundary);
  if (ring.length < 2) return true;
  const [lng, lat] = position;
  if (boundary.properties.selectionTool === "rectangle") {
    const lngs = ring.map((point) => point[0]);
    const lats = ring.map((point) => point[1]);
    return lng >= Math.min(...lngs) && lng <= Math.max(...lngs)
      && lat >= Math.min(...lats) && lat <= Math.max(...lats);
  }
  if (ring.length < 3) return true;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    const cross = (lng - a[0]) * (b[1] - a[1]) - (lat - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < 1e-12 && lng >= Math.min(a[0], b[0]) && lng <= Math.max(a[0], b[0])
      && lat >= Math.min(a[1], b[1]) && lat <= Math.max(a[1], b[1])) return true;
    if ((a[1] > lat) !== (b[1] > lat) && lng < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** 园区示意围栏的经纬度偏移，与投影方式无关。 */
const FENCE_OFFSET = { lng: 0.03, lat: 0.025 };
const FENCE_SHAPE: Array<[number, number]> = [
  [-1, -0.85], [0.72, -1], [1, 0.22], [0.48, 0.86], [-0.84, 0.72],
];

function fencePolygon(position: GeoPosition): GeoPosition[] {
  return FENCE_SHAPE.map(([dx, dy]) => [
    position[0] + dx * FENCE_OFFSET.lng,
    position[1] + dy * FENCE_OFFSET.lat,
  ]);
}

const roads = [
  "M-10 21 25 20 38 32 58 36 76 32 110 33", "M-10 70 17 64 38 63 59 58 79 57 108 44",
  "M-10 86 20 80 39 83 58 76 75 80 110 73", "M8 -8 12 25 22 43 25 74 31 109",
  "M26 -6 29 17 33 26 39 45 40 73 47 108", "M63 -8 61 19 68 43 63 61 70 84 73 108",
  "M83 -4 82 24 88 45 83 68 88 102", "M-5 43 14 37 33 39 48 47 69 46 95 52 107 49",
  "M1 7 19 5 38 12 51 12 73 8 101 12", "M49 0 46 17 52 33 49 55 52 90 54 102",
  "M-8 54 14 51 29 51 43 55 58 50 81 48 111 54", "M1 94 25 89 51 94 81 91 111 87",
  "M0 29 15 30 30 29 45 32 57 27 72 26 100 20", "M16 0 19 17 17 31 13 53 16 71 20 100",
  "M93 0 91 18 95 42 96 65 92 87 96 100", "M72 0 72 20 78 38 77 64 77 86 80 100",
];
const water = "M43 -6 C43 9 50 15 52 22 C58 38 52 42 55 52 C59 67 70 61 68 75 C65 85 82 94 89 108";
const boundaryPath = (points: ScreenPoint[]) => points.map(({ x, y }) => x + "," + y).join(" ");
const zero = { x: 0, y: 0 };

function BaseMap() {
  return <>
    <rect x="-100" y="-100" width="300" height="300" fill="#e9edf0" />
    <g fill="#e0e7e5">
      <path d="M6 12 27 9 24 22 9 25Z M3 73 21 69 21 78 5 83Z M72 11 90 8 89 22 75 24Z M73 85 87 83 92 93 77 96Z" />
    </g>
    <g className="spatial-roads">{roads.map(road => <path key={road} d={road} />)}</g>
    <path d={water} className="spatial-water-outline" /><path d={water} className="spatial-water" />
    <path d="M-1 57 C15 48 24 54 34 49 S48 45 55 48" className="spatial-stream" />
  </>;
}

/**
 * 在真实底图上绘制园区围栏。
 * 围栏优先使用后端返回的真实边界，缺失时回退到园区点位偏移示意。
 * 具体绘制方式由地图适配层决定，业务层只提供经纬度环。
 */
function useMapLayers(
  handle: MapViewport | null,
  parks: ParkPoint[],
  realFences: Map<string, GeoPosition[]>,
  boundary: Boundary | null,
) {
  useEffect(() => {
    if (!handle?.drawFences) return;
    const fences = parks.map((park) => {
      const real = realFences.get(park.id);
      const ring = real && real.length >= 3 ? real : fencePolygon(park.position);
      return { id: park.id, ring, active: containsPoint(boundary, park.position) };
    });
    const cleanup = handle.drawFences(fences);
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [handle, parks, realFences, boundary]);
}

/**
 * 依据点位分布推算合适的初始缩放级别。
 * 腾讯地图 zoom 越大越局部，需保证所有园区都能落在可视区内。
 */
function fitZoom(positions: GeoPosition[]): number {
  if (positions.length < 2) return 13;
  const lngs = positions.map((position) => position[0]);
  const lats = positions.map((position) => position[1]);
  const span = Math.max(Math.max(...lngs) - Math.min(...lngs), Math.max(...lats) - Math.min(...lats));
  // 实测 765×648 容器在 zoom 10 下可容纳约 0.6° 经度跨度，这里留一档余量。
  if (span > 0.5) return 9;
  if (span > 0.25) return 10;
  if (span > 0.1) return 11;
  if (span > 0.04) return 12;
  if (span > 0.015) return 13;
  return 14;
}

export function SpatialMap({ parks, selected, onSelect, boundary = null, onBoundary, compact = false, focusPosition = null, focusKey, onBoundaryComplete, realFences, useRealBaseMap = false, mapCenter, mapZoom }: {
  parks: ParkPoint[];
  selected?: string;
  onSelect: (park: ParkPoint) => void;
  boundary?: Boundary | null;
  onBoundary?: (boundary: Boundary | null) => void;
  compact?: boolean;
  focusPosition?: GeoPosition | null;
  focusKey?: string | number;
  onBoundaryComplete?: () => void;
  /** 园区真实边界，key 为园区 id，值为 GeoJSON 环坐标。 */
  realFences?: Map<string, GeoPosition[]>;
  /** 是否启用真实地图底图（服务商由地图适配层决定）。 */
  useRealBaseMap?: boolean;
  mapCenter?: GeoPosition;
  mapZoom?: number;
}) {
  const [tool, setTool] = useState<Tool>("pan");
  const [offset, setOffset] = useState(zero);
  const [anchor, setAnchor] = useState<ScreenPoint | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [preview, setPreview] = useState<ScreenPoint | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [mapHandle, setMapHandle] = useState<MapViewport | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  /** 地图视口变化计数，用于在移动/缩放后重算点位与选区坐标。 */
  const [viewportTick, setViewportTick] = useState(0);

  const useRealMap = Boolean(useRealBaseMap) && !compact && !mapFailed;
  const fenceMap = useMemo(() => realFences ?? new Map<string, GeoPosition[]>(), [realFences]);
  const center = mapCenter ?? (parks[0]?.position ?? [121.6143, 31.2053] as GeoPosition);
  const initialZoom = useMemo(
    () => mapZoom ?? fitZoom(parks.map((park) => park.position)),
    [mapZoom, parks],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setFrame({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * 坐标适配器：离线示意底图用 viewBox 0-100 线性映射，
   * 真实底图用腾讯地图的墨卡托投影，两者输出同一套 SVG 坐标。
   */
  const viewBoxSize = useRealMap
    ? { width: frame.width || 765, height: frame.height || 648 }
    : { width: 100, height: 100 };

  const toScreen = useCallback((position: GeoPosition): ScreenPoint => {
    if (useRealMap && mapHandle) {
      const point = mapHandle.projectToContainer(position);
      return { x: point.x, y: point.y };
    }
    void viewportTick;
    return project(position);
  }, [useRealMap, mapHandle, viewportTick]);

  const fromScreen = useCallback((point: ScreenPoint): GeoPosition => {
    void viewportTick;
    if (useRealMap && mapHandle) return mapHandle.unprojectFromContainer(point);
    return unproject(point);
  }, [useRealMap, mapHandle, viewportTick]);

  useEffect(() => {
    if (!focusPosition || compact || !mapHandle) return;
    // 定位后居中，但不放大超过可容纳全部园区的级别，避免部分点位飞出视野。
    mapHandle.setZoom(initialZoom);
    mapHandle.setCenter(focusPosition);
  }, [focusKey, compact, mapHandle, initialZoom]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || compact || useRealMap) return;
    const onWheel = (event: WheelEvent) => {
      if (anchor) return;
      event.preventDefault();
      setZoom((current) => Math.max(0.8, Math.min(2.5, Number((current + (event.deltaY < 0 ? 0.2 : -0.2)).toFixed(1)))));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [anchor, compact, useRealMap]);

  useMapLayers(mapHandle, useRealMap ? parks : [], fenceMap, boundary);

  // 地图移动或缩放后，腾讯地图的投影结果会变化，需要重绘覆盖层与点位。
  useEffect(() => {
    if (!mapHandle) return;
    return mapHandle.onViewportChange(() => setViewportTick((value) => value + 1));
  }, [mapHandle]);

  /** 客户端坐标 → SVG viewBox 坐标。 */
  function clientToViewBox(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const scaleX = box.width ? viewBoxSize.width / box.width : 1;
    const scaleY = box.height ? viewBoxSize.height / box.height : 1;
    return {
      x: (event.clientX - box.left) * scaleX,
      y: (event.clientY - box.top) * scaleY,
    };
  }

  /** SVG viewBox 坐标 → 选区用的屏幕坐标（离线模式需扣除缩放与平移）。 */
  function screenCoordinates(event: PointerEvent<SVGSVGElement>) {
    const point = clientToViewBox(event);
    if (useRealMap) return point;
    return {
      x: 50 + (point.x - offset.x - 50) / zoom,
      y: 50 + (point.y - offset.y - 50) / zoom,
    };
  }

  function clampOffset(next: ScreenPoint) {
    // shortcut: 拖拽最多让底图移出可视区 25%，缩放越大允许的余量越多
    const limit = 25 + 45 * (zoom - 1);
    return {
      x: Math.max(-limit, Math.min(limit, next.x)),
      y: Math.max(-limit, Math.min(limit, next.y)),
    };
  }

  function createBoundaryFromScreen(nextTool: Tool, points: ScreenPoint[]): Boundary {
    const [first, second] = points;
    const screenPoints = nextTool === "rectangle" && first && second
      ? [first, { x: second.x, y: first.y }, second, { x: first.x, y: second.y }]
      : points;
    const coordinates = screenPoints.map(fromScreen);
    if (coordinates.length) coordinates.push(coordinates[0]);
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coordinates] },
      properties: { id: "selection", selectionTool: nextTool === "rectangle" ? "rectangle" : "polygon" },
    };
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (compact || event.button !== 0 || !onBoundary) return;
    const point = screenCoordinates(event);
    if (tool === "polygon") {
      const points = drawing && boundary ? [...boundaryPoints(boundary).map(toScreen), point] : [point];
      onBoundary(createBoundaryFromScreen("polygon", points));
      setDrawing(true);
    } else {
      event.currentTarget.setPointerCapture(event.pointerId);
      setAnchor(tool === "pan" ? clientToViewBox(event) : point);
      if (tool === "rectangle") onBoundary(createBoundaryFromScreen("rectangle", [point, point]));
    }
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    if (compact) return;
    if (!anchor) {
      if (tool === "polygon" && drawing) setPreview(screenCoordinates(event));
      return;
    }
    if (tool === "rectangle") onBoundary?.(createBoundaryFromScreen("rectangle", [anchor, screenCoordinates(event)]));
    if (tool === "pan" && !useRealMap) {
      const point = clientToViewBox(event);
      setOffset((current) => clampOffset({ x: current.x + point.x - anchor.x, y: current.y + point.y - anchor.y }));
      setAnchor(point);
    }
  }

  function choose(next: Tool) {
    setTool(next);
    setAnchor(null);
    setDrawing(false);
    setPreview(null);
    if (next !== "pan") onBoundary?.(null);
  }

  function undoPoint() {
    const points = boundaryPoints(boundary);
    if (points.length === 0) return;
    const rest = points.slice(0, -1);
    if (rest.length < 3) {
      onBoundary?.(null);
      setDrawing(false);
      return;
    }
    const coordinates = [...rest, rest[0]];
    onBoundary?.({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coordinates] },
      properties: { id: "selection", selectionTool: "polygon" },
    });
  }

  function clearSelection() {
    onBoundary?.(null);
    setDrawing(false);
    setPreview(null);
    setAnchor(null);
  }

  function finish() {
    if (boundaryPoints(boundary).length < 3) onBoundary?.(null);
    else onBoundaryComplete?.();
    setDrawing(false);
    setPreview(null);
  }

  function endSelection() {
    setAnchor(null);
    if (tool !== "rectangle" || !boundary || boundary.properties.selectionTool !== "rectangle") return;
    const points = boundaryPoints(boundary).map(toScreen);
    const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
    const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
    if (width >= 1 && height >= 1) onBoundaryComplete?.();
  }

  const selectionRing = boundaryPoints(boundary).map(toScreen);
  const rectangle = boundary?.properties.selectionTool === "rectangle" ? selectionRing : [];
  const rectangleX = rectangle.map((point) => point.x);
  const rectangleY = rectangle.map((point) => point.y);
  const polygon = boundary?.properties.selectionTool === "polygon" ? selectionRing : [];
  const previewRing = drawing && polygon.length > 0 && preview
    ? [...polygon, preview]
    : polygon;
  const hint = tool === "polygon"
    ? drawing
      ? "依次点击至少三个顶点"
      : boundary
        ? "圈选已完成，园区与企业已按范围筛选"
        : "点击地图添加圈选顶点"
    : tool === "rectangle"
      ? boundary && !anchor
        ? "框选已完成，园区与企业已按范围筛选"
        : "按住并拖出选区"
      : useRealMap
        ? "拖动地图或选择园区浏览"
        : "拖动地图或选择园区浏览";

  /** 离线模式：viewBox 坐标 → 容器百分比位置。 */
  function markerStyle(point: ScreenPoint) {
    const width = frame.width || 1;
    const height = frame.height || 1;
    const scale = compact ? { scaleX: width / 100, scaleY: height / 100, left: 0, top: 0 } : (() => {
      const s = Math.min(width, height) / 100;
      return { scaleX: s, scaleY: s, left: (width - 100 * s) / 2, top: (height - 100 * s) / 2 };
    })();
    const x = scale.left + (50 + (point.x - 50) * zoom + offset.x) * scale.scaleX;
    const y = scale.top + (50 + (point.y - 50) * zoom + offset.y) * scale.scaleY;
    return { left: `${(x / width) * 100}%`, top: `${(y / height) * 100}%` };
  }

  /** 真实底图模式：直接使用腾讯地图的像素投影，保证与底图严格对齐。 */
  const realMarkerStyle = useCallback((park: ParkPoint) => {
    // viewportTick 参与依赖，确保地图移动后重新计算投影结果。
    void viewportTick;
    const point = mapHandle
      ? mapHandle.projectToContainer(park.position)
      : project(park.position);
    return { left: `${point.x}px`, top: `${point.y}px` };
  }, [mapHandle, viewportTick]);

  const handleMapReady = useCallback((handle: MapViewport) => {
    setMapHandle(handle);
  }, []);

  return <div ref={containerRef} className={compact ? "spatial-map spatial-map--compact" : "spatial-map os-glass-card"} data-tool={tool} data-base-map={useRealMap ? "real" : "offline"}>
    {useRealMap && <MapBaseCanvas
      className="spatial-map-base"
      center={center}
      zoom={initialZoom}
      onReady={handleMapReady}
      onError={() => setMapFailed(true)}
    />}
    <svg ref={svgRef}
      viewBox={useRealMap ? `0 0 ${viewBoxSize.width} ${viewBoxSize.height}` : "0 0 100 100"}
      preserveAspectRatio={compact || useRealMap ? "none" : "xMidYMid meet"}
      className="spatial-map-canvas"
      style={useRealMap && tool === "pan" ? { pointerEvents: "none" } : undefined}
      aria-label="园区路网与电子围栏示意"
      onPointerDown={start} onPointerMove={move} onPointerUp={endSelection}
      onPointerCancel={() => setAnchor(null)} onDoubleClick={tool === "polygon" ? finish : undefined}>
      {!useRealMap && <g transform={"translate(" + offset.x + " " + offset.y + ") translate(50 50) scale(" + zoom + ") translate(-50 -50)"}>
        <BaseMap />
        {parks.map(park => (
          <polygon key={park.id} className="spatial-fence" data-in-range={containsPoint(boundary, park.position)}
            points={boundaryPath(fencePolygon(park.position).map(project))} />
        ))}
      </g>}
      {rectangle.length >= 4 && <rect className="spatial-selection" x={Math.min(...rectangleX)} y={Math.min(...rectangleY)} width={Math.max(...rectangleX) - Math.min(...rectangleX)} height={Math.max(...rectangleY) - Math.min(...rectangleY)} />}
      {polygon.length >= 3 && <polygon className="spatial-selection" points={boundaryPath(polygon)} />}
      {drawing && previewRing.length > 0 && <polyline className="spatial-outline" points={boundaryPath(previewRing)} />}
    </svg>
    {parks.map(park => (
      <button type="button" className="spatial-point" data-active={selected === park.id} data-in-range={containsPoint(boundary, park.position)}
      aria-label={park.name + " · 在驻企业 " + park.enterprises + " 家"} key={park.id}
      style={useRealMap ? realMarkerStyle(park) : markerStyle(project(park.position))} onClick={() => onSelect(park)}>
      <MapPin /><span role="tooltip">{park.name}<small>在驻企业 {park.enterprises} 家</small></span>
    </button>
    ))}
    {!compact && <>
      <div className="spatial-tools os-glass-card" aria-label="地图工具">
        {([{ value: "pan", icon: Hand, label: "拖动" }, { value: "polygon", icon: Pentagon, label: "多边形圈选" }, { value: "rectangle", icon: Square, label: "矩形框选" }] as const).map(({ value, icon: Icon, label }) =>
          <Button key={value} type="button" size="sm" variant={tool === value ? "default" : "ghost"} aria-pressed={tool === value} onClick={() => choose(value)}><Icon data-icon="inline-start" />{label}</Button>)}
        <Button type="button" size="sm" variant="ghost" onClick={() => { choose("pan"); onBoundary?.(null); setOffset(zero); setZoom(1); mapHandle?.setZoom(initialZoom); mapHandle?.setCenter(center); }}><RotateCcw data-icon="inline-start" />重置</Button>
        <span className="spatial-zoom-controls" aria-label="缩放地图">
          <Button type="button" size="icon-sm" variant="ghost" aria-label="放大" onClick={() => { const next = Math.min(2.5, Number((zoom + 0.2).toFixed(1))); setZoom(next); mapHandle?.setZoom(Math.min(18, initialZoom * next)); }}><ZoomIn /></Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="缩小" onClick={() => { const next = Math.max(0.8, Number((zoom - 0.2).toFixed(1))); setZoom(next); mapHandle?.setZoom(Math.max(6, initialZoom * next)); }}><ZoomOut /></Button>
        </span>
      </div>
      <div className="spatial-hint os-glass-card">
        <span>{hint}</span>
        {tool === "polygon" && drawing && <Button size="sm" disabled={polygon.length < 3} onClick={finish}>完成圈选</Button>}
        {tool === "polygon" && drawing && <Button size="sm" variant="ghost" aria-label="撤销上一个顶点" onClick={undoPoint}><Undo2 /></Button>}
        {boundary && <Button size="sm" variant="ghost" aria-label="清除选区" onClick={clearSelection}><Trash2 /></Button>}
      </div>
    </>}
  </div>;
}
