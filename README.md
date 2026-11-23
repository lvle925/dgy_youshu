# 有数计划 · 本地全栈演示平台

产业招商与园区服务办公工作台，涵盖政策、园区、企业、线索、人员和走访等功能。React 工作台承载全部业务路由，Java 后端提供本地认证、业务记录接口和 H2 持久化。首页采用“空间感 Bento 政务工作台”布局，统一霁蓝、黛青和鎏金视觉语言。

> 本项目用于本机开发和演示。统计、通知、地图点位和多数企业信息为演示数据；短信、AI 外呼等尚未接入真实服务，权限控制不完整，不应直接用于生产或存放真实敏感数据。

新会话交接请先阅读 [PROJECT_SESSION_SUMMARY.md](PROJECT_SESSION_SUMMARY.md)。

## 技术栈

- 前端：React 19、React Router、Vite 5、Tailwind CSS 4、shadcn/ui（Base UI）、Recharts、Cloudflare Turnstile。
- 后端：Java 21、Spring Boot 3.4.5、Spring JDBC、H2 文件数据库、springdoc-openapi。
- 地图：高德 Web JS API 2.0，园区和商机点位为演示数据。

## 本地启动

准备 Node.js 20.19+、Docker Desktop 和网络连接。首次构建需要下载依赖。

```bash
npm install
docker compose -p youshu-local up -d --build
npm run dev
```

访问 <http://127.0.0.1:5199>。前端将 `/api` 代理到 `127.0.0.1:8080`。端口被占用时需停止占用服务或调整配置。

### 高德地图

复制 `.env.example` 为 `.env.local`，填入高德 **Web 端 JS API Key** 和安全密钥，重启前端：

```dotenv
VITE_AMAP_KEY=你的Web端JS_API_Key
VITE_AMAP_SECURITY_CODE=你的安全密钥
```

配置成功后显示高德底图；缺少配置或网络不可用时显示本地示意图。`.env.local` 已加入 Git 忽略规则。该版本的前端配置会发送到浏览器，部署时应按照高德要求配置安全代理与域名限制。

### 认证配置

Compose 的本机演示环境默认开启演示登录。登录页手机号预填 `127127`，点击「127127 免验证码演示登录」可以直接进入工作台。也可以点击「发送验证码」，使用服务端返回的演示短信码 `127127` 完成短信登录。演示短信码只在 `APP_AUTH_DEMO_LOGIN_ENABLED=true` 时有效，应用配置默认关闭该开关。

账号密码登录使用 Cloudflare Turnstile。`compose.yaml` 内置 Cloudflare 官方测试 site key 和 secret key，便于本机验收。部署到真实环境时，用环境变量覆盖它们，并把 `APP_AUTH_DEMO_LOGIN_ENABLED` 设为 `false`。

```dotenv
APP_AUTH_DEMO_LOGIN_ENABLED=false
APP_AUTH_DEMO_PHONE=127127
APP_AUTH_DEMO_SMS_CODE=127127
APP_AUTH_DEVICE_VERIFICATION_ENABLED=true
APP_AUTH_TURNSTILE_SITE_KEY=你的 Turnstile Site Key
APP_AUTH_TURNSTILE_SECRET_KEY=你的 Turnstile Secret Key
```

当前仓库没有真实短信服务商凭证，因此其他手机号会得到「尚未配置真实短信服务」的明确响应。短信接口契约已经保留在 `/api/auth/sms/send` 和 `/api/auth/sms/login`，接入供应商时只需替换服务端发送实现。账号密码首次登录或未信任设备时，服务端可以发起短信设备验证，并在勾选信任设备后保存 90 天可信设备 token。

### 停止与数据

前端终端按 `Ctrl+C`，然后执行：

```bash
docker compose -p youshu-local down
```

命令会保留 Docker 卷 `youshu-local_youshu_data` 中的 H2 数据；不要加 `-v`，否则会删除数据卷。首次启动会向空数据库导入演示记录。

## 系统操作说明

以下为隔离演示环境中的实际浏览器截图；为展示工作台使用了测试认证状态，数据与通知均为演示内容。工作台截图采用 1440×900 固定视口，展示首屏布局，页面内部保持正常滚动。

### 1. 演示登录与管理员登录

本机演示环境打开即显示短信登录。手机号默认是 `127127`，可使用免验证码按钮进入，也可发送并输入演示码 `127127`。账号密码登录仍要求账号至少 3 个字符、密码至少 10 个字符和 Turnstile 人机验证。关闭 Turnstile 配置时，后端会回退到绑定 Session 的高质量图片验证码，验证码 5 分钟有效且提交后失效。

