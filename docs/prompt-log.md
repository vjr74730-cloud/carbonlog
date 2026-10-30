# CarbonLog – Prompt log

Selected prompts with short notes on **why each iteration was needed**, what was **decided**, and which **alternatives were rejected**. This follows the course evidence package ("Prompt log: selected prompts with brief notes on why each iteration was needed") and the verified coding loop **Prompt → Inspect → Run → Explain**.

- **AI tool:** Claude (Anthropic), working as a coding agent on the project files. Each team member adds their own prompts, including those made with Codex.
- **Prompts are quoted word for word** as typed, including typos, so the log stays authentic.
- Exact dates are given where the chat history records them. Earlier prompts are listed in the order they were made.

---

## A. Building the CarbonLog app (Node.js, Express, SQLite) – TO FILL IN

> **Fill this in from your own chat history before submitting.** The first prompts that created the app were made in an earlier session whose full text is no longer available in this project's history. Do not reconstruct them from memory as if they were exact quotes. Paste the real ones, or describe them clearly as summaries.

For each prompt, add one row:

| # | Prompt (exact) | What came back | Why the next iteration was needed | Decision |
|---|---|---|---|---|
| A1 | *paste* | | | |
| A2 | *paste* | | | |

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

## B. Website iterations (logged)

### B1. Preview and grading criteria

| Prompt (exact) | Note |
|---|---|
| "Give me a preview artefact" | Needed a shareable preview of the site and app. A demo backend inside the page lets the app run without a server for the preview only; the real app still uses Node.js. |
| [grading criteria screenshot] "Explain" | Used to align the work with the rubric before continuing. |

### B2. From admin language to user language

> "In the web page change the 1. Philosophy 2. Capabilities Change them to user pov , not like telling me(admin) , remove the 3d line animation and use something related to esg and green sustainability related animation scroll down with 3 d effects , change the context from philosophy and capabilities and put something that the customers or users need to know about the webpage ."

- **Why:** the first version described the product from the builder's point of view. The target users (small-company owners) need to know what they get, not how it was built.
- **Decision:** sections rewritten as what the customer needs to know; abstract 3D lines replaced by sustainability-themed scroll animation.

### B3. Separate pages instead of one long page

> "in the navbar above, instead of how it works and contact us, create new subpages for EACH of the buttonr ather than the buttons leading to some section of the same home page, and also the buttons muts be: 1. Contact Us (Vignesh.Sabarinathan@student.reutlingen-university.de) 2. Open CarbonLog 3. Pricing (make ur own pricing tiers reasonably: Free (For Individuals), Pro (For Small Shops), Enterprise (For Large Organizations)) 4. and atleast 2 more navbar options like this that's creative and useful and leads to another page. …"

- **Why:** anchor links inside one page made navigation unclear.
- **Decision:** separate pages for Contact, Pricing, Quick Check and Learn, plus "Open CarbonLog". Pricing tiers are a **concept only** (scope decision in the business case).

### B4–B6. Story and visuals (several iterations)

| Prompt (exact, shortened with …) | Why the next iteration was needed |
|---|---|
| "Remove the globe model , don't just stick to scrolling screen down , … camera man waking straight into the screen , and let it be in a solar punk themed … also add sound effects for clicks ." | The first scroll animation was a flat scroll; the goal was a walk-in camera and a hopeful solarpunk world. |
| "I meant use both scrolling down animation and zoom in animation, start like the globes model of carbon dioxide moving through atmosphere driven by wind patterns and circulations , then zoom into a country … also show global warnings like too high weather temperatures, icebergs melting from alps ." | **Clarification:** the previous prompt asked to remove the globe, and the AI did. The real intent was to keep it as the opening and add the zoom after it, so this prompt set out the order explicitly. |
| [NASA CO₂ globe image] "use the globes model like this one … with a high pixel rate, and the zoom in should go in, and it should also be visible that the temperature around the environment is rising. And then comes the sunset, while is too hot." | A reference image gave the AI a concrete target, which a text description had not achieved. |

### B7. Logo intro: black hole – and an AI defect caught by a check

> "So after the showing of the temperature, of the globe rising, show the logo intro, as the world heats too much, and it becomes a black hole. And the Nova logo comes out of the black hole. … use Liquid Retina display … Use for the animation realistic, like how it was in Spider-Man Multiverse movie …"

- **AI limitation:** "Liquid Retina" is Apple's name for a screen, not something a website can switch on. The AI interpreted it as native-resolution rendering plus a liquid-glass design and **said so**, instead of claiming it had done something impossible.
- **Defect found:** the AI's automated patch searched for a code line (`const vel = target - sy;`) **that did not exist**. Because the patch checked every replacement before writing, it stopped and **changed nothing**. The AI inspected the real code, found the correct place, and re-ran it.
- **Lesson:** AI-generated edits can reference code that is not there. Checks before writing prevented a broken file.

### B8. Rename, contacts, sound (19 Oct 2026)

