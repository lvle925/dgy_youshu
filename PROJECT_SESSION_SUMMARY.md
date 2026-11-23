# 有数计划复刻项目 · 会话交接总结

更新时间：2026-11-23。当前代码在 main 分支，最近一次提交包含 React 工作台认证与 Bento 视觉层改造，后续截图与 MySQL 8 改造正在工作区中。

仓库地址：https://github.com/lvle925/dgy_youshu

这份文档用于新会话接手项目，记录目标、实现方式、页面功能、视觉决策、验证结果和后续工作。登录密码、地图 Key、安全密钥和其他敏感凭据没有写入仓库。

## 一、项目目标

项目最初的目标是复刻 admin.qiliance.com 的政务招商工作台，包括以下内容：

- 左侧多级菜单和页面跳转
- 首页工作台、页签、菜单搜索、账号菜单和退出登录
- 政策、园区、企业、产业、线索、走访、人员和角色等业务页面
- 筛选条件、表格、卡片、详情页、弹窗、抽屉和模拟数据
- 商机地图及高德地图点位
- 本地 Java 后端、持久化数据库、登录认证和 Swagger 文档
- README 操作说明和真实界面截图

用户持续反馈政务蓝白模板感、图标风格、侧栏层级、弹窗遮罩、内容宽度、滚动条、地图性能和通知跳转等问题。后续修改需要保持功能可用，并检查真实渲染效果。

## 二、当前技术结构

### 前端

- React 19、React Router、Vite 5
- Tailwind CSS 4、shadcn/ui（Base UI）
- Recharts、Lucide React、Sonner
- src-react/App.tsx 负责登录后的 React 工作台外壳
- src-react/HomeDashboard.tsx 负责 React 首页仪表盘
- src-react/components/ui 保存 shadcn 组件源码
- src-react/globals.css 保存工作台主题、导航、页签、弹窗和响应式样式
- src-react/legacy-theme.css 覆盖嵌入业务页面的旧版视觉样式

### 兼容业务页面

- Vue 3、Vue Router、Ant Design Vue、ECharts
- `src-react/App.tsx` 是唯一前端入口，27 个主导航路由和详情路由均由 React Router 渲染
- Vue 源文件和 `legacy.html` 仅作为逆向参考，不参与 Vite 构建和运行
- 共享组件位于 `src/components/shared/`，业务页面位于 `src-react/pages/`

### 后端

- Java 21、Spring Boot 3.4.5、Spring JDBC、MySQL 8.4、springdoc-openapi
- Docker Compose 服务名 api，默认绑定 127.0.0.1:8080
- MySQL 服务默认绑定 127.0.0.1:3307，容器内部使用标准 3306，数据卷为 `youshu-local_youshu_mysql_data`
- 可执行 DDL 与 108 条演示记录 SQL 位于 `backend/sql/mysql/`

## 三、功能逻辑结论

### 1. 认证和登录

1. 前端请求 GET /api/auth/status。
2. 空数据库显示创建管理员页面，已有管理员显示登录页面。
3. 默认短信页预填本机演示手机号 `127127`。本机 Compose 开启演示登录时，免验证码按钮调用 `/api/auth/demo-login`，短信流程调用 `/api/auth/sms/send` 和 `/api/auth/sms/login`，演示码为 `127127`。
4. 账号密码登录默认使用 Cloudflare Turnstile。没有 Turnstile 配置时，后端回退到绑定 Session 的图片验证码，5 分钟有效，提交后作废，大小写不敏感。
5. 创建管理员调用 POST /api/auth/setup。
6. 已有管理员登录调用 POST /api/auth/login。启用设备验证且设备未受信任时，服务端返回 challenge，前端弹出 6 位短信验证框。
7. 设备验证成功并勾选信任设备后，服务端保存 90 天 HttpOnly 可信设备 token。
8. 登录成功后服务端 Session 保存 user，前端进入 /home/index。
9. 点击账号菜单的退出登录调用 POST /api/auth/logout，并清理前端用户和页签状态。
10. Spring MVC 拦截器保护业务 API，未认证请求返回 401。

账号至少 3 个字符，密码至少 10 个字符。角色菜单和按钮权限会过滤导航、守卫路由并控制后端业务 API。真实短信供应商尚未配置，非 `127127` 手机号会得到明确的服务未配置响应。

### 2. React 工作台

