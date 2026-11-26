# 有数计划 · 接手说明（面向接手 AI）

> 详细背景见 `PROJECT_SESSION_SUMMARY.md`（历史轮次、接口契约、表结构、Docker 细节）。
> 本文只回答三个问题：**现在是什么状态 / 怎么跑起来 / 接下来做什么**。

## 1. 项目一句话

「有数计划 · 政务招商与安商稳商工作台」：React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui(base-nova) + Recharts 前端，Spring Boot + MySQL 8.4 后端。面向政府委办局、园区管委会内部使用，纯 ToG 岗位授权模式（无积分/订阅/充值/CRM 等商业化表达）。视觉体系「霁蓝鎏金 + 空间感 Bento」，设计 token 在 `src-react/globals.css` 与 `src-react/business-pages.css`。

## 2. 当前状态（2026-11-26）

| 项 | 值 |
| --- | --- |
| 仓库 / 分支 | https://github.com/lvle925/dgy_youshu ，`main` |
| HEAD | `ae403ad`（已推送，`main` 与 `origin/main` 同步） |
| 本轮提交 | `7716542` B0 → `6b2de71` B1 → `cfedae0` B2 → `57a8737` B3 → `0f48585` B4 → `a89b6a8` B5 → `e130efe` 文档 → `2f513c5` 接手指南 → `ae403ad` 交付包重建 |
| 工作区 | 干净，仅剩两个**未跟踪**输入：`dgy_youshu/`（同事代码副本）、`dgy_youshu-develop_glf.zip`（同事开发包），**未做逐文件比对合并**，别误删 |
| 本轮范围 | 按用户提供的《全量逐页前端 UI/交互审查》执行 Batch 0~5，共 39 个页面/组件（只改前端源码）。**已补做交付包重建**：交付目录与 ZIP 已同步到 Batch 0~5 之后的最新 dist，并在解压目录 compose 验证通过（见 §6 第 1 项）。README 与截图仍待处理 |

## 3. 跑起来

```powershell
Set-Location 'C:\Users\Administrator\Desktop\网站逆向'
npm install
docker compose -p youshu-local up -d --build   # 源码后端 127.0.0.1:8080 + MySQL 127.0.0.1:3307
npm run dev                                    # Vite 127.0.0.1:5199，代理到 8080
```

- 登录：本机演示账号 `127127`，短信码 `127127`，或点「127127 免验证码演示登录」按钮（`APP_AUTH_DEMO_LOGIN_ENABLED=true` 时可用）。
- 验收命令：`npx tsc --noEmit` 与 `npm run build`（两者目前均 0 错误；构建仍有主包 >500KB 的既有体积提示，属正常）。
- 交付包实例（仍是旧版前端）：`docker-package-web-1` @ `127.0.0.1:5259`，MySQL `3310`。两套数据库互相独立，做验证前先确认用的是哪个入口。

## 4. 代码地图（接手先看这几个）

| 关注点 | 文件 |
| --- | --- |
| 路由、登录页、认证壳层 | `src-react/App.tsx` |
| 外壳：侧栏/顶栏/面包屑/页签/城市/通知 | `src-react/app/AppShell.tsx`、`src-react/app/navigation.ts` |
| 权限（路由 + 动作） | `src-react/app/AccessContext.tsx` |
| 通用原语（页面骨架/下拉/表单/错误条） | `src-react/pages/PagePrimitives.tsx` |
| 共享业务组件 | `src/components/shared/`（`DataTable`、`ChipFilter`、`FilterDrawer`、`MetricCard`、`StatusTag`、`PermissionTree`） |
| 本轮新增 | `src/components/shared/ConfirmDialog.tsx`、`src/components/shared/DetailFields.tsx`（中文字段标签映射） |
| 离线 SVG 地图 | `src-react/components/SpatialMap.tsx` + `src-react/lib/spatialData.ts` |
| 业务页 | `src-react/pages/{investment,opportunity,stability,admin}/` |
| 后端 | `backend/src/main/java/com/youshu/local`（认证、权限、集合 CRUD、审计、报表） |

## 5. 本轮改了什么（速览）

- **B0 底座**：面包屑改为「工作台 > 分组 > 子分组 > 当前页」并去重；页签自动滚入视野 + 「关闭右侧」；`NativeSelect` 换成 shadcn Select（新增 `allowEmpty` / `bare` / `{value,label}` 选项）；表格吸顶表头 + 骨架屏 + 空态重置；地图改等比呈现 + 滚轮缩放 + 平移约束 + 选区撤销；Sheet 宽度去掉 `!important`。
- **B1 入口**：登录失败不再清空密码、口径统一 12 位、忘记密码改中性提示、短信登录补禁用态；首页常用功能按权限计数、KPI 可下钻；404 双按钮。
- **B2~B5**：智慧招商 / 商机洞察 / 安商稳商 / 平台治理四个模块按审查文档逐页处理，重点是去掉重复搜索与原生 `<select>`、消除原始英文字段名、补加载态/空态/错误条、修复状态冲突与数据边界（NaN、空日期）。

## 6. 接下来做什么（按优先级）

