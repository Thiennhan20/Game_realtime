#!/bin/sh
echo "🚀 Starting Game Backend on port 3003..."
cd /app/backend
PORT=3003 node server.js &

echo "🚀 Starting Game Frontend on port 3002..."
cd /app/frontend
PORT=3002 npm run start &

# Wait for Node backend and Next.js frontend to start listening
if command -v nc >/dev/null 2>&1; then
  echo "⏳ Waiting for backend (3003) and frontend (3002) to become ready..."
  while ! nc -z localhost 3002 || ! nc -z localhost 3003; do
    sleep 0.5
  done
else
  echo "⏳ Sleeping for 4 seconds to let services boot up..."
  sleep 4
fi
echo "✅ Backend and Frontend are ready! Starting Caddy..."

echo "🚀 Starting Caddy Proxy on port 8080..."
caddy run --config /app/Caddyfile --adapter caddyfile