- 左侧按工作台、智慧招商、商机洞察、安商稳商和平台管理分组
- 分组和二级栏目可展开、收起，当前栏目自动展开
- 三级页面使用选中态背景、鎏金左侧指示条和图标强调
- 顶部页签记录打开页面，可以切换、关闭其他或关闭全部
- 搜索菜单按分组和栏目展示页面，选择后直接跳转
- 通知弹窗中的消息可点击并进入对应业务模块
- 账号菜单提供当前账号信息和退出登录
- 首页常用功能支持管理和移除入口

| 分组 | 页面 |
| --- | --- |
| 工作台 | 首页 |
| 智慧招商 | 政策管理、产业图谱、供应链、园区楼宇、商机地图、企业查询、商机大厅 |
| 商机洞察 | 商机摸排、企业扩张、项目线索、外呼任务、通话记录、数据看板 |
| 安商稳商 | 全景洞察、园区管理、企业档案、迁移预警、企服保障、走访管理 |
| 平台管理 | 人员管理、角色管理、操作日志、操作日志统计、门店装修、接口计费、招投标查询 |

### 3. 首页仪表盘

首页采用空间感 Bento 政务工作台布局，第一行是 1+2 KPI 卡片，第二行是 7:5 招商转化趋势与电子围栏空间卡片，第三行保留常用功能和热门政策榜单，底部继续展示产业扶持方向、行业、区县政策和企业趋势图表。首页数据主要来自演示数据，部分统计不会随所有业务操作实时联动。

### 4. 政策管理

- 按地区、补贴类型、级别、补贴行业筛选
- 按政策项目名称搜索
- 展示政策表格和统计指标
- 点击政策进入政策详情
- 政策详情页通过本地 policies 数据集加载
- 新增政策可以写入本地 API

### 5. 园区楼宇和园区管理

园区楼宇页面支持区域、载体类型、关键词筛选，支持卡片和列表视图，点击卡片进入园区详情，并可打开新增载体弹窗。

园区管理页面使用本地 campusList 数据集，支持查询、编辑和新增。园区楼宇页面当前仍有部分前端演示状态，刷新后不保证新增内容持久化。

### 6. 商机地图

- 左侧支持区域、产业方向、商机类型和关键词筛选
- 右侧优先加载高德 Web JS API 2.0
- 没有配置 Key 或地图加载失败时使用本地点位示意图
- 点击园区列表或地图点位后显示详情
- 详情可进入园区详情或打开商机抽屉
- 重置视野恢复地图范围
- 地图点位更新使用下一帧合并处理
- 已显示点位在选中切换时复用 DOM 和 marker，减少重复重建
- 地图使用 React 组件渲染，点位筛选和详情抽屉由同一页面状态驱动

高德配置从 .env.local 读取 VITE_AMAP_KEY 和 VITE_AMAP_SECURITY_CODE。真实值只保存在本机，不应提交。

### 7. 走访管理

- visitOrders 保存走访工单
- 创建工单调用记录新增接口
- 完成工单调用 POST /api/visits/{id}/complete
- 后端事务内更新工单状态并生成 visitRecords
- 重复完成同一工单返回冲突
- 空走访结果返回参数错误

### 8. 人员、角色和线索

- 人员管理使用 members 数据集，支持列表、编辑、新增和启停状态
- 角色管理使用 roles 数据集保存菜单和按钮权限，并与成员角色绑定
- 导航、前端路由和后端业务 API 按成员角色权限校验
- 项目线索页面使用 clues 数据集，支持更新跟进状态和备注
- 企业、AI 外呼、真实短信和部分计费能力仍是本地模拟数据或演示交互

## 四、后端接口

### 认证接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | /api/auth/status | 查询是否初始化和当前会话状态 |
| GET | /api/auth/captcha | 获取 Turnstile challenge 或图片验证码回退 |
| POST | /api/auth/setup | 创建首次本地管理员 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/demo-login | 本机演示账号免验证码登录，仅显式开启时存在 |
| POST | /api/auth/sms/send | 发送短信 challenge，演示环境返回 `127127` |
| POST | /api/auth/sms/login | 使用 challenge 和短信码登录 |
| POST | /api/auth/device/send | 重新发送设备验证 challenge |
| POST | /api/auth/device/verify | 验证设备并可信任 90 天 |
| POST | /api/auth/logout | 退出登录 |

### 通用业务接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | /api/health | 健康检查 |
| GET | /api/records/{collection} | 查询数据集 |
| POST | /api/records/{collection} | 新增记录 |
| PUT | /api/records/{collection}/{id} | 更新记录 |
| DELETE | /api/records/{collection}/{id} | 删除记录 |
| POST | /api/visits/{id}/complete | 完成走访工单并生成记录 |

