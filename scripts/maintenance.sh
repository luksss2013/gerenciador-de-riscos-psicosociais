#!/bin/bash
# System maintenance cron script.
# Calls the NR-1 Copsoq backend maintenance endpoints.
# Usage: bun run scripts/maintenance.sh
#
# This script is invoked by the scheduled cron job (agentTurn payload).
# It logs in with a maintenance credential, then calls:
#   1. POST /api/v1/system/close-expired  (RB-07)
#   2. POST /api/v1/system/run-pending-scoring  (RB-06)
#   3. POST /api/v1/system/cleanup  (idempotency + purge)
#
# Environment variables:
#   MAINTENANCE_EMAIL — login email (default: maintenance@nr1copsoq.local)
#   MAINTENANCE_PASSWORD — login password (default: set during setup)
#   BASE_URL — API base (default: http://localhost:3000)

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${MAINTENANCE_EMAIL:-maintenance@nr1copsoq.local}"
PASSWORD="${MAINTENANCE_PASSWORD:-MaintenancePass123!}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting maintenance..."

# Login to get session cookie
COOKIE_FILE=$(mktemp)
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  -w "\n%{http_code}" 2>&1)
LOGIN_HTTP=$(echo "$LOGIN_RESP" | tail -1)

if [ "$LOGIN_HTTP" != "200" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Login failed (HTTP $LOGIN_HTTP) — maintenance user may not exist. Skipping."
  rm -f "$COOKIE_FILE"
  exit 0
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Login OK. Running maintenance..."

# 1. RB-07: close expired assessments
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] RB-07: close-expired..."
curl -s -b "$COOKIE_FILE" -X POST "${BASE_URL}/api/v1/system/close-expired" 2>&1 || true
echo ""

# 2. RB-06: run pending scoring
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] RB-06: run-pending-scoring..."
curl -s -b "$COOKIE_FILE" -X POST "${BASE_URL}/api/v1/system/run-pending-scoring" 2>&1 || true
echo ""

# 3. Cleanup (sessions, tokens, audit logs)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cleanup..."
curl -s -b "$COOKIE_FILE" -X POST "${BASE_URL}/api/v1/system/cleanup" 2>&1 || true
echo ""

rm -f "$COOKIE_FILE"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Maintenance complete."
