#!/usr/bin/env bash
set -euo pipefail
# A persistent private key enables authenticated single-node replica-set transactions.
keyfile=/data/db/.trinacria-replica-key
if [ ! -s "$keyfile" ]; then
  head -c 512 /dev/urandom | base64 > "$keyfile"
fi
chmod 600 "$keyfile"
chown mongodb:mongodb "$keyfile"
exec docker-entrypoint.sh mongod --replSet trinacria --bind_ip_all --keyFile "$keyfile"
