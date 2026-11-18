# Get Grilled Live on a Raspberry Pi

The Pi runs the game on its own Wi-Fi so that the host screen, the projector and one tablet per team
stay in step, with no internet needed during the game.

- **Host** opens `http://<pi-address>/host/` and signs in with the host PIN.
- **Devices** in the host's top bar lists one link (and QR code) per team, plus one for the projector.
  The first device to open a link keeps it; any other device is turned away. The host sees who has
  joined and who is online, and can **reissue** a link (the old one stops working and its device is
  disconnected) or **remove access**. **End the event** stops every link.
- **Team tablets** show the board, their score and "Your pick!" on their turn, and a box to type the
  final answer, which only the host sees.
- **Projector** shows what the room sees (the same view as the host edition's audience window).

What other devices receive is cut down in the host's browser before it leaves (`src/lib/views.ts`):
questions not on show and every answer not yet revealed are blanked, and golden, steal and audience
tiles stay secret until opened.

## Try it on a computer

    npm install
    npm run build:pi              # builds site/ (app + host edition) and stamps site/version.json
    node pi/server.mjs --set-pin  # choose the host PIN (6 to 12 digits)
    GG_PORT=8080 node pi/server.mjs

Then open `http://localhost:8080/host/`.

## Security in short

- Host PIN stored only as a salted scrypt hash; 5 wrong tries lock sign-in for 5 minutes. One host
  session at a time (signing in again ends the old one). Cookies are HttpOnly and SameSite=Strict.
- Team and projector links are random 192-bit keys, one device each; the key leaves the address bar
  as soon as it is used.
- Every POST must come from the game's own pages (Origin check plus a custom header).
- The server answers only to IP addresses, `localhost`, `getgrilled.local` and `getgrilled.lan`
  (blocks DNS-rebinding tricks), serves only files inside the built site, caps request sizes,
  connections per device and in total, and sends the same strict security headers as the web app.
- No third-party server code: Node's own modules only.

`npm run e2e:pi` runs the browser and attack checks. Full Pi set-up (Wi-Fi router, start on boot,
read-only system, signed updates with an offline fallback) comes in the next stage.
