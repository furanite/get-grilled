# Get Grilled

A quiz-board game for team competitions: 68 built-in university categories, seven themes with their own
music, special tiles and rounds, tournaments, team introductions, buzzers, and a Raspberry Pi version for
team tablets and audience phones. No server, no accounts, and it works offline once loaded.

Live: https://furanite.github.io/get-grilled/ (host edition with the projector screen at `/host/`).
The Islamic edition, Munaafasatul Ilm, is built from this code and lives at
https://furanite.github.io/ilm-munaafasah/ (repository `furanite/ilm-munaafasah`).

## What's in the game

- **Board:** up to 6 categories, 5 levels (100 to 500), 2 to 4 teams, golden tiles, optional deductions.
  Each category draws one question per level at random and avoids repeats across games.
- **Overall difficulty:** Easy, Balanced (the default), Standard or Hard. Points stay the same; the setting
  changes which question levels each row draws from.
- **Categories:** 68 built-in, grouped as Engineering, CCES, General, Finance & Economics, Law,
  Architecture & Design, and Languages & Humanities. 16 have Arabic clues; the rest are English only.
  Picture questions use drawings made for the game and credited Wikimedia Commons photos.
- **Fun extras:** steal and audience tiles, streak bonus, comeback picks, a special round after the board
  (picture round, true or false, case file, translate it, clue by clue, odd one out), a 60-second
  lightning round, a secret final question, and a sudden-death tie-breaker.
- **Game types:** single game, or a tournament of up to 8 rounds (board, double-points board, lightning,
  final) with up to 12 categories. Optional category vote by teams, audience and host. Seven themed nights.
- **Event tools:** animated team introductions with per-team music, waiting screen with logos and a
  countdown, competition bracket (Men's and Women's divisions), game log and judges' sheet (print or CSV),
  printable backup sheet, flag-a-question list, score adjustments with undo, time limits per clue, per level
  and per game.
- **For study:** question files that instructors make and students open, solo practice mode, study tips
  and a Rules pop-up.
- **Display:** seven themes (Heritage opens Fridays 12:00 to midnight, Riyadh time), Arabic layout, larger
  text, colour-blind friendly team colours, keep-awake, optional read-aloud, Reduce effects.
- **Legal:** Terms of use and Privacy notice (English and Arabic, Arabic binding), version in
  `src/lib/legal.ts`. Owner: Moinuddeen. No contact email by the owner's choice.

## Run it

    npm ci
    npm run dev          # local development
    npm run build        # production build in dist/
    npm run build:host   # host edition (audience screen) in dist-host/
    npm run build:site   # both, in one folder ready to upload: site/ and site/host/
    npm run build:pi     # the site plus the Raspberry Pi server files

## Hosting

Every push to `main` builds and publishes both versions to GitHub Pages (`.github/workflows/deploy.yml`):
the app at `/` and the host edition at `/host/`. Settings > Pages > Source must be **GitHub Actions**; with
"Deploy from a branch" a second build races this one and the site can go blank. Pages can't send headers,
so the build writes the security policy into `index.html`. The same `site/` folder can also be uploaded to
Cloudflare Pages or Netlify, which also apply the headers in `site/_headers`.

## Raspberry Pi version (Get Grilled Live)

A Pi 5 on its own Wi-Fi router serves the game with no internet: host with a PIN, projector, one tablet per
team (single-device links), and up to 600 audience phones answering from four choices. It updates itself
from signed GitHub releases (`.github/workflows/pi-release.yml`, needs the `PI_SIGNING_KEY` secret). Set-up,
updates, lock-down and test results are in `pi/README.md`. Not yet tried on real hardware.

## Buzzers

Light-up buttons wired to a Raspberry Pi Pico plug into the host's laptop by USB and show the buzz
order, with ties, on the clue card and the audience screen (Chrome or Edge). Parts, wiring and the
Pico program are in `buzzer/` (start with `buzzer/README.md`); an illustrated, printable guide is at
`public/buzzer-guide.html` and opens from the Buzzers window. Add `?buzzsim=1` to the address to
rehearse with a pretend box. Not yet tried on real hardware.

## Questions

Built-in questions live in `questions/*.txt`, one file per category:

    id: statics
    name: Statics
    nameAr: الاستاتيكا
    group: engineering
    ## 100
    Clue text :: Answer text

Arabic lines go in `questions/ar/<same file>`, one per English question. Pictures go at the end of a clue as
`{img:name.svg}` (sources in `questions/img/`); every photo needs a credit in `questions/img/credits.json`.
Themed nights are in `questions/nights.json`. `npm run packs` checks every file (duplicates, missing answers,
empty levels, Arabic line counts, credits) and writes `public/packs/`. Question ids are a hash of the clue, so
edits don't reset which questions were played. Lines waiting for a specialist are listed in
`questions/TO-VERIFY-*.md`.

## Tests

    npm test             # unit tests (game logic, packs, Terms, honorifics, storage, question files)
    npm run e2e          # browser tests: full games, every theme, Arabic, builder, phone width
    npm run e2e:host     # host edition and audience window
    npm run e2e:extras   # special tiles and rounds
    npm run fit          # every screen fits from phone to projector (also fit:host)
    npm run build:pi && npm run e2e:pi    # Pi server, devices, audience phones (also e2e:pi-update, e2e:pi-load)

Browser tests seed Terms consent and the study-tips flag; bump the seeds in `e2e/` when `termsVersion` changes.

## Rules worth knowing

- Custom categories, the saved game and every other setting stay in the browser (listed in the Privacy
  notice). Use Export/Import or question files to move questions between devices.
- New CSS must stay safe for older Chrome (the i3 touch screens): `css-fallbacks.mjs` adds fallbacks for
  `color-mix`; avoid bare `:has` in shared selector lists.
- Everything (fonts, sounds, pictures) is bundled; the security policy blocks outside URLs.
- Never use the Jeopardy! name, look, music or clues. Points only: no wagering, no raffles.

## Documentation

The user guide, host guides, hosting guide and competition proposals are kept as shared documents in the
project; ask the owner for links.
