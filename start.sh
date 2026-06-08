#!/bin/sh
echo "🚀 Starting Game Backend on port 3003..."
cd /app/backend
PORT=3003 node server.js &

echo "🚀 Starting Game Frontend on port 3002..."
cd /app/frontend
PORT=3002 npm run start &

echo "🚀 Starting Caddy Proxy on port 8080..."
caddy run --config /app/Caddyfile --adapter caddyfile
