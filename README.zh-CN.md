# 部署演示后端

[English](README.md)

Ops 部署演示后端使用 NestJS 检查 HTTP 服务状态、实例标识和 PostgreSQL 读写。[前端演示](https://github.com/haydardsx/demo_deploy_frontend)

## 本地运行

使用 Docker Compose 启动接口和 PostgreSQL。下次使用同一数据库卷时，继续使用首次生成的密码。

```sh
export PGPASSWORD="$(openssl rand -hex 24)"
docker compose up --build -d --wait
curl --fail http://localhost:3000/health
curl --fail http://localhost:3000/ready
curl --fail -X POST http://localhost:3000/pgtest
```

运行 `docker compose down` 停止服务。

## HTTP 接口

| 方法 | 路径 | 返回内容 |
| --- | --- | --- |
| GET | `/` | 实例标识和可用接口列表 |
| GET | `/health` | 接口存活状态 |
| GET | `/ready` | 数据库就绪状态，未就绪时返回 HTTP 503 |
| GET | `/server` | 实例标识、服务槽位和构建版本 |
| GET | `/vartest` | 演示变量和秘密配置状态 |
| GET / POST | `/pgtest` | 读取检查 / 写入、读取并回滚 |

连接已有数据库时，设置 `PGHOST`、`PGPORT`、`PGDATABASE`、`PGUSER` 和 `PGPASSWORD`，也可使用 `DATABASE_URL`。在 `CORS_ORIGINS` 中填写允许读取响应的浏览器来源。为 `INSTANCE_ID`、`SERVICE_SLOT`、`BUILD_REVISION` 和 `DEMO_MESSAGE` 填写可公开的演示值。

## 测试

安装 Node.js 22 或更高版本，依次运行 `npm ci` 和 `npm test`。运行数据库集成测试前，先配置可丢弃的 PostgreSQL 测试库，再运行 `npm run test:integration`。

## 提交前检查

准备 Python 3、Node.js 和 Docker，可运行与 CI 相同的工程检查并安装 Git 钩子。

    python3 scripts/check.py
    python3 scripts/check_staged.py --install

钩子检查暂存快照与提交标题。从主线创建 `feat/deployment-check` 等用途分支，使用带本仓适用范围的 Conventional Commit 标题，提交作者和提交者均使用项目邮箱。

[MIT 许可证](LICENSE)
