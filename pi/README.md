# Munaafasatul Ilm Live on a Raspberry Pi

The Pi runs the game on its own Wi-Fi so that the host screen, the projector, one tablet per team and
the audience's phones stay in step, with no internet needed during the game.

- **Host** opens `http://ilm.local/host/` (or `http://<pi-address>/host/`) and signs in with the host PIN.
- **Devices** in the host's top bar lists one link (and QR code) per team, plus one for the projector.
  The first device to open a link keeps it; any other device is turned away. The host sees who has
  joined and who is online, and can **reissue** a link (the old one stops working and its device is
  disconnected) or **remove access**. **End the event** stops every link.
- **Team tablets** show the board, their score and "Your pick!" on their turn, and a box to type the
  final answer, which only the host sees.
- **Projector** shows what the room sees (the same view as the host edition's audience window).
- **Audience phones** (turned on in Devices): people scan the join card on the
  projector, answer each question from four options, and see the room's result when the answer is
  revealed. No names, no sign-up, nothing stored about them.

What other devices receive is cut down in the host's browser before it leaves (`src/lib/views.ts`):
questions not on show and every answer not yet revealed are blanked, and golden, steal and audience
tiles stay secret until opened.

## Set-up, step by step

You need: a Raspberry Pi 5 (4 GB is plenty) with its power supply, a 32 GB or larger microSD card, a
Wi-Fi router of your own, a network cable, and a computer to prepare the card.

### 1. The router

1. Give the Wi-Fi a name and a strong password, and choose **WPA3** if the router offers it. This is
   the network the teams and the audience join. The password goes on the projector's join card as
   a QR code, so everyone in the room knows it. With WPA2, anyone who knows the password and has the
   right tools can read other people's Wi-Fi traffic, including the host's sign-in. WPA3 stops that.
   If the router has only WPA2, plug the **host laptop into the router by cable** (or put it on a
   second, private Wi-Fi whose password is not shown).
2. Turn on **client isolation** (also called *AP isolation*) for the Wi-Fi, so phones can't see or
   reach each other. The Pi is plugged in by cable, so everyone can still reach it. Don't use the
   router's separate *guest network* for this: many routers block guests from everything on the
   cable, Pi included. After setting it up, check from a phone that `http://ilm.local` opens.
3. Change the router's own admin password, and turn off WPS and remote (internet) management.
4. In the router's DHCP settings, give the Pi a **fixed address** (an "address reservation") once it
   has joined, so links and QR codes keep working.
5. The router only needs internet before the event, for the Pi to fetch updates. During the game
   it can stay offline.

### 2. The Pi's card

1. On your computer, open **Raspberry Pi Imager** and choose **Raspberry Pi OS Lite (64-bit)**.
2. In its settings (the gear or "Edit settings"): set a user name and a strong password, your time
   zone, and turn on SSH for now. Leave the Pi's own Wi-Fi empty: it uses the cable.
3. Write the card, put it in the Pi, plug the Pi into the router by cable, and switch it on.

### 3. Install Munaafasatul Ilm

On the Pi (with a keyboard and screen, or over SSH from your computer):

    sudo apt-get install -y git
    git clone https://github.com/furanite/ilm-munaafasah.git
    cd ilm-munaafasah
    sudo bash pi/install.sh

The script asks:

- **The Wi-Fi name and password** for the join card (leave empty to skip the Wi-Fi QR code).
- **The update key.** On the first Pi, choose *1*. It shows a private key once: copy everything
  between the lines into GitHub (repository **Settings > Secrets and variables > Actions > New
  repository secret**, name `PI_SIGNING_KEY`). On a second Pi, choose *2* and paste the public key
  from the first one (`/etc/ilm/release-key.pem`).

Then, on GitHub, open **Actions > Raspberry Pi release > Run workflow** once. From then on a new
signed release is made by itself on every change to the game. Back on the Pi:

    ilm update     # fetches and checks the release
    ilm pin        # choose the host PIN (6 to 12 digits)

Open `http://ilm.local/host/` on the host's laptop or tablet. If that name doesn't open,
use the address from `ilm status`.

The script also turns **SSH off** at the end. To keep it (for example to manage the Pi from your
computer), run it as `sudo bash pi/install.sh --keep-ssh`. It's safe to run the script again.

### 4. On the day

1. Switch on the router, then the Pi. The game starts by itself within a minute.
2. Sign in at `/host/`, set up the game, then open **Devices**: give each team its link or QR code
   and open the projector's link on the projector's computer.
3. For the audience, tick **Let the audience play along on their phones** and **Show the join QR
   code on the projector**, and untick the QR code once people are in.
4. Afterwards, **End the event** stops every link.

### The buzzer box on the Pi

Chrome and Edge only let a page talk to a USB device (the buzzer box) over a secure address, and the
Pi uses plain `http`. On the host laptop, once: open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
(`edge://flags/...` in Edge), add `http://ilm.local,http://<the Pi's number address>`, choose
**Enabled** and restart the browser. The **Buzzers** button in the game explains the same if the box
is blocked. (Plugging the box into the Pi itself, so no browser setting is needed, is a possible
later improvement.)

## Updates

The release is built in one GitHub Actions job and signed in a second job that installs nothing
from npm, so third-party build tools never run where the signing key is.

- At every start-up, the Pi asks GitHub for the newest Pi release. It installs it only if:
  - its signature matches the key saved on the Pi at set-up;
  - the download matches the signed SHA-256;
  - every file matches the game's own list; and
  - it is newer than what the Pi runs, so an old release can't be replayed.
- **No internet:** the Pi starts the version it already has. It keeps the last two versions.
- **Go back:** `ilm use-previous` switches to the version before (works offline). Run it
  again to switch back.
- **From a USB stick:** copy the three files of a release (`manifest.json`, `manifest.sig` and the
  `.ggpkg`) to a folder, then `ilm update-from /media/<stick>/<folder>`. Same checks.
- `ilm status` shows the versions, `ilm logs` shows what happened.

## Lock-down

- **Firewall** (`/etc/nftables.conf`): only the game's page (port 80), and only from local
  addresses. Everything else coming in is dropped, including SSH unless you kept it.
- **The game runs as its own user** with systemd's sandbox:
  - It can't change its own code (`/opt/ilm` is read-only to it).
  - It can write only its PIN and links folder (`/var/lib/ilm`).
  - It has no other privileges, and memory and process limits are set.
- **The updater** runs as that same user and can write only the versions folder. It can't install
  anything that isn't signed.
- **Read-only card:** Raspberry Pi OS's "overlay file system" would make the card fully read-only,
  but then downloaded updates would vanish at every restart. So the Pi stays writable, with the
  sandbox above limiting what the game can touch. If you prefer a fully read-only card and update
  by hand: install, update, then run `sudo raspi-config` > *Performance* > *Overlay file system*.
  Turn it off again before updating.
- **Physical access:** keep the Pi out of reach of players, because anyone holding the card can
  read it.

## Security in short

- Host PIN stored only as a salted scrypt hash. 5 wrong tries lock sign-in from that device for
  5 minutes, and 60 wrong tries from all devices within 10 minutes lock it for everyone for 5
  minutes, so one person can't lock the host out but guessing stays hopeless. One host
  session at a time (signing in again ends the old one). Cookies are HttpOnly and SameSite=Strict.
- Team and projector links are random 192-bit keys, one device each; the key leaves the address bar
  as soon as it is used.
- Every POST must come from the game's own pages (Origin check plus a custom header).
- The server answers only to IP addresses, `localhost`, `ilm.local` and `ilm.lan`
  (blocks DNS-rebinding tricks), serves only files inside the built site, caps request sizes,
  connections per device and in total, and sends the same strict security headers as the web app.
- No third-party server code: Node's own modules only.

## Test day results

`npm run e2e:pi-load` runs a simulated event: 150 phones (each from its own address), four team
tablets and the projector, 10 questions, with attacks running alongside. On a 4-core test machine:

| What | Result |
| --- | --- |
| A question reaching all 150 phones | 4 ms typical, 10 ms slowest |
| The reveal reaching all 150 phones | 4 ms typical, 7 ms slowest |
| An answer being taken | 1 ms typical, 6 ms slowest |
| Host's count matching the answers | 10 of 10 rounds |
| Server memory / processor time for the whole run | 90 MB / under 2 seconds |
| 600 phones (the limit) | 22 ms slowest; phone 601 is told the room is full |

A Pi 5 is a few times slower than the test machine, which still leaves a wide margin. The real limit
in a hall is the Wi-Fi: each phone loads about 180 kB once (sent compressed), so 150 phones need
about 27 MB at the start. A good router delivers that in a few seconds, so let people join before
the game begins.

Attack checks that ran during the load (all refused or contained): answering twice, answering an
old question, made-up options, answers without joining, answer floods, a phone calling host actions,
cross-site posts, other host names, oversized requests, endless live feeds from one address, and
300 half-sent "slow" connections (phones kept working, and the slow ones were dropped after 10 s).

## For developers

    npm install
    npm run build:pi              # builds site/ (app + host edition) and stamps site/version.json
    node pi/server.mjs --set-pin  # choose the host PIN (6 to 12 digits)
    GG_PORT=8080 node pi/server.mjs

Then open `http://localhost:8080/host/`. `npm run pack:pi` makes `release/` (bundle and manifest;
signed if `PI_SIGNING_KEY` is set). `npm run e2e:pi` runs the browser and attack checks, and
`npm run e2e:pi-update` runs the updater checks (bad signatures, changed files, replays, offline,
going back), and `npm run e2e:pi-load` runs the test day above (`PHONES=600` for the full room).
