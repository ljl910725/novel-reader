#!/usr/bin/env bash
# 飞牛一键部署：拉代码 → 构建 api/web → 重启容器
# 用法：在 deploy/fnos 目录执行 ./deploy.sh
# 环境变量：
#   DEPLOY_ROOT      仓库根目录（默认自动推断；GitHub Actions 必须设置）
#   DEPLOY_BRANCH    分支名（默认自动检测 origin/HEAD）
#   DEPLOY_SKIP_PULL=1  跳过 git pull（Runner 已 checkout 时可用）
set -euo pipefail

# systemd 下的 github-runner 服务 PATH 极简，需显式补全常见路径
export PATH="/usr/local/bin:/usr/bin:/bin:/snap/bin:/usr/local/sbin:/usr/sbin:/sbin:${PATH:-}"

# 尝试加载登录环境（docker、git 等常在 profile 里配置）
for profile in /etc/profile "$HOME/.profile" "$HOME/.bash_profile"; do
  if [[ -f "$profile" ]]; then
    # shellcheck source=/dev/null
    source "$profile" 2>/dev/null || true
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR"
LOG_FILE="${DEPLOY_LOG:-$COMPOSE_DIR/deploy.log}"
BRANCH="${DEPLOY_BRANCH:-}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

die() {
  log "ERROR: $*"
  exit "${2:-1}"
}

require_cmd() {
  local name=$1
  if ! command -v "$name" >/dev/null 2>&1; then
    die "找不到命令: $name (PATH=$PATH)" 127
  fi
}

run_cmd() {
  log "RUN: $*"
  "$@"
  local code=$?
  if [[ $code -ne 0 ]]; then
    die "命令失败 (exit $code): $*" "$code"
  fi
}

docker_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    die "找不到 docker compose 或 docker-compose (PATH=$PATH)" 127
  fi
}

has_ssh_key() {
  # 尽量保守：只做本地存在性检测，不做网络连接测试
  local dir="${HOME:-}/.ssh"
  [[ -d "$dir" ]] || return 1

  # 常见私钥文件名（不含 .pub）
  local keys=(
    "$dir/id_ed25519"
    "$dir/id_rsa"
    "$dir/id_ecdsa"
    "$dir/id_dsa"
  )
  local k
  for k in "${keys[@]}"; do
    [[ -f "$k" ]] && [[ -s "$k" ]] && return 0
  done

  # 兼容自定义命名的 key（尽量避免误判：排除 .pub / known_hosts / config）
  shopt -s nullglob
  local candidates=("$dir"/*)
  shopt -u nullglob
  for k in "${candidates[@]}"; do
    [[ -f "$k" ]] || continue
    case "$k" in
      *.pub|*/known_hosts|*/config) continue ;;
    esac
    [[ -s "$k" ]] && return 0
  done

  return 1
}

https_github_to_ssh() {
  # 输入: https://github.com/owner/repo.git 或 https://github.com/owner/repo
  # 输出: git@github.com:owner/repo.git
  local url="$1"
  url="${url#https://github.com/}"
  url="${url%.git}"
  echo "git@github.com:${url}.git"
}

maybe_switch_origin_to_ssh() {
  # 仅在：
  # - origin 是 GitHub HTTPS；且
  # - (FORCE_GIT_SSH=1) 或者本地看起来有 SSH key
  # 才自动切换
  local force="${FORCE_GIT_SSH:-0}"

  local origin_url
  origin_url="$(git remote get-url origin 2>/dev/null || true)"
  [[ -n "$origin_url" ]] || return 0

  if [[ "$origin_url" =~ ^https://github\.com/.+/.+(\.git)?$ ]]; then
    if [[ "$force" == "1" ]] || has_ssh_key; then
      local ssh_url
      ssh_url="$(https_github_to_ssh "$origin_url")"
      if [[ "$origin_url" != "$ssh_url" ]]; then
        log "检测到 GitHub HTTPS origin，尝试切换为 SSH 以避免 TLS/gnutls 握手失败："
        log "  origin: $origin_url"
        log "  ->     $ssh_url"
        run_cmd git remote set-url origin "$ssh_url"
      fi
    else
      log "检测到 GitHub HTTPS origin，但未发现可用 SSH key，跳过自动切换。"
      log "如需强制切换，请设置环境变量 FORCE_GIT_SSH=1。"
    fi
  fi
}

if [[ -n "${GITHUB_ACTIONS:-}" ]] && [[ -z "${DEPLOY_ROOT:-}" ]]; then
  die "DEPLOY_ROOT 未设置。请在 GitHub 仓库 Settings → Actions → Variables 添加 DEPLOY_ROOT（生产仓库绝对路径）。"
fi

REPO_ROOT="${DEPLOY_ROOT:-${GITHUB_WORKSPACE:-$(cd "$SCRIPT_DIR/../.." && pwd)}}"

if [[ ! -d "$REPO_ROOT" ]]; then
  die "仓库路径不存在: $REPO_ROOT"
fi

log "=== Deploy started ==="
log "Repo: $REPO_ROOT"
log "PATH: $PATH"

require_cmd git
require_cmd docker

if [[ ! -f "$COMPOSE_DIR/.env" ]]; then
  die "缺少 $COMPOSE_DIR/.env，请先复制 .env.example 并配置"
fi

if [[ "${DEPLOY_SKIP_PULL:-0}" != "1" ]] && [[ -d "$REPO_ROOT/.git" ]]; then
  run_cmd git config --global --add safe.directory "$REPO_ROOT" 2>/dev/null || true
  cd "$REPO_ROOT"
  if [[ -z "$BRANCH" ]]; then
    BRANCH="$(git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')"
    BRANCH="${BRANCH:-master}"
  fi
  maybe_switch_origin_to_ssh
  log "git pull origin $BRANCH"
  run_cmd git fetch origin "$BRANCH"
  git checkout "$BRANCH" 2>/dev/null || run_cmd git checkout -B "$BRANCH" "origin/$BRANCH"
  run_cmd git pull --ff-only origin "$BRANCH"
fi

cd "$COMPOSE_DIR"
log "docker compose build api web"
run_cmd docker_compose build api web

log "docker compose up -d"
run_cmd docker_compose up -d

docker image prune -f >/dev/null 2>&1 || true
log "=== Deploy finished ==="
