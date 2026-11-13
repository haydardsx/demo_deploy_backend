# OPS 后端验收 DEMO

一个独立的 NestJS / PostgreSQL 示例，用于验证 OPS 构建、两节点发布、版本更新、路由、变量覆盖和环境连通性。采用 MIT 许可。仓库不包含部署凭据、个人服务器信息或历史项目数据。

## 本地运行

需要 Node.js 22+ 和 Docker Compose。

```sh
npm ci
npm test
export PGPASSWORD="$(openssl rand -hex 24)"
docker compose up --build -d --wait
curl --fail http://localhost:3000/health
curl --fail http://localhost:3000/ready
curl --fail -X POST http://localhost:3000/pgtest
# 删除本地测试数据库与容器：
docker compose down --volumes
```

Compose 同时启动真实后端与 PostgreSQL，数据库只在容器网络中开放。密码必须显式提供，没有弱默认值。直接运行时复制 `.env.example` 为 `.env`，配置数据库后执行 `npm run dev`。修改本地数据库密码前先删除旧测试卷或在数据库内变更密码；环境变量不会覆盖已有数据库密码。

## HTTP 合同

| 请求 | 目的 | 成功 | 失败 |
| --- | --- | --- | --- |
| `GET /health` | HTTP 存活，不依赖数据库 | 200 | 进程不可用 |
| `GET /ready` | 真实数据库就绪 | 200 | 503 |
| `GET /server` | 返回实例、服务槽位、构建版本 | 200 | — |
| `GET /pgtest` | 真实 SELECT 查询 | 200 | 503 |
| `POST /pgtest` | 临时表事务写入、读回并回滚 | 200 | 503 |
| `GET /vartest` | 测试变量白名单和秘密是否配置 | 200 | — |

`/server` 返回 `instanceId`、`serviceSlot`、`buildRevision`。`/pgtest` 写入使用内部随机值，不接受 SQL 或用户数据，不保留持久记录；数据库用户需要连接、临时表与基本查询权限。失败仅返回稳定错误码，不返回连接串、密码或驱动错误。停止数据库后 `/health` 保持成功，`/ready` 和 `/pgtest` 返回 503；恢复数据库后自动重连。

## OPS 配置

源码来源选择本仓 `main`，`sourcePath=.`、`jenkinsfilePath=Jenkinsfile`，两应用选择同一受管构建服务器。根 Jenkinsfile 使用 OPS 随受管 Jenkins 安装的 `iquops` 可信库，执行隔离构建及可信部署；不要把部署凭据写入仓库。普通 Jenkins 需先安装该受管库，不能仅复制 Jenkinsfile 后直接执行。

后端服务创建两个槽位，分别指定不同服务器，每槽位一个副本，容器端口 `3000`，统一 overlay 网络。设置不同的 `INSTANCE_ID`（例如 `backend-1`、`backend-2`）和 `SERVICE_SLOT`；全局设置 `DEMO_MESSAGE=global`，第二槽位覆盖为 `service-2`。构建器通过 Docker `BUILD_REVISION` 参数注入提交 SHA，验证接口返回部署版本。

| 变量 | 配置 |
| --- | --- |
| `PGHOST` / `PGPORT` | 从已安装 PostgreSQL 导入 host/port |
| `PGUSER` / `PGDATABASE` | 数据库用户和库名，默认 `demo` |
| `PGPASSWORD` | OPS 秘密引用；不可使用明文变量 |
| `DATABASE_URL` | 可选秘密引用，提供时优先于分项连接配置 |
| `INSTANCE_ID` / `SERVICE_SLOT` | 每服务稳定且不同的非敏感标识 |
| `BUILD_REVISION` | 构建时注入；不要用运行变量覆盖真实版本 |
| `DEMO_MESSAGE` | 非敏感演示变量，支持全局与服务覆盖 |
| `DEMO_SECRET` | 可选秘密引用，接口仅显示是否存在 |
| `CORS_ORIGINS` | 前端完整 HTTPS origin，多个用英文逗号分隔，无末尾斜线 |
| `PORT` | 默认 `3000`；修改时同步容器端口和健康检查 |

`/vartest` 不枚举进程环境：只返回上表的身份、版本、DEMO_MESSAGE、NODE_ENV、PORT；秘密只有布尔状态。不要把敏感内容填写到任何公开演示变量。

通过两个定向 HTTPS 域名分别绑定两个槽位，第三个域名绑定两者并设置权重。前端 DEMO 用这些域名检验定向访问与至少 1000 次权重采样。域名和 TLS 由 OPS 网关配置，容器内部使用 HTTP。

## 验证

`npm test` 覆盖秘密不泄漏、无数据库仍可启动、错误状态、CORS 与变量。对已运行的真实数据库显式配置 PG 环境后执行 `npm run test:integration`，验证读写、并发和回滚。GitHub CI 构建容器并验证数据库停机与存活分离。完整 OPS 安装、监控、路由、备份等流程见 OPS Community 的 DEMO 指南。
