#!/usr/bin/env bash
# Sets up a Raspberry Pi to run Get Grilled Live at every start-up, locked down.
# Run on Raspberry Pi OS Lite (Bookworm or newer), from a copy of the repository:
#   sudo bash pi/install.sh [--keep-ssh]
# Safe to run again: it updates the set-up in place and keeps the PIN, the links and the versions.
set -euo pipefail

KEEP_SSH=no
for a in "$@"; do
  case "$a" in
    --keep-ssh) KEEP_SSH=yes ;;
    *) echo "Unknown option $a"; exit 1 ;;
  esac
done
[ "$(id -u)" = 0 ] || { echo "Please run with sudo: sudo bash pi/install.sh"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR=/opt/getgrilled
STATE_DIR=/var/lib/getgrilled
ETC=/etc/getgrilled
say() { printf '\n== %s\n' "$*"; }

say "Installing Node.js and the firewall"
apt-get update -qq
apt-get install -y -qq nodejs nftables avahi-daemon >/dev/null
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 18 ] || { echo "Node.js 18 or newer is needed (found $(node -v))."; exit 1; }
NODE=$(command -v node)

say "Creating the getgrilled user and folders"
id getgrilled >/dev/null 2>&1 || useradd --system --home-dir "$STATE_DIR" --shell /usr/sbin/nologin getgrilled
install -d -o getgrilled -g getgrilled -m 0755 "$HOME_DIR" "$HOME_DIR/releases" "$HOME_DIR/bin"
install -d -o getgrilled -g getgrilled -m 0700 "$STATE_DIR"
install -d -o root -g root -m 0755 "$ETC"
# The first updater; after that, each signed release brings its own.
install -o getgrilled -g getgrilled -m 0644 "$HERE/update.mjs" "$HERE/bundle.mjs" "$HOME_DIR/bin/"

if [ ! -f "$ETC/getgrilled.env" ]; then
  say "Wi-Fi details for the join QR code on the projector (leave empty to skip)"
  read -r -p "Wi-Fi name the audience joins: " SSID || true
  PASS=""
  [ -n "${SSID:-}" ] && { read -r -s -p "Its password (not shown): " PASS || true; echo; }
  umask 027
  {
    echo "# Get Grilled settings. After a change: sudo systemctl restart getgrilled"
    printf 'GG_WIFI_SSID=%q\n' "${SSID:-}"
    printf 'GG_WIFI_PASS=%q\n' "${PASS:-}"
  } > "$ETC/getgrilled.env"
  chown root:getgrilled "$ETC/getgrilled.env"
  chmod 0640 "$ETC/getgrilled.env"
  umask 022
fi

if [ ! -f "$ETC/release-key.pem" ]; then
  say "Update signing key"
  echo "Updates are only installed if they are signed with your key."
  echo "  1) This is the first Pi: make a new key here"
  echo "  2) Another Pi already has a key: paste its public key (the release-key.pem file)"
  read -r -p "Choose 1 or 2: " CHOICE
  if [ "$CHOICE" = 2 ]; then
    echo "Paste the public key, then press Ctrl+D:"
    cat > "$ETC/release-key.pem"
    chmod 0644 "$ETC/release-key.pem"
  else
    GG_KEY="$ETC/release-key.pem" "$NODE" "$HOME_DIR/bin/update.mjs" --new-key
    read -r -p "Press Enter once the private key is saved as the GitHub secret PI_SIGNING_KEY... " _
  fi
fi

say "Writing the start-up services"
cat > /etc/systemd/system/getgrilled-update.service <<EOF
[Unit]
Description=Get Grilled: install a newer signed version if there is one
Wants=network-online.target
After=network-online.target
Before=getgrilled.service

[Service]
Type=oneshot
User=getgrilled
Group=getgrilled
Environment=GG_HOME=$HOME_DIR GG_KEY=$ETC/release-key.pem
ExecStart=/bin/sh -c 'if [ -f $HOME_DIR/current/pi/update.mjs ]; then exec $NODE $HOME_DIR/current/pi/update.mjs; else exec $NODE $HOME_DIR/bin/update.mjs; fi'
TimeoutStartSec=300
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=$HOME_DIR
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
LockPersonality=yes
CapabilityBoundingSet=

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/getgrilled.service <<EOF
[Unit]
Description=Get Grilled Live
Wants=getgrilled-update.service
After=getgrilled-update.service network.target

[Service]
User=getgrilled
Group=getgrilled
EnvironmentFile=$ETC/getgrilled.env
Environment=GG_PORT=80 GG_STATE=$STATE_DIR NODE_ENV=production
ExecStart=$NODE $HOME_DIR/current/pi/server.mjs
Restart=always
RestartSec=2
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=$STATE_DIR
ReadOnlyPaths=$HOME_DIR
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
SystemCallArchitectures=native
UMask=0077
MemoryMax=1G
TasksMax=64

