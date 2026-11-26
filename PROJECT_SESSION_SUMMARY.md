# 有数计划项目与会话交接

更新日期为 2026-11-26，时区为 Asia/Shanghai。本文用于新会话或其他 AI 接手，依据本会话、当前源码、Git 状态、Docker 状态和本地交付文件整理。

## 1. 接手时先确认的项目状态

| 项目 | 当前信息 |
| --- | --- |
| 主工作目录 | `C:\Users\Administrator\Desktop\网站逆向` |
| GitHub 仓库 | https://github.com/lvle925/dgy_youshu |
| 当前分支 | `main` |
| 最近业务提交 | `a89b6a8` 平台治理模块 UI 精修，2026-11-26；其后 `ae403ad` 重建交付包 |
| 本轮提交序列 | `7716542` 底座与地图 → `6b2de71` 登录/首页/404 → `cfedae0` 智慧招商 → `57a8737` 商机洞察 → `0f48585` 安商稳商 → `a89b6a8` 平台治理 → `e130efe`+`2f513c5` 文档 → `ae403ad` 交付包重建 |
| 推送状态 | 上述提交**均已推送**，`main` 与 `origin/main` 同步于 `ae403ad` |
| 本轮交接文档 | 已同步本轮改动与剩余缺口，见第 9、10 节 |
| 当前待接手重点 | 按 1440×900 重拍地图截图；同事代码比较合并；README 同步；第 10 节功能缺口 |

本轮用户要求按《`dgy_youshu` 全量逐页前端 UI / 交互审查》文档执行 Batch 0~5 共 39 个页面/组件的前端精修，并明确交付边界为「源码 + 每批 build 验收」：不重建 Docker 交付包与 ZIP、不重拍截图、不改 README。每个批次单独提交，提交信息以 `Batch N:` 开头便于回溯。

根目录下还有用户提供的 `dgy_youshu/` 和 `dgy_youshu-develop_glf.zip`。这两个项目均为主仓库的未跟踪内容。嵌套目录中没有独立 `.git`，在其中运行 Git 会向上找到主仓库，因此其中显示的 `main` 和提交历史属于外层仓库。同事代码与主线的逐文件差异和合并结论仍需核查。

## 2. 用户确定的产品定位与交付习惯

产品名称为「有数计划 · 政务招商与安商稳商工作台」，面向地方政府委办局、管委会与产业园区内部使用，覆盖智慧招商、商机洞察、安商稳商与平台治理。

用户在历次需求中明确要求如下。

- 使用 React 19、TypeScript、Tailwind CSS 4、shadcn/ui、Recharts，后端采用 Spring Boot 与 MySQL 8.4。
- 数据库统一使用 MySQL 8，清除 H2 路径，提供表结构和原始初始化 SQL。合成业务数据也要能持久化和刷新后恢复。
- 采用纯 ToG 岗位授权模式。旧需求中的积分钱包、每日配额、10 积分解锁和已解锁项目 Tab 已被后续需求替换，应按政务授权直出、敏感信息查阅审计继续开发。
- 清理商业订阅、充值、账单、CRM 等产品表达。系统配置、接口监控、招商台账使用政务业务术语。
- 演示手机号为 `127127`，提供免验证码演示入口，同时保留短信校验、密码登录和新设备验证的完整流程。
- 每轮代码交付应在用户本机完成 Docker 验证，然后提交并推送 GitHub。完整交付包要包括 JAR、前端静态资源与运行环境、MySQL 初始化 SQL 和 Compose。
- README 应覆盖全部功能截图和交付说明。用户多次强调固定 `1440×900` 视口，首页和业务截图需要验证实际像素尺寸。
- 需要构建或美化 React/Tailwind 页面时，优先通过 shadcn MCP 按需检索官方和免费社区组件、Blocks、Tailark 页面骨架，复用已安装组件。按需安装并查看实际渲染效果。
- 当前会话工具更新后 shadcn MCP 已移除。后续可重新检查工具可用性，并利用现有组件和 shadcn CLI 继续完成工作。

## 3. 视觉与全局交互规范

用户最初指定「霁蓝鎏金 · 现代政务中枢」，之后进一步要求全站统一为空间感 Bento 设计。当前视觉核心位于 [globals.css](C:/Users/Administrator/Desktop/网站逆向/src-react/globals.css) 和 [business-pages.css](C:/Users/Administrator/Desktop/网站逆向/src-react/business-pages.css)。

