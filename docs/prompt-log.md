# CarbonLog – Prompt log (Vignesh Sabarinathan)

Selected prompts with short notes on **why each iteration was needed**, what was **decided**, and which **alternatives were rejected**. This follows the course evidence package ("Prompt log: selected prompts with brief notes on why each iteration was needed") and the verified coding loop **Prompt → Inspect → Run → Explain**.

- **Author:** Vignesh Sabarinathan (ESB Business School, Digital Systems 1). Teammates keep their own logs for their own parts.
- **AI tool:** Claude (Anthropic), working as a coding agent on the project files.
- **Each prompt is shown in clean form** (goal, context, constraints) together with the wording as originally typed, so the log is readable and still authentic. Where the exact wording is not available, the entry says "summary" and is not a quote.
- Exact dates are given where the chat history records them. Prompts are listed in the order they were made.

---

## A. Building the CarbonLog app (Node.js, Express, SQLite)

**Honesty note:** these are the first prompts of the build, copied as typed from the original chat. Prompts made between them, if any, are not listed. Each prompt's clean meaning is given in the "Asked" column; the code that came back can be checked in the first commit (`83c549c`, "Baseline: CarbonLog app and Carbon Pulse website") and in `README.md`.

| # | Prompt (as typed) | Asked | What came back / why the next step |
|---|---|---|---|
| A1 | "Explain Sme carbon footprint logger" | Explain the idea of a carbon footprint logger for small and medium-sized companies, to decide whether it fits the course project. | An explanation of the problem and the idea. It confirmed the topic and led to A2. |
| A2 | "Generate a prompt for this project to create the web app and backend ." | Write a complete build prompt for the app and its backend, so the requirements are written down before any code. | A build prompt. Using a written prompt first made the requirements (entries, dashboard, targets, emission factors, CSV export) explicit before coding. |
| A3 | "Publish the file "/home/claude/scroll3d/index.html" as an artifact using the Artifact tool, then reply with one short line about what was published. …" | Publish the scroll-animation page as a shareable preview. | A preview of the scroll animation page, which let me judge the look before wiring it to the app (see also B1). |
| A4 | "Create a zip file code for me to run in local host." | Package the project as a zip that runs on my own computer. | A zip with the Node.js app. Running it on localhost is how the later defects were found (C2, C6). |
| A5 | "in the navbar above, instead of how it works and contact us, create new subpages for EACH of the buttonr ather than the buttons leading to some section of the same home page, and also the buttons muts be: … Also make something similar scroll down transition first without any text on the first animation then scroll down to see the texts" (with a Dribbble link to a 3D hero animation as reference) | Separate pages for navigation and a text-free scroll animation first, with the texts appearing after scrolling. | See B3, where the navigation decisions are recorded. |

What the finished code shows was decided along the way (documented in `README.md`, "Design decisions"). Link each one to the prompt that produced it:

| Decision in the code | Rejected alternative | Why |
|---|---|---|
| CO₂ is calculated **only on the server** (`services/calculator.js`) | Calculating in the browser | One place to test; the browser cannot send manipulated figures. |
| `co2_kg` is **stored when the entry is created** | Recalculating on every read | Updating a factor must not rewrite last year's footprint (test: "updating a factor does NOT change the CO2 of existing entries"). |
| Units are matched **exactly and case-sensitively** per category | Guessing or lower-casing units | `MWh` vs `mWh` differ by 10⁹; the server rejects instead of guessing. |
| **Parameterised SQL** only | Building SQL strings | Prevents SQL injection (test: "SQL injection attempts are treated as plain text"). |
| CSV export **neutralises formulas** (`=`, `+`, `-`, `@`) | Raw export | Stops spreadsheet formula injection when the CSV is opened in Excel. |
| DOM built with **`textContent`**, never `innerHTML` | `innerHTML` templates | User notes cannot inject HTML or scripts. |
| Target baseline = **previous calendar year** | A separate baseline column | Keeps the schema simple; limitation documented. |

---

## B. Website iterations

Each entry has the **prompt in clean form** (goal, context, constraints) and, in italics, the **wording as originally typed** (shortened with … where long). The clean form says the same thing in clearer words; nothing was added to what I asked for.

