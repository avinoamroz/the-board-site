# The Board website (the-board.co.il)

Instructions for Claude when anyone on the team (Noam, Adi, Ethan) asks to change the site.

## How the site works
- Static site, no build step. Every push to `main` goes live on https://the-board.co.il within about a minute (Cloudflare Pages).
- Files: `index.html` (landing page), `privacy.html`, `accessibility.html`, `terms.html`.
- Everything is in one file per page: HTML, CSS and JS inline.

## Rules
- All site copy is Hebrew, right to left. Talk to the person in whatever language they write in.
- Never use the em dash or long dash anywhere in the copy. Use a comma, colon, brackets or a full stop.
- No prices anywhere on the site.
- Keep all three founders titled שותף מייסד / שותפה מייסדת.
- Do not add personal phone numbers. Contact email is info@the-board.co.il.
- Do not touch the fit questionnaire logic unless explicitly asked: the form posts to a Make webhook (`hook.us1.make.com/...`) that writes to the leads Google Sheet and emails the founders. Field names, the consent checkbox and the hidden honeypot field must stay as they are.
- Keep the legal links in the footer and the skip link at the top.
- If you change something the privacy policy describes (new form fields, new third party tools), update `privacy.html` and its date too.

## Workflow
1. Make the change.
2. Show the person exactly what changed (before and after text) before pushing, unless they said to just do it.
3. Commit with a clear message in English and push to `main`.
4. Open https://the-board.co.il after a minute and confirm the change is live.
5. Every change is in git history, so anything can be rolled back.

## Download copy for offline editing
- `download/the-board-landing.html` is a copy of `index.html` that team members download (https://the-board.co.il/download/the-board-landing.html), edit with their own Claude, and email back to Noam.
- Whenever `index.html` changes, copy it over `download/the-board-landing.html` in the same commit.
- When an edited file comes back: diff it against the current `index.html`, apply only the content changes, check the form, webhook, consent and honeypot are untouched and there are no em dashes, then push.