> "Change the name from “nova” to “Carbon Pulse” .Make the name also to Liquid Retina fonts . Add these emails in contacts too … Add a flash sound of Big bang when revealing the name from black hole. Add subtle burning sound while showing the globe."

- **AI limitation:** Apple's SF Pro font may not be loaded on websites for non-Apple devices. **Decision:** use SF Pro where the device has it, and Inter Tight elsewhere.
- **Browser limitation:** browsers only play sound after a click or key press, so scrolling alone stays silent. Documented rather than worked around.

### B9. New opening: Earthrise (20 Oct 2026)

> "Use this as the starting open dashboard of the web page. a text which says a concept of carbon emission. Scroll to clear the dust. … Let some guy who's looking from the moon, looking towards the earth, and make it look like the earth is rising its temperature slowly, and it becomes a sun in its heat, and from there make it look like a blast … the carbon pulse name of the brand comes in. And after that … like a time rewind … zoom in like in a galaxy , and then zoom into the earth …"

- **Rejected alternative:** the black hole from B7 was replaced by this story.
- **Iteration after a test (screenshots):** the first render showed the Earth **orange from the start**, because the CO₂ plumes dominated. The goal was a calm blue planet that heats up. **Fix:** a new shader control fades from a blue Earth to the CO₂ view as the temperature rises.
- **Second iteration:** in the middle of the galaxy zoom the screen was nearly empty. **Fix:** more stars near the Sun, so something always passes by.

### B10. Font from a reference image (20 Oct 2026)

> "I don't want to see the text, rewind and back to where it all started. Just remove the text, which just says that, and also change the font of the carbon pulse after the Big Bang to the font which I attached, so change that font as well. And also don't add the colorful lighting behind the fonts carbon pulse in the name reveal ."

- **AI limitation:** the attached font ("minagod") is a **commercial stock font** that cannot be legally embedded on a website. **Decision:** the AI drew "carbon pulse" as a custom geometric SVG wordmark in the same style.
- **Iteration after a test:** the first render showed **thin seams** where the letter circles closed, and the stroke was lighter than the reference. **Fix:** true SVG arcs and a heavier stroke, then compared again with the reference image.
- This prompt was sent twice: the first version was interrupted and corrected ("I don't want you to see" → "I don't want to see").

---

## C. Review against the grading criteria

### C1. Checking the project against the rubric (26 Oct 2026)

> "Tell me that it qualifies all the criteria’s" (with the course PDFs attached)

- **Why:** before recording the video, check the project against the official rubric instead of assuming it is complete.
- **Result:** the technical criteria were met, but the business-case document, wireframes, prompt log and Git history were missing. This prompt log, `docs/business-case.md` and `docs/wireframes.html` were created in response.

### C2. Defect found by running the tests (26 Oct 2026)

- **Defect:** `npm test` **failed on Node.js 22 before running any test**. The script `node --test tests/` passed a folder, which Node 22 tries to load as a file: `Cannot find module …/tests`.
- **How it was found:** by actually running the command, not by reading the code. The script looked correct.
- **Fix:** `"test": "node --test"`, which lets Node discover `*.test.js` files itself. Result: 13 of 13 calculator tests pass. The API tests need `npm install` first.
- **Lesson:** generated code can look right and still fail on a newer runtime. Running it is the evidence.

> **Example of the same fix as an "excellent prompt"** (course style: goal, context, constraints, acceptance criteria):
>
> *"In package.json, `npm test` fails on Node 22 with 'Cannot find module …/tests'. Change only the test script so that it runs every `*.test.js` file in `tests/` on Node 20 and 22. Do not add dependencies or move files. Acceptance: `npm test` runs both calculator.test.js and api.test.js and reports their results. Explain why the old script failed."*

### C3. Codex or Claude? (26 Oct 2026)

> "Should i use only codex or Claude code is fine"

- **Decision:** the grading criteria are tool-neutral, but the course teaches Codex, so the team confirms with the lecturer. Whichever tool is used, the prompt history is kept for this log.

### C4. CSV import (26 Oct 2026)

> "Why theres no option to import and export csv file"

- **What was found:** export already existed in the real app (Entries → Export CSV), but the **preview artifact had replaced the button with a note**, so it looked missing. Import really was missing.
- **Decisions:**
  - **All-or-nothing import:** one bad row imports nothing, and the response lists every bad row with its row number. *Rejected:* importing the valid rows and skipping the rest, because a half-imported file is hard to clean up.
  - **Same validation as the form:** every row goes through `prepareRow()`, so an import can never store what the form would reject. *Rejected:* a separate, looser check for imports.
  - **Parsing in its own module** (`services/csv-import.js`, no database), so it can be unit-tested. *Rejected:* an npm CSV package, because the course asks to review dependencies and a ~100-line parser is easy to explain.
  - **German Excel support:** semicolons, `1.500,5`, `15.03.2026`, German column names.
