"""运行演示仓与拉取请求共用的检查。"""

import os
from pathlib import Path
import secrets
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
GITLEAKS = "ghcr.io/gitleaks/gitleaks@sha256:691af3c7c5a48b16f187ce3446d5f194838f91238f27270ed36eef6359a574d9"


def run(*args, **options):
    return subprocess.run(args, cwd=ROOT, check=True, **options)


def read(*args, **options):
    return run(*args, stdout=subprocess.PIPE, text=True, **options).stdout.strip()


def check_source():
    for name, link in (("README.md", "(README.zh-CN.md)"), ("README.zh-CN.md", "(README.md)")):
        if link not in (ROOT / name).read_text(encoding="utf-8"):
            raise ValueError(f"{name} 缺少对应语言的入口。")
    with tempfile.TemporaryDirectory(prefix="demo-source-") as area:
        snapshot = Path(area) / "source"
        snapshot.mkdir()
        archive = Path(area) / "source.tar"
        run("git", "archive", "--format=tar", "--output=" + str(archive), "HEAD")
        run("tar", "-xf", str(archive), "-C", str(snapshot))
        run("docker", "run", "--rm", "-v", f"{snapshot}:/src:ro",
            GITLEAKS, "dir", "/src", "--redact=100", "--no-banner")


def check_database():
    project = "community-demo-backend-" + secrets.token_hex(6)
    environment = {**os.environ, "PGPASSWORD": secrets.token_hex(24), "DEMO_BACKEND_PORT": "0"}
    compose = ("docker", "compose", "--project-name", project, "--file", str(ROOT / "compose.yaml"),
               "--env-file", os.devnull)
    try:
        run(*compose, "up", "--build", "-d", "--wait", env=environment)
        endpoint = read(*compose, "port", "backend", "3000", env=environment)
        base = "http://" + endpoint
        for route in ("/health", "/ready"):
            run("curl", "--silent", "--show-error", "--fail", "--output", os.devnull,
                "--max-time", "15", base + route)
        run(*compose, "run", "--rm", "-T", "--no-deps", "-v", f"{ROOT / 'test'}:/app/test:ro",
            "backend", "node", "--test", "test/postgres.integration.cjs", env=environment)
        run(*compose, "stop", "postgres", env=environment)
        status = read("curl", "--silent", "--show-error", "--output", os.devnull,
                      "--write-out", "%{http_code}", "--max-time", "15", base + "/ready")
        if status != "503":
            raise ValueError("数据库停止后，/ready 应返回 503。")
        run("curl", "--silent", "--show-error", "--fail", "--output", os.devnull,
            "--max-time", "15", base + "/health")
        run(*compose, "start", "postgres", env=environment)
    finally:
        run(*compose, "down", "--volumes", "--rmi", "local", env=environment)


def main():
    check_source()
    run("npm", "ci")
    run("npm", "test")
    run("npm", "audit", "--omit=dev", "--audit-level=high")
    check_database()


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from None