| 项目 | 约定 |
| --- | --- |
| 全局画布 | `#F2F4F7`，顶部极淡蓝色径向光晕 |
| 卡片 | 白色表面，极淡描边与轻柔阴影，业务卡片使用 `.os-glass-card` 和 14px 圆角 |
| 侧栏 | `#0B1D36` 至 `#132C4E` 黛青渐变，选中项淡白底及 3px 金色左条 |
| 主交互 | `#1652B8`，Hover `#114091`，浅底 `#EEF3FC` |
| 金色 | `#C8922E`，用于徽标、选中条及重点督办标签 |
| 图表 | 主蓝、青瓷绿、鎏金、天青、石板灰组合 |
| 状态 | 6px 圆点、浅底、极淡同色描边，成功绿、警告金、高危红 |
| 排版 | 中文无衬线字体栈加 Geist，正文 14px，数值 `tabular-nums` |
| 表格 | 浅灰表头 `#F8FAFC`，文字 `#64748B`，公共分页选项 `10 / 20 / 50` |

AppShell 已有分组侧栏搜索与折叠、面包屑、城市 Popover、全局搜索、通知抽屉、账号菜单、路由联动多页签、导出队列。页签初始要求为 34px 高、上限 12 个、刷新保留。城市选择器初始要求支持 34 个省级行政区快搜。

## 4. 工程结构与主要入口

以下文件链接指向主工作目录。

| 入口 | 用途 |
| --- | --- |
| [README.md](C:/Users/Administrator/Desktop/网站逆向/README.md) | 产品介绍、演示动线、功能图库、架构边界、启动和交付说明 |
| [src-react/App.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/App.tsx) | 登录、认证壳层、页面懒加载与路由 |
| [AppShell.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/app/AppShell.tsx) | 侧栏、顶栏、通知、页签、账号菜单 |
| [AccessContext.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/app/AccessContext.tsx) | 前端路由和按钮权限 |
| [CityContext.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/app/CityContext.tsx) | 当前城市状态 |
| [ReportQueue.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/app/ReportQueue.tsx) | 异步导出队列和本地下载 |
| [navigation.ts](C:/Users/Administrator/Desktop/网站逆向/src-react/app/navigation.ts) | 五大模块导航配置 |
| [HomeDashboard.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/HomeDashboard.tsx) | 首页态势与地图微缩卡 |
| [PagePrimitives.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/pages/PagePrimitives.tsx) | 页面标题、卡片、筛选和基础业务布局 |
| [useBusinessCollection.ts](C:/Users/Administrator/Desktop/网站逆向/src-react/lib/useBusinessCollection.ts) | 集合读取、增删改、接口错误和本地缓存逻辑 |
| [src/api.js](C:/Users/Administrator/Desktop/网站逆向/src/api.js) | 业务 API 调用封装 |
| [src/data/mock.js](C:/Users/Administrator/Desktop/网站逆向/src/data/mock.js) | 合成业务数据与 8 个上海地图园区点位 |
| [src/mocks/enums.ts](C:/Users/Administrator/Desktop/网站逆向/src/mocks/enums.ts) | 枚举字典 |
| [backend 源码](C:/Users/Administrator/Desktop/网站逆向/backend/src/main/java/com/youshu/local) | 认证、权限、业务集合、审计和报表 |

