import { Check, ChevronDown, Minus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PermissionNode = {
  id: string;
  label: string;
  children?: PermissionNode[];
};
type Mark = "checked" | "partial" | "empty";
function flatten(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.children ? flatten(node.children) : []),
  ]);
}
function collect(node: PermissionNode): string[] {
  return [node.id, ...(node.children ? node.children.flatMap(collect) : [])];
}

export function PermissionTree({
  nodes,
  value,
  onChange,
}: {
  nodes: PermissionNode[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const selected = new Set(value);
  const allNodes = useMemo(() => flatten(nodes), [nodes]);
  const mark = (node: PermissionNode): Mark => {
    if (!node.children?.length)
      return selected.has(node.id) ? "checked" : "empty";
    const selectedChildren = node.children.filter((child) =>
      selected.has(child.id),
    ).length;
    if (selectedChildren > 0 && selectedChildren < node.children.length)
      return "partial";
    if (selectedChildren === node.children.length) return "checked";
    return selected.has(node.id) ? "checked" : "empty";
  };
  const toggle = (node: PermissionNode, parentId?: string) => {
    const next = new Set(value);
    if (parentId) {
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      next.add(parentId);
    } else if (mark(node) === "checked") {
      collect(node).forEach((id) => next.delete(id));
    } else {
      collect(node).forEach((id) => next.add(id));
    }
    onChange([...next]);
  };
  const visible = (node: PermissionNode) =>
    !query || node.label.includes(query) || node.children?.some(visible);
  const renderNode = (node: PermissionNode, depth = 0, parentId?: string) => {
    if (!visible(node)) return null;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = query ? true : (expanded[node.id] ?? depth === 0);
    const state = mark(node);
    return (
      <div key={node.id} className="permission-tree-node">
        <div
          className="permission-tree-row"
          style={{ paddingLeft: `${depth * 22 + 8}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="permission-tree-expand"
              aria-label={`${isExpanded ? "收起" : "展开"}${node.label}`}
              onClick={() =>
                setExpanded((current) => ({
                  ...current,
                  [node.id]: !isExpanded,
                }))
              }
            >
              <ChevronDown className={cn(!isExpanded && "rotate-[-90deg]")} />
            </button>
          ) : (
            <span className="permission-tree-expand" aria-hidden="true" />
          )}
          <button
            type="button"
            className={cn("permission-tree-check", `is-${state}`)}
            role="checkbox"
            aria-checked={state === "partial" ? "mixed" : state === "checked"}
            onClick={() => toggle(node, parentId)}
          >
            {state === "checked" ? (
              <Check />
            ) : state === "partial" ? (
              <Minus />
            ) : null}
          </button>
          <button
            type="button"
            className="permission-tree-label"
            onClick={() => toggle(node, parentId)}
          >
            {node.label}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map((child) =>
              renderNode(child, depth + 1, node.id),
            )}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="permission-tree">
      <div className="permission-tree-search">
        <Search aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索菜单或按钮权限"
        />
      </div>
      <div className="permission-tree-summary">
        已选择 {value.length} 项<span>子选父必选 · 父级可联动子级</span>
      </div>
      {nodes.map((node) => renderNode(node))}
      {allNodes.length === 0 && <p>暂无权限节点</p>}
    </div>
  );
}