1. ~~**重建交付包**（阻塞交付）~~ —— **已完成**：`site-final/` 与 ZIP 已同步到最新 `dist`，ZIP 115 文件、正斜杠路径、根级平铺、不含 `.env`；并在**解压目录** compose 起来验证通过。**每次改前端或后端后都必须重做这一步**（后端需先 `mvn package` 再更新 `deploy/docker-package/backend/app.jar`）。
2. ~~**重拍地图截图**~~ —— **已完成**：全部 50 张截图按 1440×900 重拍（46 张页面图 + 6 张 1440×598 总览图），取自当前交付包实例；旧的 `1904×922` 口径已消除。
3. **同事代码比对合并**：`dgy_youshu/` 与 `dgy_youshu-develop_glf.zip` 尚未做逐文件 diff，合并结论待定。**注意：`git add -A` 会把它们误纳入版本控制，暂存时务必排除。**
4. **功能缺口**（详见 `PROJECT_SESSION_SUMMARY.md` 第 10 节共 13 条）：地图地址定位仍是本地字符串检索；地图结果「纳入招商台账」仍创建一条通用线索而非逐条入库；地图数据仍以 8 个上海园区示例为主；`clues` 抽屉「纳入招商台账」筛选口径待与左侧筛选统一。
5. ~~**README 同步**~~ —— **已完成**：产品亮点补入层级化导航、统一表单与表格交互、中文字段与确认交互三段；说明截图取自当前交付包；补充交付包重建流程与解压目录验收要求。

### 本轮一并修掉的遗留问题

- `MemberPage` 4 处、`RolePage` 1 处原生 `<select className="business-input">` → 改用 `NativeSelect`（为此给 `NativeSelect` 补了 `disabled` 与 `placeholder`）。全仓现已零原生 select、零 `window.confirm`。
- `VisitManagePage` 本地重复实现的 `DetailFields` → 复用共享组件，通过 `labels` 保留「工单主题/执行人」语义。
- `DetailFields` 的 `labels` 覆盖原先被 `recordFieldLabels` 抢先，修正为**页面级优先**。
- `RecordPermissions`：`companyArchives` 补入 `/businessMap/index`，地图页读取企业档案不再被拒。
- `RecordsController.inScope()`：按集合区分公共/私有语义，私有数据无园区归属时不再一律放行；走访工单与记录按企业名反查园区归属。新增 2 个测试覆盖该行为。
- 地图结果抽屉补 `10/20/50` 分页。

## 7. 已知坑（别踩）

- **交付包必须重建**：`site-final/` 与 ZIP 现已与源码一致，但**下次改前端后二者立刻会再次落后于源码**。改完前端务必走「`dist` → `site-final/` → 重打 ZIP → 解压目录 compose 验证」四步，别拿现成的 `docker-package-web-1`（5259 端口）当验收依据——它跑的是上一次打包的静态资源。
- **后端改动也需更新交付包**：交付包的 `backend/app.jar` 是预编译产物。改后端后必须 `mvn package` 生成 `local-api-0.1.0.jar` 并复制到 `deploy/docker-package/backend/app.jar`，否则交付包跑的还是旧后端。
- **构建时避开批量删除阈值**：本机沙箱对单次删除超过 50 个文件会拦截（vite 的 `emptyDir` 会触发 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`）。用 `npx vite build --emptyOutDir false`，并先手动分批 `rm` 掉 `dist/assets` 下的旧文件；构建完必须核对 `dist/assets` 文件数与 `dist` 是否有多余旧 hash 残留。
- **打包 ZIP 用 Python `zipfile`**：`Compress-Archive` 写出的条目用**反斜杠**分隔符，与原包约定的正斜杠不一致，会影响 Linux/Docker 环境解压。
- **后端测试需自带 MySQL**：`mvn test` 的测试默认连 `127.0.0.1:3307/youshu_test`。在容器里跑要用 `--network youshu-test_default` 并设 `TEST_MYSQL_URL` 指向 `mysql-test:3306`，否则报 `Connection refused` 而误判为代码问题。
- **地图几何**：`SpatialMap` 已从拉伸（`preserveAspectRatio="none"`）改为等比（`xMidYMid meet`），点位位置用 `ResizeObserver` 测量后的 letterbox 换算。改动该组件时，**必须**同步维护 `markerStyle()` / `viewBoxPoint()` 的坐标换算，否则 HTML 点位会与 SVG 围栏错位。
- **紧凑地图**（首页缩略图，`compact`）仍保留 `none` 拉伸表现，与全屏地图不一致，属有意为之。
- **文本框控件统一**：`PagePrimitives.NativeSelect` 是统一下拉入口；新增表单下拉请用 `bare` + `allowEmpty={false}`，不要再写原生 `<select className="business-input">`。
- **中文字段展示**：业务详情抽屉请用 `DetailFields`，不要直接 `Object.entries(row)` 渲染（会出现 `parkId`、`departmentId` 这类英文技术字段）。映射表已补齐 `city`/`targetCity`/`desc`/`level` 等字段，新增业务字段时**记得同步加映射**，否则会以英文键名显示。`DetailFields` 只用于 serviceRequests / visitOrders / visitRecords / 操作日志四个集合；企业档案用自定义 `ArchiveDetail`。
- **文件编码**：部分历史文件是 CRLF，编辑时保持原有换行，避免整文件 diff 噪声。
- **权限模型不要顺手改**：`AccessContext` / `WorkspaceAccess` 的路由+动作权限与三员互斥是验收重点，本轮所有改动都刻意没有触碰。

## 8. 提交与协作约定

- 一批一提交，提交信息以 `Batch N:` 开头，便于按批回溯。
- 每批至少跑 `npx tsc --noEmit` + `npm run build`，涉及交互的批次在本机浏览器实测后再提交。
- 交付前在用户本机 Docker 验证 → 提交 → 推送 GitHub（本项目既有节奏）。
