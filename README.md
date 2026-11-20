# Deployment demo backend

[简体中文](README.zh-CN.md)

An Ops deployment demo built with NestJS. It exposes HTTP health, instance identity and PostgreSQL probes. [Frontend demo](https://github.com/haydardsx/demo_deploy_frontend)

## Run locally

Start the API and a local PostgreSQL database with Docker Compose. Keep the generated password for subsequent starts with the same database volume.

```sh
export PGPASSWORD="$(openssl rand -hex 24)"
docker compose up --build -d --wait
curl --fail http://localhost:3000/health
curl --fail http://localhost:3000/ready
curl --fail -X POST http://localhost:3000/pgtest
```

Stop the services with `docker compose down`.

## HTTP endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/health` | API liveness |
| GET | `/ready` | Database readiness, or HTTP 503 |
| GET | `/server` | Instance, service slot and build revision |
| GET | `/vartest` | Demo variables and secret-presence flags |
| GET / POST | `/pgtest` | Read probe / write-read probe with rollback |

For an existing database, set `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD`, or supply `DATABASE_URL`. Set `CORS_ORIGINS` to the browser origins allowed to read responses. Use public demo labels for `INSTANCE_ID`, `SERVICE_SLOT`, `BUILD_REVISION` and `DEMO_MESSAGE`.

## Test

With Node.js 22 or later, run `npm ci` and `npm test`. To run database integration tests, configure a disposable PostgreSQL database and run `npm run test:integration`.

[MIT license](LICENSE)
