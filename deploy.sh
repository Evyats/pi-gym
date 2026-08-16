#!/usr/bin/env bash
set -euo pipefail

readonly app_user="pi-gym"
readonly repository="/opt/pi-gym/app"
readonly backend="${repository}/backend"
readonly venv="/opt/pi-gym/venv"
readonly frontend_build="${repository}/frontend/dist"
readonly web_root="/var/www/pi-server/gym"

if (( EUID != 0 )); then
    echo "Run this script with sudo." >&2
    exit 1
fi
for directory in "$repository" "$backend" "$venv"; do
    if [[ ! -d "$directory" ]]; then
        echo "Required directory not found: $directory" >&2
        exit 1
    fi
done
current_branch="$(runuser -u "$app_user" -- git -C "$repository" branch --show-current)"
if [[ "$current_branch" != "deploy" ]]; then
    echo "Expected the repository to be on deploy, found: $current_branch" >&2
    exit 1
fi

echo "Pulling ready-to-run deployment..."
runuser -u "$app_user" -- git -C "$repository" pull --ff-only origin deploy
if [[ ! -f "${frontend_build}/index.html" ]]; then
    echo "Built frontend not found: ${frontend_build}/index.html" >&2
    exit 1
fi

echo "Installing backend dependencies..."
runuser -u "$app_user" -- "${venv}/bin/python" -m pip install -r "${backend}/requirements.txt"
echo "Publishing frontend..."
install -d -m 755 -o root -g root "$web_root"
cp -a "${frontend_build}/." "${web_root}/"
find "$web_root" -type d -exec chmod 755 {} +
find "$web_root" -type f -exec chmod 644 {} +
chown -R root:root "$web_root"

echo "Refreshing service configuration..."
install -m 644 "${repository}/deploy/systemd/pi-gym.service" /etc/systemd/system/
install -m 644 "${repository}/deploy/systemd/pi-gym-backup.service" /etc/systemd/system/
install -m 644 "${repository}/deploy/systemd/pi-gym-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now pi-gym
systemctl enable --now pi-gym-backup.timer
systemctl restart pi-gym

echo "Waiting for the API..."
for attempt in {1..60}; do
    if curl --fail --silent http://127.0.0.1:8002/gym/api/health >/dev/null; then
        echo "Deployment completed successfully."
        exit 0
    fi
    sleep 1
done
echo "Deployment finished, but the API health check failed." >&2
echo "Inspect it with: sudo journalctl -u pi-gym -n 50 --no-pager" >&2
exit 1