### B1. Shareable preview
**Prompt:** Give me a preview of the site and the app that I can open and share without installing anything.
*As typed: "Give me a preview artefact"*
- **Came back:** a preview page with a small demo backend inside it, so the app runs without a server. This is for the preview only; the real app uses Node.js.

### B2. From builder language to customer language
**Prompt:** The home page sections "1. Philosophy" and "2. Capabilities" talk to me as the admin. Rewrite them from the point of view of the customer or user, and replace them with what a customer needs to know about the site. Remove the abstract 3D line animation and use a scroll-down animation with 3D effects that fits ESG and green sustainability.
*As typed: "In the web page change the 1. Philosophy 2. Capabilities Change them to user pov , not like telling me(admin) , remove the 3d line animation and use something related to esg and green sustainability related animation scroll down with 3 d effects …"*
- **Why:** the first version described the product the way its builder sees it. Small-company owners need to know what they get.
- **Decision:** sections rewritten for customers; abstract lines replaced by a sustainability-themed scroll animation.

### B3. Separate pages instead of one long page
**Prompt:** Replace the navbar links "How it works" and "Contact us" with real sub-pages, one per button, instead of links that jump to sections of the home page. Buttons: Contact Us (with my student email), Open CarbonLog, Pricing (tiers: Free for individuals, Pro for small shops, Enterprise for large organisations), and at least two more useful pages of your own idea.
*As typed (full text is prompt A5 above): "in the navbar above, instead of how it works and contact us, create new subpages for EACH of the buttonr ather than the buttons leading to some section of the same home page …"*
- **Why:** anchor links inside one page made navigation unclear.
- **Decision:** separate pages for Contact, Pricing, Quick Check and Learn, plus "Open CarbonLog". The pricing tiers are a concept only (scope decision in the business case).

### B4. Scroll story: walk-in camera and a hopeful solarpunk world
**Prompt:** Remove the globe model. Do not make the page a flat scroll; the visitor should feel a camera walking into the screen. Use a solarpunk theme and add sound effects on clicks.
*As typed: "Remove the globe model , don't just stick to scrolling screen down , … camera man waking straight into the screen , and let it be in a solarpunk themed … also add sound effects for clicks ."*
- **Why this needed another round:** the AI removed the globe as asked, but I had wanted to keep it as the opening → B5.

### B5. Clarification: keep the globe, then zoom in
**Prompt:** I want both effects together. Start with the globe showing CO₂ moving through the atmosphere with the wind and air circulation, then zoom into a country, and show the consequences of global warming such as very high temperatures and icebergs melting in the Alps.
*As typed: "I meant use both scrolling down animation and zoom in animation, start like the globes model of carbon dioxide moving through atmosphere driven by wind patterns and circulations , then zoom into a country …"*
- **Lesson:** my earlier instruction had been too short and was read literally. Stating the order of the scenes avoided a third round.

### B6. Reference image for the globe
**Prompt (with a NASA CO₂ globe image attached):** Make the globe look like this reference, at high resolution. The zoom should go in, the rising temperature around the planet should be visible, and then a sunset should follow while it is too hot.
*As typed: "use the globes model like this one … with a high pixel rate, and the zoom in should go in, and it should also be visible that the temperature around the environment is rising. And then comes the sunset, while is too hot."*
- **Why it worked better:** a reference image gave the AI a concrete target that the text description alone had not.

### B7. Logo intro and an AI defect caught by a check
**Prompt:** After the globe heats up, show the logo intro: the world heats so much that it becomes a black hole, and the Nova logo comes out of it. Render it sharply on a Liquid Retina display and make the animation realistic, in the style of the black-hole scenes in *Spider-Man: Across the Spider-Verse*.
*As typed: "So after the showing of the temperature, of the globe rising, show the logo intro, as the world heats too much, and it becomes a black hole. And the Nova logo comes out of the black hole. … use Liquid Retina display …"*
- **AI limitation:** "Liquid Retina" is Apple's name for a screen, not something a website can switch on. The AI said so and used native-resolution rendering plus a liquid-glass look instead.
- **Defect found by a check:** the AI's automated patch searched for a code line (`const vel = target - sy;`) that did not exist. The patch verified every replacement before writing, so it stopped and changed nothing. The AI read the real code, found the right place and ran it again.
- **Lesson:** AI-generated edits can refer to code that is not there; a check before writing prevented a broken file.