允许的数据集为 members、campusList、visitOrders、visitRecords、roles、policies 和 clues。

- Swagger UI： http://127.0.0.1:8080/swagger-ui.html
- OpenAPI JSON： http://127.0.0.1:8080/v3/api-docs

## 五、视觉和交互约束

- 主题使用霁蓝、黛青和少量鎏金
- 首页使用浅灰环境光晕、浮动黛青导航轨道、玻璃质感顶栏和 Bento 卡片层级
- 侧栏使用深邃黛青渐变，选中态使用半透明浅色背景和鎏金指示条
- 画布使用浅灰底色和极淡天青光晕
- 卡片使用白色表面、低对比边框和轻柔阴影
- 避免紫蓝渐变、霓虹边框、高饱和发光阴影和模板化 AI 视觉
- 明确区分标题、正文和辅助文字层级
- 数据指标使用等宽数字
- 状态胶囊带 6px 实心圆点和低对比边框
- 侧栏图标使用统一线性图标语言
- 业务图标可以使用现有本地素材，交互控件使用矢量图标
- UI 修改后使用浏览器检查真实渲染
- 优先检索和复用 shadcn、Magic UI、Kokonut UI、coss ui 和 Tailark 组件或区块
- 按需添加组件，不批量安装未使用的组件

## 六、已经处理的问题

- 增加 Java 本地后端、MySQL 8.4 持久化、Turnstile / 图片验证码回退、演示短信登录和可信设备认证
- 增加 Swagger UI 和 OpenAPI JSON
- 增加 React 工作台和 shadcn 组件
- 完成 Vue/iframe 页面到 React 路由页面迁移，Vue 文件仅作参考
- 完成侧栏多级展开、收起和选中层级
- 修复账号菜单白屏和退出登录
- 修复搜索菜单弹窗位置和页签原生滚动条
- 修复业务页面宽度、二次滚动条和弹窗遮罩范围
- 通知消息支持快捷跳转
- 高德地图支持底图、点位、园区选中和商机抽屉
- 优化地图 marker 更新和外层 DOM 监听
- README 已包含操作说明、登录安全验证截图和工作台实例截图
- 更新首页 Bento 实例截图，截图文件为 `docs/screenshots/dashboard.png`

## 七、当前已知限制

- 企业、AI 外呼、计费和部分统计仍使用模拟数据
- 真实短信供应商和真实企业数据服务尚未配置。`127127` 仅是本机演示账号，生产环境必须关闭演示开关
- 当前账号和角色均为本地演示配置，短信服务未接入真实供应商
- 高德地图依赖浏览器 Key、安全密钥、网络和域名配置
- 园区楼宇检索页的部分演示数据仍使用前端 seed，园区管理页已接入持久化 API
- 构建存在部分大 chunk 提示，当前不影响构建成功
- README 截图来自隔离演示环境，包含演示数据

## 八、启动和验证

~~~
npm install
docker compose -p youshu-local up -d --build
npm run dev
~~~

前端地址为 http://127.0.0.1:5199，后端地址为 http://127.0.0.1:8080。

~~~
npx tsc --noEmit
npm run build
docker compose -p youshu-test --profile test run --rm backend-test
docker compose -p youshu-test --profile test down
~~~

停止服务时使用以下命令保留数据卷：

~~~
docker compose -p youshu-local down
~~~

`docker compose -p youshu-local down` 会保留 MySQL 数据卷。不要加 `-v`，否则会删除数据。

## 九、相关文件

- README.md：运行和操作说明
- src-react/App.tsx：React 工作台、登录和认证流程
- src-react/globals.css：React 工作台主题和布局
- src-react/components/auth/CaptchaField.tsx：Turnstile 与图片验证码回退组件
- backend/src/main/java/com/youshu/local/SmsVerificationService.java：短信 challenge 与演示码
- backend/src/main/java/com/youshu/local/TrustedDeviceService.java：90 天可信设备
- src/views/BusinessMap.vue：商机地图
- backend/src/main/java/com/youshu/local/AuthController.java：认证接口
- backend/src/main/java/com/youshu/local/RecordsController.java：业务记录接口
- backend/sql/mysql/schema.sql 和 seed.sql：MySQL 8 建表及演示数据
- docs/screenshots：实际浏览器截图

新会话开始后，先阅读本文件和 README.md，再检查 git status、当前分支和前后端服务状态。