[Install]
WantedBy=multi-user.target
EOF

say "Adding the getgrilled command"
cat > /usr/local/bin/getgrilled <<EOF
#!/bin/sh
# getgrilled pin | update | use-previous | status | restart | logs
set -e
UP=$HOME_DIR/current/pi/update.mjs
[ -f "\$UP" ] || UP=$HOME_DIR/bin/update.mjs
U="sudo -u getgrilled env GG_HOME=$HOME_DIR GG_KEY=$ETC/release-key.pem $NODE \$UP"
case "\$1" in
  pin) sudo systemctl stop getgrilled; sudo -u getgrilled env GG_STATE=$STATE_DIR $NODE $HOME_DIR/current/pi/server.mjs --set-pin; sudo systemctl start getgrilled ;;
  update) \$U --resume 2>/dev/null || true; sudo systemctl start getgrilled-update && sudo systemctl restart getgrilled; \$U --status ;;
  update-from) T=\$(mktemp -d); cp "\$2"/manifest.json "\$2"/manifest.sig "\$2"/*.ggpkg "\$T"/; chmod -R a+rX "\$T"; \$U --file "\$T" && sudo systemctl restart getgrilled; rm -rf "\$T" ;;
  use-previous) \$U --use-previous && sudo systemctl restart getgrilled ;;
  status) \$U --status; systemctl --no-pager --lines=0 status getgrilled | head -3; hostname -I ;;
  restart) sudo systemctl restart getgrilled ;;
  logs) journalctl -u getgrilled -u getgrilled-update -n 80 --no-pager ;;
  *) echo "Usage: getgrilled pin | update | update-from <folder> | use-previous | status | restart | logs"; exit 1 ;;
esac
EOF
chmod 0755 /usr/local/bin/getgrilled

say "Naming this Pi getgrilled (so devices can open http://getgrilled.local)"
if [ "$(hostname)" != getgrilled ]; then
  hostnamectl set-hostname getgrilled
  sed -i 's/^127\.0\.1\.1.*/127.0.1.1\tgetgrilled/' /etc/hosts
fi

say "Firewall: only the game's web page, and only from the local network"
SSH_RULE=""
[ "$KEEP_SSH" = yes ] && SSH_RULE="tcp dport 22 ip saddr @lan accept"
cat > /etc/nftables.conf <<EOF
#!/usr/sbin/nft -f
# Get Grilled: let in only the game (port 80) from local addresses, plus what the network itself needs.
flush ruleset
table inet getgrilled {
  set lan { type ipv4_addr; flags interval; elements = { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 } }
  chain input {
    type filter hook input priority 0; policy drop;
    iif lo accept
    ct state invalid drop
    ct state established,related accept
    ip protocol icmp accept
    ip6 nexthdr icmpv6 accept
    udp dport 5353 accept comment "getgrilled.local names"
    udp sport 67 udp dport 68 accept comment "address from the router"
    udp dport 546 accept comment "IPv6 address from the router"
    tcp dport 80 ip saddr @lan accept
    tcp dport 80 ip6 saddr fe80::/10 accept
    $SSH_RULE
  }
  chain forward { type filter hook forward priority 0; policy drop; }
}
EOF
systemctl enable --now nftables >/dev/null
nft -f /etc/nftables.conf

if [ "$KEEP_SSH" = no ]; then
  say "Turning off remote log-in (SSH). Run again with --keep-ssh to keep it."
  systemctl disable --now ssh >/dev/null 2>&1 || true
fi

say "Getting the newest signed version"
systemctl daemon-reload
systemctl enable getgrilled-update.service getgrilled.service >/dev/null
if ! systemctl start getgrilled-update.service || [ ! -e "$HOME_DIR/current" ]; then
  echo "No version is installed yet. If you just made the key: add the PI_SIGNING_KEY secret on GitHub,"
  echo "run the 'Raspberry Pi release' workflow (Actions tab > Run workflow), then run: getgrilled update"
  exit 0
fi

if [ ! -f "$STATE_DIR/config.json" ]; then
  say "Choose the host PIN (6 to 12 digits)"
  sudo -u getgrilled env GG_STATE="$STATE_DIR" "$NODE" "$HOME_DIR/current/pi/server.mjs" --set-pin
fi
systemctl restart getgrilled
say "Done. Get Grilled starts by itself whenever the Pi is switched on."
echo "Host:  http://getgrilled.local/host/   or   http://$(hostname -I | awk '{print $1}')/host/"
getgrilled status || true