### B8. Rename, contacts and sound (19 Oct 2026)
**Prompt:** Rename the brand from "Nova" to "Carbon Pulse", set the name in the Liquid Retina style font, add these team email addresses to the contact page, play a Big Bang flash sound when the name is revealed from the black hole, and add a subtle burning sound while the globe is shown.
*As typed: "Change the name from “nova” to “Carbon Pulse” . Make the name also to Liquid Retina fonts . Add these emails in contacts too … Add a flash sound of Big bang … Add subtle burning sound while showing the globe."*
- **Limits found:** Apple's SF Pro cannot be loaded on websites for non-Apple devices. **Decision:** SF Pro where the device has it, Inter Tight elsewhere. Browsers also play sound only after a click or key press, so scrolling alone stays silent; this is documented, not worked around.

### B9. New opening: Earthrise (20 Oct 2026)
**Prompt:** Use this as the opening screen: a short text explaining carbon emissions, and the visitor scrolls to clear the dust. Show a person on the Moon looking at the Earth. The Earth slowly heats up until it becomes like a sun, then a blast, and the brand name "Carbon Pulse" appears. After that, a time-rewind effect, a zoom through a galaxy, and a zoom back into the Earth.
*As typed: "Use this as the starting open dashboard of the web page. a text which says a concept of carbon emission. Scroll to clear the dust. … Let some guy who's looking from the moon, looking towards the earth …"*
- **Rejected:** the black hole from B7, replaced by this story.
- **Iteration after screenshots, 1:** the Earth looked orange from the start because the CO₂ plumes dominated. **Fix:** a shader control that fades from a blue Earth to the CO₂ view as the temperature rises.
- **Iteration after screenshots, 2:** the middle of the galaxy zoom was nearly empty. **Fix:** more stars near the Sun so something always passes by.

### B10. Wordmark from a reference font (20 Oct 2026)
**Prompt:** Remove the text "rewind and back to where it all started". Change the font of "Carbon Pulse" after the Big Bang to the font in the attached image, and remove the coloured light behind the name in the reveal.
*As typed: "I don't want to see the text, rewind and back to where it all started. Just remove the text … change the font of the carbon pulse after the Big Bang to the font which I attached … don't add the colorful lighting behind the fonts …"*
- **AI limitation:** the attached font is a commercial stock font that cannot legally be embedded in a website. **Decision:** the AI drew "carbon pulse" as a custom geometric SVG wordmark in the same style.
- **Iteration after a test:** the first render had thin seams where the letter circles closed, and the stroke was lighter than the reference. **Fix:** true SVG arcs and a heavier stroke, then compared again with the reference.

---

## C. Review against the grading criteria, and further features

### C1. Checking the project against the rubric (26 Oct 2026)
**Prompt (course PDFs attached):** Check whether the project meets all the grading criteria.
*As typed: "Tell me that it qualifies all the criteria’s"*
- **Result:** the technical criteria were met, but the business case, wireframes, prompt log and Git history were missing. `docs/business-case.md`, `docs/wireframes.html` and this log were created in response.

### C2. Defect found by running the tests (26 Oct 2026)
- **Defect:** `npm test` failed on Node.js 22 before running any test. The script `node --test tests/` passed a folder, which Node 22 tries to load as a file: `Cannot find module …/tests`.
- **How it was found:** by running the command, not by reading the code; the script looked correct.
- **Fix:** `"test": "node --test"`, so Node finds the `*.test.js` files itself. Result: 13 of 13 calculator tests passed; the API tests need `npm install` first.
- **Lesson:** generated code can look right and still fail on a newer runtime. Running it is the evidence.

