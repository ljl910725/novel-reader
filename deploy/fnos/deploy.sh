#!/usr/bin/env bash
# 飞牛一键部署：拉代码 → 构建 api/web → 重启容器
# 用法：在 deploy/fnos 目录执行 ./deploy.sh
# 环境变量：
#   DEPLOY_ROOT      仓库根目录（默认自动推断）
#   DEPLOY_BRANCH    分支名（默认自动检测 origin/HEAD）
#   DEPLOY_SKIP_PULL=1  跳过 git pull（Runner 已 checkout 时可用）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${DEPLOY_ROOT:-${GITHUB_WORKSPACE:-$(cd "$SCRIPT_DIR/../.." && pwd)}}"
COMPOSE_DIR="$SCRIPT_DIR"
LOG_FILE="${DEPLOY_LOG:-$COMPOSE_DIR/deploy.log}"
BRANCH="${DEPLOY_BRANCH:-}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Deploy started ==="
log "Repo: $REPO_ROOT"

if [[ ! -f "$COMPOSE_DIR/.env" ]]; then
  log "ERROR: 缺少 $COMPOSE_DIR/.env，请先复制 .env.example 并配置"
  exit 1
fi

if [[ "${DEPLOY_SKIP_PULL:-0}" != "1" ]] && [[ -d "$REPO_ROOT/.git" ]]; then
  git config --global --add safe.directory "$REPO_ROOT" 2>/dev/null || true
  cd "$REPO_ROOT"
  if [[ -z "$BRANCH" ]]; then
    BRANCH="$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')"
    BRANCH="${BRANCH:-master}"
  fi
  log "git pull origin $BRANCH"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "origin/$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

cd "$COMPOSE_DIR"
log "docker compose build api web"
docker compose build api web

log "docker compose up -d"
docker compose up -d

docker image prune -f >/dev/null 2>&1 || true
log "=== Deploy finished ==="
