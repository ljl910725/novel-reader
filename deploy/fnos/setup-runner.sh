#!/usr/bin/env bash
# 在飞牛 NAS 上注册 GitHub 自托管 Runner（推荐：内网机器无需公网入站）
#
# 一次性执行：
#   cd /你的路径/novel-reader/deploy/fnos
#   chmod +x setup-runner.sh deploy.sh
#   ./setup-runner.sh
#
# 完成后 push 到 master/main 会自动触发 .github/workflows/deploy-fnos.yml
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ljl910725/novel-reader}"
RUNNER_NAME="${RUNNER_NAME:-fnos-novel-reader}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,linux,fnos,novel-reader}"
INSTALL_DIR="${RUNNER_INSTALL_DIR:-$HOME/actions-runner-novel-reader}"

DEFAULT_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
read -r -p "生产环境 novel-reader 仓库路径 [$DEFAULT_REPO]: " PROD_REPO
PROD_REPO="${PROD_REPO:-$DEFAULT_REPO}"
PROD_REPO="$(cd "$PROD_REPO" && pwd)"

echo "=== GitHub 自托管 Runner 安装 ==="
echo "仓库: $REPO_URL"
echo "安装目录: $INSTALL_DIR"
echo ""
echo "请先在浏览器打开："
echo "  $REPO_URL/settings/actions/runners/new"
echo "选择 Linux x64，复制页面上的 Registration token（一次性，约 1 小时有效）"
echo ""
read -r -p "粘贴 Registration token: " RUNNER_TOKEN
if [[ -z "$RUNNER_TOKEN" ]]; then
  echo "未输入 token，退出"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [[ ! -f ./config.sh ]]; then
  RUNNER_VERSION="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | sed -n 's/.*"tag_name": "v\(.*\)".*/\1/p')"
  echo "下载 actions-runner v${RUNNER_VERSION} ..."
  curl -fsSL -o actions-runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner.tar.gz
  rm -f actions-runner.tar.gz
fi

./config.sh uninstall --token "$RUNNER_TOKEN" 2>/dev/null || true
./config.sh \
  --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --unattended \
  --replace

sudo ./svc.sh install
sudo ./svc.sh start

PROFILE="$HOME/.profile"
grep -q 'DEPLOY_ROOT=' "$PROFILE" 2>/dev/null && \
  sed -i "s|^export DEPLOY_ROOT=.*|export DEPLOY_ROOT=$PROD_REPO|" "$PROFILE" || \
  echo "export DEPLOY_ROOT=$PROD_REPO" >> "$PROFILE"

echo ""
echo "Runner 已启动。到 GitHub → Settings → Actions → Runners 应能看到在线状态。"
echo ""
echo "【还需一步】在 GitHub 仓库设置变量（Settings → Secrets and variables → Actions → Variables）："
echo "  名称: DEPLOY_ROOT"
echo "  值:   $PROD_REPO"
echo ""
echo "之后每次 push 到 master/main 会自动执行 deploy.sh"
echo "手动部署: $PROD_REPO/deploy/fnos/deploy.sh"
