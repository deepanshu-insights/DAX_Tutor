# DAX Studio — Interactive DAX Learning Lab

A DAX-only learning website with an in-browser learning simulator, bilingual English/Hinglish UI, guided curriculum, practice challenges, sample dataset explorer, AI tutor (Google AI Studio/Gemini and Groq), saved lessons, notebook, theme control and local progress tracking.

## What works without AI keys
- Guided DAX curriculum and lesson navigation
- Formula editor, basic syntax checks, Ctrl/Cmd+Enter to run
- Curated DAX teaching simulator against a 24-row sample Orders table
- Eight practice challenges with hints and answer checks
- Search, lesson completion, bookmarks, notebook, CSV export, progress export
- English/Hinglish switch and dark mode

## Animated formula learning + step-by-step IDE (v1.1)
- **Lessons:** every lesson now has a "Watch this formula work inside" panel. It animates the walkthrough formula over the 24-row Orders table: filter context fades out excluded rows, then each row is processed with a running total (SUM, COUNTROWS, AVERAGE, DISTINCTCOUNT, SUMX, MAX, MIN, DIVIDE, CALCULATE filters). Lessons whose formula is outside this subset show a simplified demo of the main function they teach.
- **Playground IDE:** the new **Step-by-step** button runs your own formula one step at a time. Use Back / Next, Play / Pause, speed, the step slider, or the keyboard (left/right arrows, space). The active code token is highlighted, and the row table shows which rows are in scope, which one is being processed, and the value it contributed.
- Explanations follow the English/Hinglish switch. Animations are disabled for users who prefer reduced motion.
- Code lives in `public/dax-visual.js` (loaded at the end of `index.html`).
- Fixed: `SUM(Orders[Sales])` and `AVERAGE(...)` in Run formula returned NaN because of a lower-case column lookup.

## DAX interpreter, Explain mode and advanced practice (v1.2)
- **Real interpreter** (`public/dax-engine.js`): a tokenizer, parser and evaluator with filter context, row context, context transition, `VAR/RETURN`, several measures per editor and arithmetic/logic operators. It replaces the old pattern-matching simulator, so nested and combined formulas now run.
- Supported: SUM, AVERAGE, MIN, MAX, COUNT, COUNTROWS, DISTINCTCOUNT, SUMX, AVERAGEX, MINX, MAXX, CALCULATE (boolean, table, ALL, REMOVEFILTERS, ALLEXCEPT filters), FILTER, ALL, VALUES, DISTINCT, DIVIDE, IF, SWITCH, AND, OR, NOT, ISBLANK, BLANK, COALESCE, ROUND, ABS, SELECTEDVALUE, HASONEVALUE, RANKX, YEAR, MONTH. Built-in measures: [Total Sales], [Total Profit], [Order Count].
- **Explain evaluation:** shows every function call as an expandable tree with its result, the filter context it ran in and a plain-language explanation (English/Hinglish).
- **Filter-context selectors** (Region/Category) act like slicers: one measure, different answers.
- **Syntax check** now reports the exact line and column of the problem.
- **Practice:** answers are graded by *result* in 4 filter contexts, so any correct formula passes. 8 new advanced challenges (16 total), Explain and Solution buttons. The answer box no longer starts pre-filled with the solution.
- Not yet executable: time-intelligence functions (need a Calendar table), TOPN, ADDCOLUMNS/SUMMARIZE, FORMAT, relationships (the sample model has one table).

## AI provider switch (v1.3)
- **Settings → AI provider** switches the AI Tutor between Google Gemini and Groq. The choice and a custom model name per provider are saved in this browser (`daxstudio-ai-v1`); API keys still live only in Netlify environment variables.
- The switch is synced with the provider/model fields on the AI Tutor page, and switching now loads that provider's model name automatically (before, a Groq call kept the Gemini model name).
- **Test this provider** sends a tiny request and shows the real result. If the key is missing it offers a one-click switch to the other provider when that one is configured.
- Code: `public/dax-settings.js`.

## API key field in Settings (v1.4)
- **Settings → AI provider → API key** lets you paste a Gemini or Groq key directly in the browser (kept per provider; cleared when the tab closes unless "Remember on this device" is ticked).
- The key is sent to the site's own `/api/gemini` or `/api/groq` function in an `x-user-api-key` header and used for that request only; if none is sent, the `GEMINI_API_KEY` / `GROQ_API_KEY` environment variable is used as before.
- For a public site, prefer the Netlify environment variables; use the browser field on your own device.

## Important simulator limitation
The browser playground is an educational evaluator for selected patterns, not a full Microsoft DAX/VertiPaq engine. It supports sample patterns such as SUM, COUNTROWS, AVERAGE, DISTINCTCOUNT, DIVIDE, SUMX, MAX, MIN and simple CALCULATE filters. Other patterns are flagged rather than presented as executed. Results in a real tabular model can differ because of relationships, data types, filter context and engine semantics.

## Deploy on Netlify (recommended)
1. Upload this project to a GitHub repository, preserving `public/`, `netlify/`, `netlify.toml`, and `package.json`.
2. In Netlify, choose **Add new project → Import an existing project** and connect the repository.
3. Build command: `npm install`; publish directory: `public`. The functions directory is `netlify/functions` in `netlify.toml`.
4. In Netlify site settings, add environment variables as needed:
   - `GEMINI_API_KEY` — API key from Google AI Studio
   - `GROQ_API_KEY` — API key from Groq Console
5. Redeploy after adding or changing variables. AI works only for configured providers; all built-in lessons and the local lab work without keys.
6. Test `/api/health`, then try each configured provider from AI Tutor.

## Local development
Requires Node.js 20+. From this folder:

```bash
npm install
cp .env.example .env
# Add keys to .env only if you want to test AI locally
npm start
```

Netlify CLI runs the static site and serverless functions locally. Never commit `.env` or put production secrets in browser JavaScript.

## Privacy and progress
Learning progress, bookmarks, theme and notebook notes are saved in localStorage on the user's current browser. They are not synced across devices or accounts. API prompts are sent to the selected configured provider through a Netlify Function.
