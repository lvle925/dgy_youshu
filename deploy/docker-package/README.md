# 有数计划政务工作台 Docker 交付包

目录包含 Spring Boot 可执行 JAR、React 静态前端、Nginx 反向代理配置、MySQL 8.4 表结构与初始化 SQL、Docker Compose 和环境变量模板。

## 启动

1. 将 `.env.example` 复制为 `.env`，修改 MySQL 密码和 root 密码。
2. 运行 `docker compose up -d`。
3. 打开 `http://127.0.0.1:5199`。本地演示登录默认开启，账号为 `127127`。

首次启动会创建 MySQL `youshu` 数据库并导入 `database/schema.sql` 和 `database/seed.sql`。业务数据保存在 Docker volume `youshu_mysql_data` 中。停止服务运行 `docker compose down`，数据库卷会保留。

演示登录、固定短信码和 Cloudflare 测试密钥只用于本地演示。部署到单位环境前设置 `APP_AUTH_DEMO_LOGIN_ENABLED=false`，更换验证码密钥、数据库密码和短信服务配置。

## 地图服务（可选）

商机地图底图可接入腾讯位置服务。在 `.env` 中填写：

```dotenv
TENCENT_MAP_KEY=你的 Key
TENCENT_MAP_SECRET_KEY=你的 SecretKey
```

- Key 同时用于前端 JS API 底图与后端 WebService 调用；SecretKey 仅在后端用于签名，不要写入前端代码。
- 两个凭据需属于同一账号下的同一应用，WebService 需在控制台开启 SN 校验。
- 留空时地图自动使用内置离线示意底图，功能流程不受影响。
- 免费额度较小，服务端已做结果缓存与每日调用预算保护；园区真实边界按需查询，不做批量预取。

签名算法与接口契约见仓库内 `docs/tendcent-map-integration.md`。

## 端口

| 服务 | 默认地址 |
| --- | --- |
| 工作台 | `http://127.0.0.1:5199` |
| MySQL 8.4 | `127.0.0.1:3307` |

`WEB_HOST_PORT`、`MYSQL_HOST_PORT` 和数据库凭据均可在 `.env` 修改。API 只开放在 Compose 内部网络，由 Nginx 同源代理 `/api`。
