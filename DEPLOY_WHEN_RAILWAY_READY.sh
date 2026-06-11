#!/bin/bash
# =====================================================================
# DEPLOY SCRIPT — Run this when Railway auth service recovers
# =====================================================================
# OPTION 1: Normal login (opens browser or use --browserless for code)
#   railway login
#   cd backend && railway up

# OPTION 2: Use a project token (generate from Railway dashboard → Settings → Tokens)
#   export RAILWAY_TOKEN=<your-project-token>
#   cd backend && railway up

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "=== Verifying local build is ready ==="
if [ ! -f "$BACKEND_DIR/admin.html" ]; then
  echo "ERROR: admin.html missing. Rebuild dashboard first."
  exit 1
fi
if [ ! -d "$BACKEND_DIR/_next" ]; then
  echo "ERROR: _next/ directory missing. Rebuild dashboard first."
  exit 1
fi

echo "=== admin.html size: $(wc -c < "$BACKEND_DIR/admin.html") bytes ==="
echo "=== Page chunk: $(grep -o 'page-[a-f0-9]*.js' "$BACKEND_DIR/admin.html" | head -1) ==="

echo ""
echo "=== Deploying to Railway ==="
cd "$BACKEND_DIR"
railway up --detach

echo ""
echo "=== Deploy triggered. Dashboard will be live at: ==="
echo "    https://wenzla-backend-production.up.railway.app/dashboard"
echo ""
echo "=== Test login: admin / <use ADMIN_PASSWORD from Railway env> ==="