**The same fix as a well-formed prompt** (goal, context, constraints, acceptance criteria): *"In package.json, `npm test` fails on Node 22 with 'Cannot find module …/tests'. Change only the test script so that it runs every `*.test.js` file in `tests/` on Node 20 and 22. Do not add dependencies or move files. Acceptance: `npm test` runs both calculator.test.js and api.test.js and reports their results. Explain why the old script failed."*

### C3. CSV import and export (26 Oct 2026)
**Prompt:** The app has no option to import or export CSV files. Add what is missing.
*As typed: "Why theres no option to import and export csv file"*
- **What was found:** export already existed in the real app (Entries → Export CSV), but the preview had replaced the button with a note, so it looked missing. Import really was missing.
- **Decisions:**
  - **All-or-nothing import:** one bad row imports nothing, and the response lists every bad row with its row number. *Rejected:* importing the valid rows and skipping the rest, because a half-imported file is hard to clean up.
  - **Same validation as the form:** every row goes through `prepareRow()`, so an import can never store what the form would reject. *Rejected:* a separate, looser check for imports.
  - **Parsing in its own module** (`services/csv-import.js`, no database) so it can be unit-tested. *Rejected:* an npm CSV package, because a ~100-line parser is easy to explain and the course asks to review dependencies.
  - **German Excel support:** semicolons, `1.500,5`, `15.03.2026`, German column names.
- **Iteration after a test:** a browser test with a German file failed because the header said `Kategorie` and only English names were recognised. **Fix:** German header names added, plus a unit test.
- **Known limitation:** importing the same file twice creates duplicates.
- **Evidence:** `tests/csv-import.test.js` (7 tests) and 4 route tests in `tests/api.test.js`.

### C4. Live updates and the payment success page (27 Oct 2026)
**Prompt:** Create a background worker so that entries update live every 5 seconds across multiple instances. Remove the test-mode box on checkout. After the customer enters their details and presses Pay, whichever payment option they chose, show a new page saying the payment was successful.
*As typed: "Create a background worker such that the entries get live updates every 5 seconds across multiple instances . Remove the test mode box . After I enter my details and press the pay button I want the page to lead to new page saying the payment is successful for any payment option."*
- **Interpretation:** "multiple instances" means several tabs, devices and server instances. The only thing they all share is the database, so the change signal lives there.
- **Decisions:**
  - **SQLite triggers** raise a revision number on every write, so no route can forget to signal a change.
  - **A Web Worker** polls `GET /api/changes` every 5 seconds off the main thread, and the page reloads only when the number changed.
  - **Quiet reloads** (no "Loading…" flash), never while the entry dialog is open, and no polling while the tab is hidden.
  - *Rejected:* WebSockets or Server-Sent Events (they only reach clients of the same server instance unless a message broker is added) and reloading every 5 s unconditionally (wasteful, and it would interrupt users).
- **Tests:** a trigger test with Node's built-in SQLite; an API test for `/api/changes`; two separate browser windows in a test harness — an entry added in window A appeared in window B after about 3 s, and a delete updated B's dashboard.
- **Checkout:** the test-mode box was removed; every payment method opens `payment-success.html` with the order details. No card data is passed on, only the last 4 digits for the receipt.

### C5. New cosmic opening and logo (30 Oct 2026)
**Prompt:** Instead of starting with the Earth, start with a dying star, then the Big Bang, then a zoom to our galaxy and then to the Earth; the rest stays the same. The human figure should watch from the very beginning, and global warming should then be shown slowly. Write the brand as “Carbon Pulse” with capital C and P, remove the line under it, and put “presents CarbonLog” directly below.
*As typed: "Instead of showing earth in the beginning show a start dying then big bang of the universe then zoom to our galaxy and then earth , rest all be the same also the human figure spectating from the beginning …"*
- **Interpretation:** "a start dying" was read as "a star dying". The astronaut is on screen from the first frame; the Earth first appears after the galaxy zoom, rising over the Moon, and only then warms.
- **Decisions:**
  - All opening timings are written in **vh of scroll** (the `OP` table), so phases can be moved without hunting for magic numbers.
  - Slow warming uses a **year counter (1850 → 2026)** with a simplified temperature path ending at the WMO value **+1.44 °C**, labelled "vs 1850–1900".
  - Capital **C** and **P** were drawn in the same geometric style as the lowercase wordmark (same stroke, cap height = ascender height).
