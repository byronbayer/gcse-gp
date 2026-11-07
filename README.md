# GCSE GP

Racing-themed GCSE maths practice, timed like TTRS, with a parent dashboard.

- **index.html**: his app (phone or PC). Each race weekend runs easiest to hardest: Free Practice (quickfire), Quali 1, Quali 2, Race. Inside each session the questions also start easy and build up (Foundation before Higher, then by target time). There's also Training by strand.
- **dashboard.html**: the Pit Wall. Accuracy and pace over time, strand breakdown, topics ranked weakest first, every answer he gave.

## How results get back to you

**Automatic (recommended):** every session posts to a Google Sheet you own, with no button for him to press. Sessions he abandons are sent too, marked DNF. With no signal, results are saved on his phone and sent next time he opens the app. Your dashboard reads them back using a private parent key.

Setup (about 5 minutes):
1. Create a new Google Sheet, e.g. "GCSE GP results".
2. **Extensions → Apps Script**. Delete what's there, paste in [apps-script/Code.gs](apps-script/Code.gs), save.
3. Pick `setup` in the function dropdown, press **Run**, and allow the permissions. Copy the **PARENT KEY** from the Execution log.
4. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and copy the URL ending `/exec`.
5. Put that URL in `resultsEndpoint` in [js/config.js](js/config.js) and push. Open the dashboard and enter the parent key once.

The `/exec` URL is public, because the repo is. Anyone who finds it could post junk to the sheet, but they can't read anything without the parent key, which never goes in the repo.

**Manual fallback:** if `resultsEndpoint` is blank, he gets a **Send results to Dad** button instead (WhatsApp, email or copy link). The link carries the results, and opening it adds them to the dashboard in that browser.

## The monthly loop

1. He does the current round.
2. You open the links he sends. On the dashboard, tap **Copy for Claude** and paste it into a chat in this folder.
3. Claude analyses the results, adds them to `data/results.json`, writes the next round in `js/packs.js` (weighted towards his weak topics) and sets `CURRENT` to it.
4. Push to GitHub. His app link stays the same and picks up the new round automatically.

## Publishing on GitHub Pages

```sh
git init && git add . && git commit -m "GCSE GP"
gh repo create gcse-gp --public --source=. --push
gh api -X POST repos/{owner}/gcse-gp/pages -f "source[branch]=main" -f "source[path]=/"
```

The site will be at `https://<your-username>.github.io/gcse-gp/`. Send him that link. On his phone: Share → **Add to Home Screen** and it opens like an app.

Free GitHub Pages needs a **public** repo. Use his first name only, and leave `js/config.js` blank (no phone number or email) unless you're OK with those being public.

## Running locally

ES modules don't load from `file://`. Serve the folder instead, e.g. `npx serve .`, then open http://localhost:3000.

## Adding questions

Each topic in `js/questions.js` is a generator, so every question is different each time but tests the same skill. Each topic has a `target` time in seconds. Answers slower than 1.5× the target are flagged as **Slow** on the dashboard.
