#!/bin/sh
set -e

cd /migrate
if ! node node_modules/prisma/build/index.js migrate deploy; then
  echo "migrate deploy failed: check MySQL bind-address, the DB user's host grant (e.g. 'user'@'172.%'), DOCKER_DB_HOST, or use docker-compose.hostnet.yml" >&2
  exit 1
fi

cd /app
exec node server.js
