import { useState, type PointerEvent } from "react";
import { Hand, MapPin, Pentagon, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

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

function toScreenBoundary(boundary: Boundary | null): ScreenPoint[] {
  return boundaryPoints(boundary).map(project);
}

function createBoundary(tool: Tool, points: ScreenPoint[]): Boundary {
  const [first, second] = points;
  const screenPoints = tool === "rectangle" && first && second
    ? [first, { x: second.x, y: first.y }, second, { x: first.x, y: second.y }]
    : points;
  const coordinates = screenPoints.map(unproject);
  if (coordinates.length) coordinates.push(coordinates[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coordinates] },
    properties: { id: "selection", selectionTool: tool === "rectangle" ? "rectangle" : "polygon" },
  };
}

export function containsPoint(boundary: Boundary | null, position: GeoPosition) {
  const points = toScreenBoundary(boundary);
  const point = project(position);
  if (!boundary || points.length < 2) return true;
  if (boundary.properties.selectionTool === "rectangle") {
    return point.x >= Math.min(...points.map(item => item.x)) && point.x <= Math.max(...points.map(item => item.x))
      && point.y >= Math.min(...points.map(item => item.y)) && point.y <= Math.max(...points.map(item => item.y));
  }
  if (points.length < 3) return true;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (Math.abs(cross) < 0.0001 && point.x >= Math.min(a.x, b.x) && point.x <= Math.max(a.x, b.x)
      && point.y >= Math.min(a.y, b.y) && point.y <= Math.max(a.y, b.y)) return true;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
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

export function SpatialMap({ parks, selected, onSelect, boundary = null, onBoundary, compact = false }: {
  parks: ParkPoint[];
  selected?: string;
  onSelect: (park: ParkPoint) => void;
  boundary?: Boundary | null;
  onBoundary?: (boundary: Boundary | null) => void;
  compact?: boolean;
}) {
  const [tool, setTool] = useState<Tool>("pan");
  const [offset, setOffset] = useState(zero);
  const [anchor, setAnchor] = useState<ScreenPoint | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [preview, setPreview] = useState<ScreenPoint | null>(null);

  function screenCoordinates(event: PointerEvent<SVGSVGElement>, translate = offset) {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - box.left) * 100 / box.width - translate.x, y: (event.clientY - box.top) * 100 / box.height - translate.y };
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (compact || event.button !== 0 || !onBoundary) return;
    const point = screenCoordinates(event);
    if (tool === "polygon") {
      const points = drawing && boundary ? [...toScreenBoundary(boundary), point] : [point];
      onBoundary(createBoundary("polygon", points));
      setDrawing(true);
    } else {
      event.currentTarget.setPointerCapture(event.pointerId);
      setAnchor(tool === "pan" ? screenCoordinates(event, zero) : point);
      if (tool === "rectangle") onBoundary(createBoundary("rectangle", [point, point]));
    }
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    if (compact) return;
    if (!anchor) {
      if (tool === "polygon" && drawing) setPreview(screenCoordinates(event));
      return;
    }
    if (tool === "rectangle") onBoundary?.(createBoundary("rectangle", [anchor, screenCoordinates(event)]));
    if (tool === "pan") {
      const point = screenCoordinates(event, zero);
      setOffset(current => ({ x: current.x + point.x - anchor.x, y: current.y + point.y - anchor.y }));
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

  function finish() {
    if (toScreenBoundary(boundary).length < 3) onBoundary?.(null);
    setDrawing(false);
    setPreview(null);
  }

  const selectedBoundary = toScreenBoundary(boundary);
  const rectangle = boundary?.properties.selectionTool === "rectangle" ? selectedBoundary : [];
  const [a, b] = rectangle;
  const polygon = boundary?.properties.selectionTool === "polygon" ? selectedBoundary : [];
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
      : "拖动地图或选择园区浏览";

  return <div className={compact ? "spatial-map spatial-map--compact" : "spatial-map os-glass-card"} data-tool={tool}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="spatial-map-canvas" aria-label="园区路网与电子围栏示意"
      onPointerDown={start} onPointerMove={move} onPointerUp={() => setAnchor(null)}
      onPointerCancel={() => setAnchor(null)} onDoubleClick={tool === "polygon" ? finish : undefined}>
      <g transform={"translate(" + offset.x + " " + offset.y + ")"}>
        <BaseMap />
        {parks.map(park => {
          const point = project(park.position);
          return <polygon key={park.id} className="spatial-fence" data-in-range={containsPoint(boundary, park.position)}
            points={boundaryPath([{ x: point.x - 4.4, y: point.y - 4 }, { x: point.x + 3.2, y: point.y - 4.8 }, { x: point.x + 4.6, y: point.y + 1 }, { x: point.x + 2.2, y: point.y + 4 }, { x: point.x - 3.8, y: point.y + 3.4 }])} />;
        })}
        {a && b && <rect className="spatial-selection" x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(a.x - b.x)} height={Math.abs(a.y - b.y)} />}
        {polygon.length >= 3 && <polygon className="spatial-selection" points={boundaryPath(polygon)} />}
        {drawing && polygon.length > 0 && <polyline className="spatial-outline" points={boundaryPath(preview ? [...polygon, preview] : polygon)} />}
      </g>
    </svg>
    {parks.map(park => {
      const point = project(park.position);
      return <button type="button" className="spatial-point" data-active={selected === park.id} data-in-range={containsPoint(boundary, park.position)}
      aria-label={park.name + " · 在驻企业 " + park.enterprises + " 家"} key={park.id}
      style={{ left: (point.x + offset.x) + "%", top: (point.y + offset.y) + "%" }} onClick={() => onSelect(park)}>
      <MapPin /><span role="tooltip">{park.name}<small>在驻企业 {park.enterprises} 家</small></span>
    </button>;
    })}
    {!compact && <>
      <div className="spatial-tools os-glass-card" aria-label="地图工具">
        {([{ value: "pan", icon: Hand, label: "拖动" }, { value: "polygon", icon: Pentagon, label: "多边形圈选" }, { value: "rectangle", icon: Square, label: "矩形框选" }] as const).map(({ value, icon: Icon, label }) =>
          <Button key={value} type="button" size="sm" variant={tool === value ? "default" : "ghost"} aria-pressed={tool === value} onClick={() => choose(value)}><Icon data-icon="inline-start" />{label}</Button>)}
        <Button type="button" size="sm" variant="ghost" onClick={() => { choose("pan"); onBoundary?.(null); setOffset(zero); }}><RotateCcw data-icon="inline-start" />重置</Button>
      </div>
      <div className="spatial-hint os-glass-card">
        <span>{hint}</span>
        {tool === "polygon" && drawing && <Button size="sm" disabled={polygon.length < 3} onClick={finish}>完成圈选</Button>}
      </div>
    </>}
  </div>;
}
