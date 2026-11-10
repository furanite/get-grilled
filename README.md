# Get Grilled

A quiz-board game for team competitions, with seven themes, golden tiles, Arabic mode and a category builder.

## Run it

    npm install
    npm run dev          # local development
    npm run build        # production build in dist/
    npm run build:host   # host edition (audience screen) in dist-host/
    npm run build:site   # both, in one folder ready to upload: site/ and site/host/

## Hosting

Every push to `main` builds and publishes both versions to GitHub Pages (`.github/workflows/deploy.yml`):
the app at `/` and the host edition at `/host/`. The same `site/` folder can also be uploaded to
Cloudflare Pages or Netlify, which also apply the security headers in `site/_headers`.

## Questions

Built-in questions live in `questions/*.txt`, one file per category:

    id: statics
    name: Statics
    nameAr: الاستاتيكا
    ## 100
    Clue text :: Answer text

`npm run packs` checks every file (duplicates, missing answers, empty levels) and writes `public/packs/`.
A game draws one question per level from each pool and avoids repeats until a pool runs out.

## Tests

    npm test             # unit tests (game logic, Friday lock, storage, question files)
    npm run e2e          # browser tests: full games, every theme, Arabic, builder, phone width

## Rules worth knowing

- The Heritage theme opens on Fridays from 12:00 to midnight, Riyadh time (`src/lib/themes.ts`).
- Custom categories are saved in the browser. Use Export/Import to move them between devices.