![短信演示登录与本机免验证码入口](docs/screenshots/login.png)

![账号密码与 Turnstile 安全验证](docs/screenshots/login-password.png)

### 2. 工作台与菜单

左侧按业务分组，点击分组或二级栏目可展开、收起，侧栏支持折叠为纯图标模式。顶部玻璃质感栏提供当前城市级联选择、⌘K 全局搜索、报告导出队列、通知抽屉和账号菜单，页签用于切换页面，右侧“页签”可关闭其他页签或回到首页。首页以 1+2 KPI、7:5 趋势与空间卡片、常用功能和热门政策榜单组织信息密度；点击右上角账号可退出登录。

![Bento 工作台与导航](docs/screenshots/dashboard.png)

### 3. 通知消息

点击右上角铃铛打开通知，点击消息可进入项目线索、对应政策详情或企服保障页面。通知目前为固定演示内容。

![通知与快捷跳转](docs/screenshots/notifications.png)

### 4. 政策、园区和走访

- **政策管理**：按地区、级别、行业或关键词筛选，选择政策查看详情，也可新增演示政策。
- **园区楼宇**：按区域、载体类型或关键词筛选，切换卡片和列表，点击园区查看详情。此页面新增的载体目前为前端演示状态，刷新后不保证保留。
- **园区管理**：在“安商稳商 → 园区运营 → 园区管理”中维护园区，已接入本地数据库。
- **走访管理**：创建走访工单，完成时填写结果；完成操作会生成走访记录并保存。
- **人员和角色**：在“平台管理 → 账号权限”中维护成员及角色。角色设置可保存，但目前没有细粒度权限校验。

筛选、详情和保存能力以各页面实际实现为准。政策、成员、角色、园区、线索和走访等已接入本地记录 API，导出会生成浏览器下载文件；真实外呼、计费、第三方企业数据和短信发送仍需要外部服务。

### 5. 商机地图

进入“智慧招商 → 园区空间 → 商机地图”。使用左侧区域、产业、商机类型和关键词筛选；点击园区列表或地图点位查看信息，“查看商机”打开线索抽屉，“重置视野”恢复地图范围。底图服务和演示点位状态显示在地图上方。

![高德地图与筛选](docs/screenshots/map.png)

## API 文档与数据范围

启动后访问 [Swagger UI](http://127.0.0.1:8080/swagger-ui.html) 或 [OpenAPI JSON](http://127.0.0.1:8080/v3/api-docs)。先在同一浏览器登录系统再调用业务 API。账号密码登录提交 Turnstile token，图片验证码回退模式提交 `captchaId` 和图片字符。演示短信登录先调用 `/api/auth/sms/send` 获取 challenge，再把 `challengeId` 和短信码提交给 `/api/auth/sms/login`。

后端提供 `/api/auth/*`、`/api/health`、`/api/records/{collection}` 和 `/api/visits/{id}/complete`。认证接口包含演示登录、图片验证码、Turnstile 校验、短信验证码、账号密码登录、设备验证和退出登录。持久化数据集包括 `members`、`campusList`、`visitOrders`、`visitRecords`、`roles`、`policies`、`clues`。

## 本次更新（相对 v1.0.0 / 54c660e）

- 新增 Java 后端、H2 初始化数据、会话认证、图片验证码、业务记录接口、Swagger 和 Docker 配置。
- 新增 React 工作台与 shadcn 组件体系，完成业务路由从 iframe 兼容层到 React 页面迁移。
- 更新配色、品牌、导航层级、图标、页签、搜索、通知快捷跳转和登录界面，增加界面素材。
- 接入高德底图与演示点位，优化点位更新和页面监听，调整弹窗遮罩、内容宽度及滚动。
- 更新政策、园区、人员、角色、走访和线索等页面的本地 API 操作，增加 CSV 导出和服务工单联动。
- 增加 Cloudflare Turnstile、`127127` 本机演示登录、短信 challenge、设备可信 90 天记录和验证码测试。
- 完成 Bento 首页、浮动导航轨道、玻璃质感顶栏、城市级联选择器、报告导出队列入口和趋势/空间组合卡片。
- 更新登录、密码安全验证和工作台实例截图。

## 验证

```bash
npx tsc --noEmit
npm run build
docker run --rm -v "${PWD}/backend:/app" -w /app maven:3.9-eclipse-temurin-21 mvn -q test
```

最后一条命令中的 `${PWD}` 写法适用于 PowerShell；其他 shell 请改用对应的当前目录变量。构建可能提示部分资源包较大。
