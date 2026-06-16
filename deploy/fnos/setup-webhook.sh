#!/usr/bin/env bash
# Webhook 自动部署（备选：需把 DEPLOY_HOOK_PORT 映射到公网或内网可访问地址）
#
# 一次性执行：
#   cd deploy/fnos
#   chmod +x setup-webhook.sh deploy.sh
#   ./setup-webhook.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

HOOK_PORT="${DEPLOY_HOOK_PORT:-9000}"
SECRET_FILE="$SCRIPT_DIR/.webhook-secret"
TEMPLATE="$SCRIPT_DIR/webhook/hooks.json.template"
OUTPUT="$SCRIPT_DIR/webhook/hooks.json"

if [[ ! -f .env ]]; then
  echo "请先创建 .env（可复制 .env.example）"
  exit 1
fi

if [[ -f "$SECRET_FILE" ]]; then
  SECRET="$(cat "$SECRET_FILE")"
  echo "复用已有 Webhook 密钥"
else
  SECRET="$(openssl rand -hex 32)"
  echo "$SECRET" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "已生成新 Webhook 密钥"
fi

if [[ ! -f "$OUTPUT" ]] || ! grep -q "$SECRET" "$OUTPUT" 2>/dev/null; then
  sed "s/__WEBHOOK_SECRET__/$SECRET/g" "$TEMPLATE" > "$OUTPUT"
  echo "已写入 $OUTPUT"
fi

grep -q '^DEPLOY_HOOK_PORT=' .env && sed -i "s/^DEPLOY_HOOK_PORT=.*/DEPLOY_HOOK_PORT=$HOOK_PORT/" .env \
  || echo "DEPLOY_HOOK_PORT=$HOOK_PORT" >> .env

docker compose -f docker-compose.hook.yml build deploy-hook
docker compose -f docker-compose.hook.yml up -d deploy-hook

PUBLIC_URL="${PUBLIC_HOOK_URL:-http://你的公网IP或域名:$HOOK_PORT}"

echo ""
echo "=== Webhook 部署服务已启动 ==="
echo "在 GitHub 仓库 → Settings → Webhooks → Add webhook："
echo "  Payload URL: ${PUBLIC_URL}/hooks/novel-reader-deploy"
echo "  Content type: application/json"
echo "  Secret: （见文件 $SECRET_FILE）"
echo "  事件: Just the push event"
echo ""
echo "推送 master/main 后会自动执行 deploy.sh"