四个超大业务页面已拆入 `C:\Users\Administrator\Desktop\网站逆向\src-react\pages\` 下的 `investment/`、`opportunity/`、`stability/`、`admin/` 子目录。

七个共享业务组件实际位于 `C:\Users\Administrator\Desktop\网站逆向\src\components\shared\`，包括 ChipFilter、FilterDrawer、DataTable、StatBar、MetricCard、PermissionTree、StatusTag。`src-react/components/ui/` 保存 shadcn 基础组件，`src-react/components/shared/OperationBriefDialog.tsx` 保存运行简报弹窗。路径差异在后续重构时需要注意。

Vite 的 `@` 指向 `src-react/`。shadcn 配置采用 `base-nova` 和 Base UI，已有 Sheet 使用 `@base-ui/react/dialog`。组件应沿用现有 API。

## 5. 业务路由与历史实施范围

| 业务域 | 主要页面或路由 |
| --- | --- |
| 首页 | `/home/index` |
| 智慧招商 | 政策管理、产业图谱、供应链、园区楼宇、商机地图、企业查询、招投标查询、商机大厅 |
| 商机洞察 | 商机摸排、企业扩张、项目线索、AI 外呼任务、通话记录、外呼看板 |
| 安商稳商 | 全景洞察、园区管理、企业档案、迁移预警、企服保障、走访管理 |
| 平台治理 | 人员、组织架构、角色、操作日志、日志统计、系统与门户配置、数据服务与接口监控 |

需要保留的深链如下。

- `/businessMap/index` 为商机地图。
- `/business/projectClues/index` 为 EnterpriseExpansionPage。
- `/business/enterpriseExpansion/index` 为企业扩张友好别名。
- `/business/projectCluesUpdate/index` 为独立 ProjectCluesPage。
- `/business/aiOutbound/tasks`、`records`、`dashboard` 为三个独立 AI 外呼视图，注意 `aiOutbound` 大小写。
- `/myCampus/panoramicLnsight/index` 为全景洞察，保留历史路径中的 `Lnsight` 拼写。
- `/member/departments` 为组织架构，`/system/interface-monitoring` 为数据服务与接口监控。
- 政策、企业、园区、线索详情分别使用 `/policy/detail/:id`、`/subsidy/company/:id`、`/park/detail/:id`、`/clue/detail/:id`。

历次提交已覆盖页面拆分、企业扩张与项目线索分离、政策匹配、城市联动、导出队列、通知右侧抽屉、园区宽表收敛、AI 外呼配置持久化和业务集合持久化。其具体交互和权限还应按目标场景复验。

## 6. 登录、权限、审计与业务闭环

### 认证与账号策略

- `127127` 免验证码演示登录由 `APP_AUTH_DEMO_LOGIN_ENABLED=true` 控制，演示短信码也是 `127127`。
- 默认登录方式为短信，支持 60 秒发送倒计时，另有账号密码登录。
- 人机验证集成 Cloudflare Turnstile，配置包含本地测试密钥。未配置 Turnstile 时有绑定 Session 的图片验证码路径。
- 新设备短信校验通过后可信任 90 天。真实短信网关、外呼线路、录音和转写服务需要配置外部服务。
- 已有 5 次错误锁定 15 分钟、首次登录强制改密、账号有效期、人工解锁、重置密码、强制下线及会话超时相关代码。
- 认证采用服务端 HttpSession/Cookie，另外记录 `auth_session` 状态供强制下线与会话检查使用。

### 权限模型

[WorkspaceAccess.java](C:/Users/Administrator/Desktop/网站逆向/backend/src/main/java/com/youshu/local/WorkspaceAccess.java) 中的 Principal 包含部门、数据范围、园区列表、成员 ID、姓名、水印和超时配置。

- 数据范围包括 `ALL_PARKS`、`ASSIGNED_PARKS`、`SELF_ONLY`。
- 权限使用路由加具体动作，支持 view、create、edit、delete、export、view_sensitive 等语义，兼容部分历史分组按钮权限。
- 内置角色为系统管理员、安全保密员、安全审计员、园区招商专员、只读领导视角。
- 正式系统管理员按权限清理逻辑受到审计日志与敏感查看节点限制。内置角色模板受到修改、删除保护。
- 演示账号有单独权限例外。`Principal.isAuditReader()` 允许安全审计员和 `subject=demo`。角色验收需要创建真实成员登录验证。
- 成员绑定部门和单个角色，三员互斥及越权自授敏感权限是用户重点验收要求。

### 审计与闭环入口

- `AuditService`、`AuditController` 将登录、设备验证、业务操作、敏感查看、批量导出和内部调用写入 MySQL `op_log`，日志统计由该表聚合。
- 项目手机号默认掩码，明文查阅走专用授权接口并登记审计。项目具有公海认领、撞单提示、退回公海和推进时间轴。
- 项目推进状态为线索摸排、研判评审、载体选址匹配、拟签约、落地纳统。
- 诉求通过 `serviceRequests` 记录，关联部门、执行人和走访工单。走访完成可回写诉求反馈，页面和简报提示超期状态。
- 首页与全景洞察已有运行简报预览、导出入口，页面和导出按系统配置展示姓名、部门、时间水印。
- 演示恢复入口位于账号菜单，带二次确认。`DemoDataResetController` 要求演示开关和演示会话，同时保留 members、roles、departments、tenantSettings 及已有审计日志。

## 7. 数据库与 API 契约

主数据库采用通用集合 `records(collection, id, payload)`。高频大规模查询迁为独立关系表、增加索引和检索能力已写入 README 的生产演进建议。

| 表 | 用途 |
| --- | --- |
| `records` | 业务 JSON 记录，主键由集合名和 ID 组成 |
| `seed_state` | 首次初始化与集合迁移状态 |
| `local_account`、`member_account` | 本地与成员账号凭据 |
| `trusted_device` | 可信设备 |
| `auth_session` | 会话与强制下线状态 |
| `login_attempt` | 登录失败计数和锁定 |
| `op_log` | 操作审计与接口统计 |

表结构及种子文件如下。

- [backend/sql/mysql/schema.sql](C:/Users/Administrator/Desktop/网站逆向/backend/sql/mysql/schema.sql)
- [backend/sql/mysql/seed.sql](C:/Users/Administrator/Desktop/网站逆向/backend/sql/mysql/seed.sql)
- [backend/src/main/resources/schema.sql](C:/Users/Administrator/Desktop/网站逆向/backend/src/main/resources/schema.sql)
- [backend/src/main/resources/seed.json](C:/Users/Administrator/Desktop/网站逆向/backend/src/main/resources/seed.json)
- [deploy/docker-package/database/](C:/Users/Administrator/Desktop/网站逆向/deploy/docker-package/database)

持久化集合已有 members、departments、roles、campusList、parksBuildings、companyArchives、policies、clues、investigationTasks、matchCompanies、opportunityModels、migrationWarnings、migrationRules、serviceRequests、visitOrders、visitRecords、biddingRecords、industryNodes、supplyRelations、tenantSettings、aiScripts、aiTasks、aiRecords。

| API | 用途 |
| --- | --- |
| `/api/auth/status`、`captcha`、`login`、`demo-login` | 会话、人机校验和登录 |
| `/api/auth/sms/send`、`sms/login` | 短信发送与校验 |
| `/api/auth/device/send`、`device/verify` | 新设备验证 |
| `/api/auth/change-password`、`logout` | 修改密码和退出 |
| `/api/records/{collection}` | 集合列表与 CRUD |
| `/api/projects/{id}/sensitive-contact` | 明文号码授权查看 |
| `/api/projects/{id}/claim`、`release`、`stage` | 项目归属与推进 |
| `/api/members/{id}/unlock`、`reset-password`、`force-logout` | 账号安全操作 |
| `/api/audit/logs`、`statistics`、`export` | 审计查询、汇总、导出登记 |
| `/api/reports/operation-brief` | 政务运行简报 |
| `/api/visits/{id}/complete` | 走访办结 |
| `/api/system/interface-metrics` | 内部数据服务监控 |
| `/api/demo/reset` | 恢复演示业务数据 |

OpenAPI JSON 位于 `/v3/api-docs`，Swagger UI 在默认配置中关闭。

## 8. 最近一轮商机地图需求与实现

### 用户原始目标

支持地图拖动、自定义多个坐标点组成区域、矩形框选、重置、搜索地址并放大定位。完成选区后，右侧弹窗展示区域内企业列表与企业总数。

- 注册企业视图可切换潜在流失，含义为本地注册、异地办公。
- 办公企业视图可切换潜在招引，含义为本地办公、异地注册。
- 用户给出的参考图含左侧地图、右侧企业结果和分类统计，要求实现对应功能。

参考图保存在 `C:\Users\Administrator\AppData\Local\Temp\codex-clipboard-481b7ff8-d9a7-4298-84a9-7a86b5d00c5a.png`。截至本轮检查文件存在，临时目录文件后续可能失效。

### 实际改动

提交 `0fd8085` 的业务源码集中在以下三个文件。

- [BusinessMapPage.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/pages/investment/BusinessMapPage.tsx)
- [SpatialMap.tsx](C:/Users/Administrator/Desktop/网站逆向/src-react/components/SpatialMap.tsx)
- [business-pages.css](C:/Users/Administrator/Desktop/网站逆向/src-react/business-pages.css)

地图组件已加入放大、缩小、定位中心变换、缩放后的绘图坐标逆变换、重置缩放、矩形对角范围绘制修正，以及完成选区回调 `onBoundaryComplete`。

页面已加入地址搜索、700px 右侧 Sheet、去重后的范围内企业数、注册企业数、办公企业数、两类企业切换与潜在招引/流失筛选。

当前统计口径以绘制区域为本地区域。注册企业以注册坐标落入选区计数，办公企业以办公坐标落入选区计数。潜在招引为办公点在内且注册点在外，潜在流失为注册点在内且办公点在外，总企业数为两组企业的并集。

GeoJSON 选区采用闭合 Polygon 环，坐标使用 `[lng, lat]`。园区点位转换函数位于 [spatialData.ts](C:/Users/Administrator/Desktop/网站逆向/src-react/lib/spatialData.ts)。企业记录支持 `officeLng/officeLat` 或 `lng/lat`，注册位置支持 `registerLng/registerLat` 或 `registrationLng/registrationLat`。

同期更新了交付目录前端静态资源、`docs/screenshots/features/business-map.png` 和 `docs/screenshots/map.png`。README 通过原有链接引用这两张图，最近地图提交包含的 README 变动为零。

## 9. 本轮前端 UI/交互精修（Batch 0~5）

来源是用户提供的《`dgy_youshu` 全量逐页前端 UI / 交互审查与 Codex 分批重构提示词》，按其 6 个批次逐批执行。全部改动只涉及前端视觉、布局与交互，未改后端接口、数据结构、路由与权限模型。每批均通过 `npx tsc --noEmit` 与 `npm run build`，并在本机 `npm run dev`（127.0.0.1:5199）用浏览器抽查关键页面。

| 批次 | 提交 | 主要改动 |
| --- | --- | --- |
| Batch 0 底座 | `7716542` | 面包屑改为「工作台 > 分组 > 子分组 > 当前页」并去重；页签支持自动滚入视野与「关闭右侧」；窄屏分级隐藏面包屑层级；`NativeSelect` 换成 shadcn Select（新增 `allowEmpty`/`bare` 与 `{value,label}` 选项）；表格吸顶表头、骨架屏、空态重置按钮；离线地图改等比呈现并补滚轮缩放、平移边界与选区撤销；Sheet 宽度去掉 `!important` 硬覆盖；新增 `InlineError` 统一错误条 |
| Batch 1 入口 | `6b2de71` | 登录失败不再清空密码、密码长度统一 12 位、忘记密码改中性提示、短信登录补禁用态；首页常用功能补齐默认项并按权限计数，KPI 卡片支持下钻，趋势图坐标轴取整；404 页补说明与「返回上一页」 |
| Batch 2 智慧招商 | `cfedae0` | 政策页合并重复搜索并补各页签搜索与空态，详情页改骨架屏并统一关注状态；产业图谱标注口径并归一化进度条；供应链区分示意节点；企业查询补条件标签与对比列移除；企业详情补未找到空态；商机地图区分定位/快筛、修复抽屉状态冲突并重排结果抽屉；招投标搜索忽略大小写并补重置 |
| Batch 3 商机洞察 | `57a8737` | 商机大厅统一下拉并补行业分布与规则卡片；摸排页状态口径对齐并补防连点；企业扩张默认收起高级筛选并补区间校验；项目线索补阶段/归属筛选与详情页跳转；线索详情补时间轴；外呼公共壳补导航高亮、步骤条与话术预览并改为非阻塞；通话记录补脱敏、录音兜底与筛选；看板区分加载/失败/空三态并补近 14 天补零 |
| Batch 4 安商稳商 | `0f48585` | 全景洞察补指标下钻、饼图长尾合并；园区管理默认区域联动当前城市；企业档案 CSV 导入改 `useRef` 并补进度与失败汇总，修复空值/NaN 筛选边界；企服保障与走访管理详情改用中文字段映射（新增 `DetailFields`），走访页预填自动开单并隔离双 Tab 筛选 |
| Batch 5 平台治理 | `a89b6a8` | 组织架构删除接入统一 `ConfirmDialog`、组织树与清单联动；接口监控补骨架屏、刷新按钮与五列指标；操作日志移除底层表名词并补加载态、日期筛选与部门/模块名称映射；日志统计改本地时区并支持下钻；人员管理以确认弹窗替换 `window.confirm`、授权园区改复选框组；角色权限树补全选/清空；系统配置补未保存提示、徽标预览与阈值校验 |

本轮新增共享组件：`src/components/shared/ConfirmDialog.tsx`、`src/components/shared/DetailFields.tsx`（中文字段标签映射）。

未按审查文档执行的部分：政策匹配表单为同步本地计算，未加假 loading 态，改为「企业名称为空时禁用提交并给出提示」；紧凑表格未改为卡片列表，商机地图结果抽屉改为无横向滚动的三列企业列表。

## 10. 已知缺口与接手优先核查项

本节记录本轮源码和文件核查结果，具体修复工作留待下一轮业务任务。

1. ~~**本轮 6 个提交尚未推送。**~~ **已解决**：`7716542`、`6b2de71`、`cfedae0`、`57a8737`、`0f48585`、`a89b6a8` 及后续文档提交均已推送，`main` 与 `origin/main` 同步于 `ae403ad`。
2. ~~**完整 Docker ZIP 与交付目录版本有差异。**~~ **已解决**：`ae403ad` 已重建交付目录与 ZIP。[deploy/youshu-docker-package.zip](C:/Users/Administrator/Desktop/网站逆向/deploy/youshu-docker-package.zip) 现为 31,282,471 字节、115 个文件，首页引用 `main-DAl2jQt3.js` / `main-7rVNy_fF.css`，与 `deploy/docker-package/frontend/site-final/` 及最新 `dist` 三方一致；ZIP 采用正斜杠路径、根级平铺、不含 `.env`。已在解压目录 compose 验证通过（MySQL 8.4 healthy、演示登录成功、companyArchives 30 / policies 20 / parksBuildings 10 / serviceRequests 4 条数据、地图 `xMidYMid meet` 且 8 个点位与围栏对齐、确认弹窗为自定义 `ConfirmDialog`）。**后续每次改前端都需重做这一步。**
3. ~~**地图截图尺寸有偏差。**~~ **已解决**：全部 50 张截图已按统一口径重拍 —— 46 张页面图为 `1440×900`，6 张模块总览为 `1440×598`，取自当前交付包实例（CDP `Emulation.setDeviceMetricsOverride` 设 `deviceScaleFactor=1`），旧的 `1904×922` 口径已消除。
4. **地址定位采用本地字符串检索。** 搜索现有园区名、区域、行业、企业名、地址和园区字段，取首个匹配结果。任意地址地理编码、在线地址建议需要继续接入。命中无坐标企业时按园区、区域或首个园区回落。
5. **地图数据以 8 个上海园区示例为主。** `SpatialMap` 投影边界固定在上海附近，其他城市当前返回空园区集。本轮已在切到非上海城市时给出提示浮层与「切回上海市」按钮，但底图仍为 SVG 路网和水系示意，围栏外观按园区点附近偏移生成，真实园区多边形需继续接入。
6. **部分企业坐标是演示推算。** 缺失办公坐标时使用所属园区点，无法匹配园区时按数组顺序分配园区。缺失注册坐标时从企业区县匹配园区并加微小偏移。由此生成的潜在招引/流失记录只能代表演示计算结果，旧记录真实位置仍需补齐。
7. **地图页面存在合成数据兜底。** `companySource = companyData.rows.length ? companyData.rows : companies` 会在后端合法空列表、接口错误和权限拒绝时回落到前端样例。后续应结合 loading、source、error 和演示模式处理，避免授权查询结果被前端样例掩盖。
8. ~~**地图读取集合的授权映射需要对齐。**~~ **已解决**：`RecordPermissions` 的 `companyArchives` 已补入 `/businessMap/index`，与 `clues` 的映射口径一致，地图页读取企业档案不再被拒。
9. **筛选口径和台账动作需要完善。** 抽屉 `selectedRows` 按选区筛选，左侧关键词、区域、产业过滤还需与抽屉一致化。抽屉「纳入招商台账」目前创建公司名为「圈选范围企业」的一条通用线索，按具体企业认领或逐条入库仍需实现。
10. **地图结果区改为无横向滚动的企业列表。** 原 `min-width: 610px` 四列表格已替换为三列列表（企业名+地址、行业、区域），底部「纳入招商台账」改为 sticky footer。**分页已补齐**：抽屉内提供 `10 / 20 / 50` 每页条数与上一页/下一页，切换注册/办公视图或潜在筛选时自动回到第一页。
11. **地图验收本轮已补测缩放与坐标一致性。** 矩形框选的绘制矩形与鼠标拖拽路径逐像素吻合，缩放后 HTML 园区点位仍与 SVG 电子围栏居中对齐；拖动平移、多点多边形完成、重置与边界点仍值得复验。地图专项自动化回归测试仍未补。
12. ~~**后端数据范围需覆盖无园区归属记录。**~~ **已解决**：`RecordsController.inScope()` 现按集合区分语义 —— 公共集合（policies / industryNodes / supplyRelations / biddingRecords / members / roles / departments / tenantSettings / aiScripts）保持全园区可见；公海集合（clues）无园区归属时仍可见但已归属线索按园区隔离；其余私有业务数据无园区归属时**不再一律放行**，改为按关联企业反查园区归属，查不到则拒绝。走访工单与走访记录在创建时按企业名自动补齐 `park` / `parkId`。新增 2 个测试覆盖该行为，并用旧逻辑验证过测试确实会失败。
13. **同事代码合并仍待确认。** 用户曾明确希望比较 `dgy_youshu/` 并合并兼容改动。当前会话记录没有完成逐文件评审及合并的证据，两个未跟踪输入需保留供后续检查。

## 10. Git 历史与验证证据

| 提交 | 历史变动 |
| --- | --- |
| `1a6dd96` | 首页固定视口截图 |
| `82e1e20` | 业务页面拆分和流程持久化 |
| `90df5d7` | MySQL 8 迁移和功能截图扩充 |
| `5f2479d` | 政务业务、权限和治理重构 |
| `fd90f16` | 三员边界、交付目录和 Docker 包等收尾 |
| `0fd8085` | 最近地图交互、企业结果、静态资源和截图更新 |
| `7716542` | Batch 0：外壳、通用原语与离线地图 |
| `6b2de71` | Batch 1：登录、首页与 404 |
| `cfedae0` | Batch 2：智慧招商模块 |
| `57a8737` | Batch 3：商机洞察模块 |
| `0f48585` | Batch 4：安商稳商模块 |
| `a89b6a8` | Batch 5：平台治理模块 |

2026-11-26 的 Batch 0~5 轮次每批都执行了 `npx tsc --noEmit` 与 `npm run build`（最终一次构建 0 错误，主包仍有超过 500KB 的体积提示）。验证在本机 `npm run dev`（127.0.0.1:5199）+ 浏览器进行：登录页演示入口、政策页去重搜索、商机地图矩形框选与结果抽屉、项目线索页筛选与意愿度分段、外呼数据看板三态与图表配色、操作日志日期筛选与部门名称映射，均按预期渲染。地图等比改造后实测框选矩形与鼠标拖拽路径一致、缩放后点位仍与电子围栏居中对齐。

浏览器实测的一个选区得到 6 家范围内企业（3 家注册、5 家办公）。数字随选区变化。

后端测试在 `maven:3.9-eclipse-temurin-21` 容器内、接入 `youshu-test` compose 的 MySQL 8.4 实例运行（需 `--network youshu-test_default` 并设 `TEST_MYSQL_URL` 指向 `mysql-test:3306/youshu_test`）：CaptchaServiceTest 5 个、SmsVerificationServiceTest 3 个、WorkspaceFlowsTest 13 个（含本轮新增的园区数据范围 2 个），合计 21 个，失败和错误均为 0，BUILD SUCCESS。

本轮新增的 2 个测试分别覆盖：指定园区账号不得看到无园区归属的走访工单；指定园区账号仍可全量读取公共政策集合。已用改动前的代码验证过这两个测试确实会失败，确认断言有效。

README 当前共检查到 56 个本地图片/文件链接，目标全部存在。`docs/screenshots/` 下有 50 张 PNG。文件存在性、图像尺寸和业务状态展示需要分别核对。

## 11. 本机运行与 Docker 交付

### 当前运行实例

2026-11-26 检查时存在以下本项目容器。

| 实例 | 状态或入口 |
| --- | --- |
| `docker-package-web-1` | 交付包前端，`http://127.0.0.1:5259` |
| `docker-package-api-1` | 交付包后端，Compose 内部 8080 |
| `docker-package-mysql-1` | MySQL 8.4 healthy，`127.0.0.1:3310` |
| `youshu-local-api-1` | 源码开发后端，`127.0.0.1:8080` |
| `youshu-local-mysql-1` | 源码开发数据库，`127.0.0.1:3307` |

