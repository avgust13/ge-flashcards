#!/usr/bin/env bash
# Sets up (or repairs) the production server for Uchikartuli. Safe to run again.
#
# The server is shared: the Caddy in /opt/edge terminates HTTPS for every site
# and reaches each one over the external docker network `edge`. This script
#   1. creates the `deploy` user, whose GitHub Actions key can do nothing but
#      rsync inside /opt/uchikartuli (forced command `rrsync /opt/uchikartuli`),
#   2. installs /opt/uchikartuli: a static Caddy serving ./site as uchikartuli-web,
#   3. adds the uchikartuli.xyz block to the shared Caddyfile and reloads it.
#
# From the repository root:
#   scp -r deploy root@uchikartuli.xyz:/tmp/uchikartuli-deploy
#   ssh root@uchikartuli.xyz bash /tmp/uchikartuli-deploy/setup-server.sh
# Then run the "Deploy" workflow (or push to main) to upload the site.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP=/opt/uchikartuli
EDGE=/opt/edge
# Public half of the key stored in the repository secret SSH_PRIVATE_KEY.
DEPLOY_KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJPu8kfY2n3uR4o1Bl5vZg3TXejjIZ23zlYO7ExTIPB+ github-actions'

command -v rrsync >/dev/null || { apt-get update && apt-get install -y rsync; }
[ -f "$EDGE/docker-compose.yml" ] || { echo "no shared Caddy in $EDGE" >&2; exit 1; }

# 1. The deploy user: no password; a shell only so that sshd can run the forced command.
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/sh deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf 'command="%s %s",restrict %s\n' "$(command -v rrsync)" "$APP" "$DEPLOY_KEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# 2. The site: configuration owned by root, only ./site writable by deploy.
install -d -m 755 "$APP" "$APP/caddy"
install -d -m 755 -o deploy -g deploy "$APP/site"
install -m 644 "$HERE/docker-compose.yml" "$APP/docker-compose.yml"
install -m 644 "$HERE/caddy/Caddyfile" "$APP/caddy/Caddyfile"
docker network inspect edge >/dev/null 2>&1 || docker network create edge
cd "$APP"
docker compose up -d
docker compose exec -T web caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

# 3. The domain on the shared Caddy (validated before the reload; restored if invalid).
cd "$EDGE"
if ! grep -q 'uchikartuli-web' caddy/Caddyfile; then
  backup="$EDGE/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)"
  cp caddy/Caddyfile "$backup"
  { printf '\n'; cat "$HERE/edge.Caddyfile"; } >> caddy/Caddyfile
  if ! docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
    cp "$backup" caddy/Caddyfile
    echo "the shared Caddyfile did not validate; restored $backup" >&2
    exit 1
  fi
fi
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

echo "ready: the deploy workflow can now upload to deploy@<host>:site/"
