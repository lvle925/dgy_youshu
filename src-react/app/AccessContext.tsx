import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { navigationGroups } from "./navigation";

export type Principal = {
  user: string;
  role: string;
  administrator: boolean;
  permissions: string[];
  departmentId?: string;
  departmentName?: string;
  displayName?: string;
  dataScope?: "ALL_PARKS" | "ASSIGNED_PARKS" | "SELF_ONLY";
  parkIds?: string[];
  memberId?: string;
  mustChangePassword?: boolean;
  watermarkEnabled?: boolean;
  sessionTimeoutMinutes?: number;
  demoSession?: boolean;
};
export type Action = "新增" | "编辑" | "删除" | "导出" | "查看敏感信息";
export const AccessContext = createContext<Principal | null>(null);
export const usePrincipal = () => useContext(AccessContext);

export function permissionPath(path: string) {
  if (/^\/policy\/detail\//i.test(path)) return "/policy/index";
  if (/^\/subsidy\/company\//i.test(path)) return "/subsidy/index";
  if (/^\/park\/detail\//i.test(path)) return "/parksBuildings/index";
  if (/^\/clue\/detail\//i.test(path)) return "/business/projectCluesUpdate/index";
  if (path === "/") return "/home/index";
  if (/^\/business\/enterpriseExpansion\/index$/i.test(path)) return "/business/projectClues/index";
  return navigationGroups.flatMap(g => g.sections.flatMap(s => s.items)).find(item => item.path.toLowerCase() === path.toLowerCase())?.path ?? path;
}

export function allowsRoute(principal: Principal | null, path: string) {
  return Boolean(principal?.administrator || principal?.permissions.includes("route:" + permissionPath(path)));
}

export function useAllowedAction(action: Action, target?: string) {
  const principal = usePrincipal();
  const location = useLocation();
  const path = permissionPath(target ?? location.pathname);
  const group = navigationGroups.find(g => g.sections.some(s => s.items.some(item => item.path === path)));
  if (principal?.administrator) return true;
  const actionId: Record<Action, string> = { 新增: "create", 编辑: "edit", 删除: "delete", 导出: "export", 查看敏感信息: "view_sensitive" };
  return allowsRoute(principal, path) && Boolean(
    principal?.permissions.includes("action:" + path + ":" + actionId[action])
      || principal?.permissions.includes("button:" + group?.title + ":" + action),
  );
}

export function ActionButton({ action, target, ...props }: React.ComponentProps<typeof Button> & { action: Action; target?: string }) {
  return useAllowedAction(action, target) ? <Button {...props} /> : null;
}