- **Iteration after a test:** the first browser test with a German file failed because the header said `Kategorie` and only English column names were recognised. **Fix:** German header names added, plus a unit test.
- **Known limitation:** importing the same file twice creates duplicates.
- **Evidence:** `tests/csv-import.test.js` (7 tests, pass); 4 route tests in `tests/api.test.js` (run with `npm install && npm test`).

### C5. Live updates and the success page (27 Oct 2026)

> "Create a background worker such that the entries get live updates every 5 seconds across multiple instances . Remove the test mode box . After I enter my details and press the pay button I want the page to lead to new page saying the payment is successful for any payment option."

- **Interpretation:** "multiple instances" = several tabs, devices and server instances. The only thing they all share is the **database**, so the change signal lives there.
- **Decisions:**
  - **SQLite triggers** raise a revision number on every write, so no route can forget to signal a change.
  - **A Web Worker** polls `GET /api/changes` every 5 seconds, off the page's main thread, and the page reloads only when the number changed.
  - **Quiet reloads** (no "Loading…" flash), **never while the entry dialog is open**, and **no polling while the tab is hidden**.
  - *Rejected:* WebSockets or Server-Sent Events (only reach clients of the same server instance unless a message broker is added) and reloading every 5 s unconditionally (wasteful, and it would interrupt users).
- **Tests:** trigger test with Node's built-in SQLite (runs without `npm install`); API test for `/api/changes`; two separate browser windows in a test harness: an entry added in window A appeared in window B after about 3 s, and a delete updated B's dashboard.
- **Checkout:** test-mode box removed; every payment method now opens `payment-success.html` with the order details. No card data is passed on: only the last 4 digits for the receipt.

### C6. New cosmic opening and logo (30 Oct 2026)

> "Instead of showing earth in the beginning show a start dying then big bang of the universe then zoom to our galaxy and then earth , rest all be the same also the human figure spectating from the beginning , then show the global warming slow by slow . And for the carbon pulse , it should be in caps for first letter like “Carbon Pulse” . Also remove the line like thing below the carbon pulse and keep the “presents carbon log” Right below ."

- **Interpretation:** "a start dying" read as "a star dying". The astronaut is on screen from the first frame and watches the whole story; the Earth first appears after the galaxy zoom, rising over the Moon, and only then warms.
- **Decisions:**
  - All opening timings are written in **vh of scroll** (`OP` table), so phases can be moved without hunting for magic numbers.
  - Slow warming uses a **year counter (1850 → 2026)** with a simplified temperature path ending at the WMO value **+1.44 °C**, labelled "vs 1850–1900".
  - Capital **C** and **P** were drawn in the same geometric style as the lowercase wordmark (same stroke, cap height = ascender height).
- **Iteration after a test:** screenshots showed two info cards overlapping ("A planet with a fever" and "The Alps…"). The overlap already existed in a smaller form; the longer opening made it visible. **Fix:** cards re-spaced and a shorter fade, then checked again.

### C7. App would not start on Node.js 26; fire clouds (30 Oct 2026)

> "Don’t show the sparks of the big bang in some colourful triangles, show some clouds of fire instead . Also I tried running , the previous version was running but this one doesn’t , I have some version issue , go back to previous version . See the code below and change ."

- **Defect (real, on a team member's Mac):** `npm start` failed with `Cannot find module 'better-sqlite3'` on **Node.js 26**. The ZIP does not contain `node_modules`, so `npm install` has to build `better-sqlite3` (a native C++ add-on); newer npm blocks its install script ("not yet covered by allowScripts"). Manual fixes in the terminal (switching to `sqlite3`, rewriting `connection.js`) made it worse: `openDb is not a function`.
- **Rejected alternative:** going back to an older version, because the old version had the same dependency and would fail the same way on Node 26.
- **Fix:** use **Node's built-in SQLite** (`node:sqlite`, Node 22.13+) through a 60-line adapter (`db/sqlite.js`) that offers the same `prepare/run/get/all/exec/pragma/transaction` calls. Only `express` is left to install; nothing native is compiled. Routes and tests did not change.
- **Evidence:** all 34 tests pass; a real start with a database file (`npm run seed`, `npm start`, add an entry, `/api/changes`, `/api/summary`) works.
- **Second defect found by the tests:** a CSV-import test expected 38 kg, but an earlier test changes the electricity factor; the test now compares with the factor in use.
- **Visual:** the Big Bang no longer shows coloured triangles or cyan/magenta sparks; billowing fire clouds cool from white-hot to deep red, then fall back and become the galaxy's stars.

---

## D. How to add your own prompts

For every new prompt, add:

1. **The exact prompt.**
2. **What came back** (one line).
3. **What you checked**: ran it, read the diff, ran `npm test`, looked at the screen.
4. **Why you iterated**, or why you accepted the result.
5. **Decision and rejected alternative**, if any.
6. The **Git commit** that contains the change (see `git log`).