- **Iteration after a test:** screenshots showed two info cards overlapping ("A planet with a fever" and "The Alps…"). The overlap existed before in a smaller form; the longer opening made it visible. **Fix:** cards re-spaced and a shorter fade, then checked again.

### C6. App would not start on Node.js 26; fire clouds (30 Oct 2026)
**Prompt:** Replace the coloured triangles in the Big Bang with clouds of fire. The previous version ran on my computer but this one does not (I think it is a version issue), so go back to the previous version. The code and error output are below; change it.
*As typed: "Don’t show the sparks of the big bang in some colourful triangles, show some clouds of fire instead . Also I tried running , the previous version was running but this one doesn’t , I have some version issue , go back to previous version …"*
- **Defect (real, on a team member's Mac):** `npm start` failed with `Cannot find module 'better-sqlite3'` on **Node.js 26**. The ZIP has no `node_modules`, so `npm install` has to build `better-sqlite3` (a native C++ add-on), and newer npm blocks its install script ("not yet covered by allowScripts"). Manual fixes in the terminal (switching to `sqlite3`, rewriting `connection.js`) made it worse: `openDb is not a function`.
- **Rejected alternative:** going back to an older version, because the old version had the same dependency and would fail the same way on Node 26.
- **Fix:** use **Node's built-in SQLite** (`node:sqlite`, Node 22.13+) through a 60-line adapter (`db/sqlite.js`) that offers the same `prepare/run/get/all/exec/pragma/transaction` calls. Only `express` is left to install and nothing native is compiled. Routes and tests did not change.
- **Evidence:** all 34 tests pass; a real start with a database file (`npm run seed`, `npm start`, add an entry, `/api/changes`, `/api/summary`) works.
- **Second defect found by the tests:** a CSV-import test expected 38 kg, but an earlier test changes the electricity factor; the test now compares with the factor in use.
- **Visual:** the Big Bang no longer shows coloured triangles or cyan/magenta sparks; billowing fire clouds cool from white-hot to deep red, then fall back and become the galaxy's stars.

---

## D. Feature work with Claude Code (3 Nov 2026)

After the build, I connected the GitHub repository (`vjr74730-cloud/carbonlog`) to Claude Code and used four prompts on my own part of the project, the **entries** (create, read, update, delete). The goal was twofold: to be able to explain my code part in the video, and to add one small real feature on its own branch with a pull request. The first two prompts only explain; they change nothing.

### D1. Explain my files (no changes)
**Prompt:** This repository is CarbonLog (Node.js/Express, node:sqlite, vanilla JS), a CO₂ logger for small companies. My topic is entries. Do not change anything. For `routes/entries.js` and `services/calculator.js`, give me a table with Purpose, Inputs, Flow, Output, Failures and Evidence (which test proves it), in simple English for a video.
- **Inspect / Run:** the AI ran `tests/api.test.js` and `tests/calculator.test.js` on a separate copy: 26 tests passed. My repo stayed unchanged.
- **What came back:** one table per file with every route (create, read list, read one, update, delete) and every function of the calculator (`validateEntryInput`, `isValidIsoDate`, `calculateCo2`), each with the test that proves it.
- **Findings I can use in the video:**
  - Factor changes do not touch saved entries; only editing an entry recalculates it (test: "updating a factor does NOT change the CO2 of existing entries").
  - **Gap found:** three failure cases are handled by the code but have no test: a bad `from`/`to` date on the list, a bad id on DELETE, and bad input on PUT. I will not call them "tested".
  - **Defect found:** the comment at the top of `entries.js` names `public/app.js`, but the real file is `public/carbonlog.js`.

### D2. Trace one click (no changes)
**Prompt:** Do not change anything. Trace step by step, with file names, function names and line numbers, what happens when I click Add entry, enter 100 kWh electricity with today's date and click Save: from `submitEntry` in `public/carbonlog.js` through `api()`, the POST `/api/entries` route, `prepareRow`, `calculateCo2` and the INSERT, to the table redrawing. Show the JSON sent and returned.
- **Run:** the AI sent this exact request to a scratch copy of the app with an in-memory database, so the JSON is the server's real reply, not an invented one.
- **What came back:** the full path with line numbers (`carbonlog.js:229` → `api()` at line 29 → `routes/entries.js:88` → `prepareRow` at line 38 → `validateEntryInput` at `calculator.js:84` → `calculateCo2` at line 40 → `INSERT` at `entries.js:91` → 201 reply → `loadEntries()` at line 153).
- **Data flow I explain in the video:** the browser sends `amount` as the text `"100"`; the server converts it, checks the unit, multiplies 100 × 0.38 and stores `co2_kg: 38`. The browser never calculates CO₂. Line numbers are from `main` at commit `24165fd`.
- **Detail to show on camera:** the factors are sorted by name, so the form starts on "Car travel", not Electricity. Choosing Electricity calls `fillUnits` and switches the units to kWh / MWh.
- **Failure path (same route, different ending):** an amount of `0` returns 400 with `fields`; the message appears under the right field with `aria-invalid`.

### D3. Add a category filter on a branch, with a pull request
**Prompt:** Create a branch `feature/vignesh-category-filter`. On the Entries tab add a category dropdown above the table, with "All categories" as default and the six categories. Changing it reloads the list using the existing `GET /api/entries?category=...` (the server already supports it). Keep the live 5-second refresh working with the selected filter. Change only `public/carbonlog.html` and `public/carbonlog.js`, match the existing style, use `textContent` only, no new libraries. Commit with a clear message and open a pull request. Explain every change.
- **What came back:** commit `459d459` on the branch, **pull request #1**. Only the two named files changed (17 lines added, 2 changed); no server code and no CSS.
- **Decisions:**
  - The dropdown reuses the markup of the dashboard's From/To filter (`.toolbar` with a `<label>`), so the existing styles apply and screen readers get a label.
  - `loadEntries()` reads the dropdown's value **every time it loads**. Because the 5-second live refresh already calls `loadEntries(true)`, the filter keeps working in the live refresh without extra code. *Rejected:* a separate refresh path just for the filter.
  - The six options are built from the factors the page already loads, so the names match the Add entry dialog and cannot drift from the server. *Rejected:* typing the six categories into the HTML.
  - An empty result now says *No Train travel entries yet. Choose "All categories" to see everything.* instead of "No entries yet", which would be misleading with a filter on.
- **How it was checked:** `npm test` passed (34 of 34), and in a headless browser against a test database: the dropdown lists All plus the six categories; choosing Electricity sends `/api/entries?category=electricity`; with Electricity selected, an electricity and a flight entry added from outside the page showed only the electricity row after about 5 seconds, with the filter kept; an empty category shows the new message; All brings everything back. No page errors.
- **Why the branch was cut from `main`:** the session offered its own default branch name; I asked for the named branch so the history shows what each branch is for.

### D4. Test and browser steps
**Prompt:** Add one test at the end of `tests/api.test.js` (existing `call()` helper): create one electricity and one flight entry, then `GET /api/entries?category=flight` returns only flight entries. Run `npm install` and `npm test` and show me the result. Then list the exact steps to check the dropdown in the browser with `npm start` on http://localhost:3000.
- **What came back:** the new test, number 14 of 35; all 35 pass (34 before).
- **Decision:** the test does not expect an exact row count, because earlier tests share the same database. It checks that every returned entry is a flight, that the new flight is included, and that the new electricity entry is not.
- **Limit to state honestly:** this test checks the server side only, and the server already supported the filter, so it also passes on `main`. The dropdown itself is checked by the browser steps (10 steps, including the live-refresh check).
- **Defect avoided:** `npm install` created a `package-lock.json`. The repository has never had one, so the AI deleted it instead of adding an unrequested file to the pull request.
- **Result:** the test was committed as `b72d72e` and is part of pull request #1. The working tree was clean.

---

## E. Reproducing the evidence

- `npm install && npm test` (calculator, API, CSV import and live-update tests; 34 tests pass on `main`; 35 with the category-filter test in pull request #1).
- `git log --format='%h %ad %s' --date=short` lists the commits referred to above.