两套数据库对应不同 Compose 项目和数据卷。浏览器测试、API 验证和 SQL 检查应记录正在使用的入口。

### 源码开发与测试命令

在主工作目录运行。

```powershell
Set-Location 'C:\Users\Administrator\Desktop\网站逆向'
npm install
docker compose -p youshu-local up -d --build
npm run dev
```

Vite 地址为 `http://127.0.0.1:5199`，默认代理到 `http://127.0.0.1:8080`。可通过 `API_PROXY_TARGET` 更改代理目标。

```powershell
npx tsc --noEmit
npm run build
docker compose -p youshu-test --profile test run --rm backend-test
docker compose -p youshu-test --profile test down
```

测试 profile 使用 MySQL 8.4 临时实例，默认暴露本机 3308。停止日常开发实例使用 `docker compose -p youshu-local down`，保留命名卷便于继续演示。

### 预编译交付目录

[deploy/docker-package/](C:/Users/Administrator/Desktop/网站逆向/deploy/docker-package) 包含如下文件。

- `backend/app.jar` 与 Java 21 JRE Dockerfile。
- `frontend/site-final/`、Nginx 配置与前端 Dockerfile。
- `database/schema.sql`、`database/seed.sql`。
- `compose.yaml`、`.env.example` 和交付 README。

