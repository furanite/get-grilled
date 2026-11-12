# Scholar reviews

Put the files that scholars send you from the app's **Scholar review** page here (one `.json` file per
review, for example `review-Shaykh-Ahmad-2026-11-20.json`). On GitHub you can do this with
**Add file > Upload files** in this folder.

When the site is next built:

- any line that a scholar marked as having a problem with **correctness** or **adab** is taken out of
  the game until it is fixed (editing the line gives it a new id, so it then needs a fresh review);
- `questions/REVIEW-STATUS.md` lists every flagged line with the scholar's note and suggested
  correction, then every approved line.

Scholars can open the review page directly at the site address followed by `#review`, for example
https://furanite.github.io/ilm-munaafasah/#review
