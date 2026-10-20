# The Board website (the-board.co.il)

Instructions for Claude when anyone on the team (Noam, Adi, Ethan) asks to change the site.

## How the site works
- Static site, no build step. Every push to `main` goes live on https://the-board.co.il within about a minute (Cloudflare Pages).
- Files: `index.html` (landing page), `privacy.html`, `accessibility.html`, `terms.html`.
- Everything is in one file per page: HTML, CSS and JS inline.

## Rules
- All site copy is Hebrew, right to left. Talk to the person in whatever language they write in.
- Never use the em dash or long dash anywhere in the copy. Use a comma, colon, brackets or a full stop.
- The board price (4,000 ₪) appears only in the "השקעה בבורד" box in the boards section. Don't add prices elsewhere unless asked.
- Keep all three founders titled שותף מייסד / שותפה מייסדת.
- Do not display personal phone numbers. Contact email is info@the-board.co.il.
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

## Member area, CRM and API (added 20.10.2026)
- `/members/` member area (Hebrew): Google sign-in, My board (round table), profile, templates and prompts, NDA signing.
- `/crm/` founders' CRM (English, mobile first): pipeline, members, boards, agreement, mark paid, not a fit.
- `/join/` membership agreement signing page (opened from the emailed link).
- `functions/api/[[route]].js` is the API (Cloudflare Pages Function). `functions/_docs.js` holds the Hebrew agreement and NDA texts: bump `version` whenever the text changes.
- Data lives in the Google Sheet "The Board CRM" (tabs Leads, Members, Boards, Sessions, UTM links, Summary). Columns are found by their header name, so headers must not be renamed. New columns can be added at the end.
- Secrets (sheet pipe key, session secret) live in the D1 database `the-board-config`, table `config`. Never put secrets in this repo, it is public.
- Make scenarios: 18 (questionnaire to Leads + team email), 19 (sheet pipe used by the API), 20 (mailer).
- Do not change the API, sign-in or signing logic unless explicitly asked.
- Make scenario 21 is the calendar pipe: seating a member on a board (CRM close, member board/status change, new member) sends them a Google Calendar invite for every upcoming session, from the "The Board · מפגשי הבורדים" calendar on Noam's account. Changing a board's dates, hours, location or Hebrew name updates everyone's invites. Location and hours come from the Boards tab (Hours as HH:MM-HH:MM).
- Language switch: `/assets/i18n.js` adds an EN/עב button to the member area and the agreement page. Hebrew stays the source; when you add Hebrew UI text there, add its English to the `EN` dictionary in that file.