```powershell
docker compose -f deploy/docker-package/compose.yaml --env-file deploy/docker-package/.env up -d --build
docker compose -f deploy/docker-package/compose.yaml --env-file deploy/docker-package/.env ps
```

当前本机交付配置选择 5259 和 3310 端口。公开模板默认前端为 5199、MySQL 为 3307。数据库密码等本地配置由实际 `.env` 提供，交接文档只记录配置入口。

源码根 Compose 的 API Dockerfile会从 Java 源码编译。交付目录的 API Dockerfile直接复制已有 `app.jar`，前端 Dockerfile直接复制 `site-final/`。修改源码后，应重新生成对应 JAR 或 dist，同步交付目录和完整 ZIP，随后从实际交付文件验证启动与业务交互，再提交推送。

## 12. 外部服务边界与接续材料

- 合成企业、政策、园区和风险数据用于本机政务演示，MySQL 已承担多模块持久化。
- 正式短信、人机验证服务凭据、AI 电话线路、通话录音/转写、工商与政务数据、GIS 底图需接入单位批准的服务。
- README 已有三员权限说明、生产演进建议、5 分钟演示动线和完整页面截图索引，更新业务时应同步其产品描述与实际文件。
- 用户早期功能分析和视觉改造粘贴文件分别位于 `C:\Users\Administrator\.codex\attachments\5b26324c-ea48-479f-89b5-74e13b82b3c2\已粘贴的文本.txt` 与 `C:\Users\Administrator\.codex\attachments\78fb79e4-5166-43d5-b89f-bed3175db83e\已粘贴的文本.txt`。历史材料中的需求应结合后续纯 ToG 定位和用户最新指示使用。

新会话可先阅读本文、README 和最近地图源码。若继续完善交付，优先核查第 10 节列出的实际缺口，并复用现有设计系统、路由与后端集合接口推进。

本轮（Batch 0~5）只改了前端源码；随后 `ae403ad` **已重建** `deploy/docker-package/frontend/site-final/` 与 `deploy/youshu-docker-package.zip`，并从解压目录完成 compose 验证（详见第 10 节第 2 条）。README 与 `docs/screenshots/` 仍未处理。

后续若再修改前端，需重做以下四步，否则交付包会再次落后于源码：把最新 `dist` 同步进 `frontend/site-final/` → 重新打 ZIP（正斜杠路径、根级平铺、不含 `.env`）→ 在**解压目录**里 compose 起来 → 浏览器实测关键页面。构建时注意本机沙箱对单次删除超过 50 个文件会拦截，使用 `npx vite build --emptyOutDir false` 并先手动清理 `dist/assets`。
