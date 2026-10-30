# CarbonLog – Business case and requirements

Team project for Digital Systems 1, ESB Business School. Brand: **Carbon Pulse presents CarbonLog**.
Status: draft for the team to review. Replace anything that does not match what your team agreed.

---

## 1. The problem

Small and medium-sized companies are increasingly asked for their CO₂ figures by **larger customers, banks and public clients**. These requests come in as questionnaires, tender requirements or loan conversations, often from companies that must report on their own value chain.

Since 2026 there is an EU answer to this: a **voluntary sustainability reporting standard (VS)** for companies with up to 1,000 employees that do not have to report themselves. The European Commission adopted it on 3 July 2026, and it was published in the Official Journal on 21 September 2026. Its data points include **energy and greenhouse-gas emissions**, and companies can reuse the same data for customer inquiries, bank and investor talks, tenders and supply-chain requirements. ([DIHK](https://www.dihk.de/en/key-policy-areas/sustainability-reporting-voluntary-standard-for-smes-166342))

So a typical owner-managed company of 10–250 employees now needs a rough but defensible CO₂ figure, but:

- it has **no sustainability team** and no budget for a consultant;
- the raw data is scattered across **electricity and gas bills, fuel receipts, travel bookings and invoices**;
- doing it in a spreadsheet is **error-prone**: a single unit mix-up (MWh typed as kWh) changes the result by a factor of 1,000, and nobody notices;
- when an emission factor is updated, spreadsheet formulas silently **rewrite last year's numbers**.

## 2. Target users

| User | Situation | What they need |
|---|---|---|
| **Owner-manager** (primary), e.g. a bakery with 15 employees, a carpentry workshop, a small agency | Gets a CO₂ questionnaire from a large customer or the bank. Not an expert. | A total footprint and the biggest sources, in minutes, in plain language. |
| **Office manager / bookkeeper** (secondary) | Already handles the bills every month. | A fast form to type in amounts from bills, with errors caught immediately. |
| **The person answering the questionnaire** | Needs numbers per category and per period, plus a file to pass on. | Date filters, a category breakdown and a CSV export. |

## 3. Measurable outcome

These are the team's goals for the product (hypotheses, not measured results):

- A user can log one month of bills (about 5–8 entries) in **under 10 minutes**.
- **Zero silent unit errors**: every amount is stored with a unit that the server has checked against the category.
- Last year's figures **never change** because a factor was updated later.
- A footprint for any date range, and a CSV of all entries, is available in **one click**.

## 4. Process

**Today (as-is):** collect bills, copy numbers into a spreadsheet, look up an emission factor online, multiply by hand, hope the units match, send a screenshot to the customer.

**With CarbonLog (to-be):**

1. Open CarbonLog and go to **Entries**.
2. **Add entry**: choose category, type amount, pick unit, date, optional note.
3. The server **validates** the input and **calculates CO₂** with the stored emission factor, then saves it.
4. The **Dashboard** shows the total, the largest source, a category chart and a monthly trend, for any date range.
5. In **Settings**, set a **reduction target** for the year and keep the **emission factors** up to date, with source and year.
6. **Export CSV** to answer the questionnaire or share with the bank.
7. Already keep the numbers in a spreadsheet? **Import CSV** brings them in at once, checked row by row.

## 5. Requirements and acceptance criteria

Each requirement is testable. The last column shows the automated test that proves it (`npm test`), or how it is shown in the demo.

| ID | Requirement | Acceptance criterion | Evidence |
|---|---|---|---|
| R1 | Log an activity in one of six categories: electricity, natural gas, car travel, flight, train travel, purchased goods | Entering 100 kWh of electricity on a past date saves the entry (HTTP 201) and shows **38 kg CO₂** (factor 0.38 kg/kWh) | `api.test.js` › CRUD roundtrip; `calculator.test.js` › normal case |
| R2 | Accept common units and convert them | 2 MWh is treated as 2,000 kWh; miles are converted to km before the factor is applied | `calculator.test.js` › unit conversion (2 tests) |
| R3 | Reject wrong units instead of guessing | A distance unit for electricity is rejected; `MWH` and `mWh` are rejected (case-sensitive) | `calculator.test.js` › UNIT MIX-UP (3 tests) |
| R4 | Reject invalid input with a message next to the field | Amount ≤ 0, not a number, or above 1,000,000,000; an impossible date (2026-02-30); a future date; a note over 200 characters → HTTP 400 with `{ error, fields }`, shown under the field | `api.test.js` › validation errors; `calculator.test.js` › rejected amounts, dates, `validateEntryInput` |
| R5 | Edit an entry | Saving an edited entry recalculates its CO₂ with the current factor | `api.test.js` › CRUD roundtrip (update recalculates) |
| R6 | Delete an entry, safely | The user must confirm; the server answers 204 and the entry is gone | `api.test.js` › CRUD roundtrip (delete); confirm dialog shown in the demo |
| R7 | Dashboard for any period | Total, number of entries, largest source, totals by category and by month; a From/To filter changes all of them | `api.test.js` › summary totals with date filters |
| R8 | Reduction target | The user sets a % for a year; the dashboard shows progress against the previous calendar year | `api.test.js` › targets |
| R9 | Maintain emission factors | A factor's value, source and year can be edited; **existing entries keep their CO₂** | `api.test.js` › updating a factor does NOT change existing entries |
| R10 | Export | One click downloads all entries as CSV; cells starting with `=`, `+`, `-`, `@` are neutralised | `api.test.js` › CSV export |
| R11 | Robust API | Malformed JSON and unknown IDs give clean 400 / 404 errors; SQL injection attempts are stored as plain text | `api.test.js` › malformed JSON and bad ids; SQL injection |
| R12 | Clear system feedback | Loading, empty ("No entries yet…"), and "server not reachable" states are shown instead of a blank page | Shown in the demo (see wireframes W1b and W6) |
| R13 | Import entries from a CSV file | A file with a header row (`category,amount,unit,entry_date,note`) imports all rows (HTTP 201). If any row is invalid, **nothing** is imported and each bad row is listed with its error. Our own export, semicolon files from German Excel (`1.500,5`, `15.03.2026`) and German column names are accepted | `csv-import.test.js` (7 tests); `api.test.js` › CSV import (4 tests) |
| R14 | Live updates across devices | A change made in one browser, device or server instance appears in every other open CarbonLog within about 5 seconds, without reloading; a "Live" indicator shows the connection, and open forms are never overwritten | `live-revision.test.js`; `api.test.js` › GET /api/changes; shown in the demo with two windows |

## 6. Scope decisions

| Decision | In or out | Why |
|---|---|---|
| Six activity categories with approximate factors | **In** | Covers the bills small companies actually have; enough for a first estimate. |
| CO₂ calculated **only on the server** | **In** | One place to test; the browser cannot be manipulated into wrong figures. |
| CO₂ **stored at the time of entry** | **In** | Updating a factor must not rewrite history (R9). |
| Results labelled as **estimates** | **In** | Factors are approximate; the app must not look like a certified report. |
| Login, multiple users, multiple sites | **Out** | Not needed to prove the core workflow; would add security work beyond the course scope. |
| Full GHG-Protocol inventory (Scope 1/2/3 classification) | **Out** | Too complex for the target user; a later version could map categories to scopes. |
| CSV import from a spreadsheet | **In** | Many small companies already keep their bills in Excel; all-or-nothing keeps the data clean. |
| Automatic import of bills or bank data | **Out** | Requires external integrations; manual entry and CSV import are enough for 5–8 bills a month. |
| Pricing tiers (Free, Pro, Enterprise) | **Concept only** | Shown on the website to explain the business model; not implemented in the app. |
| Checkout for Pro | **Demo UI** | Shows the full purchase flow (billing cycle, VAT, payment methods). Real payments need a payment provider and are out of scope; no card data is sent or stored. |

## 7. Architecture in one picture

```
Browser (carbonlog.html + carbonlog.js)
   │  fetch() JSON  ── POST /api/entries, GET /api/summary, …
   ▼
Express (app.js → routes/entries.js, factors.js, targets.js, reports.js)
   │  validateEntryInput() + calculateCo2()   ← services/calculator.js
   ▼
SQLite (db/schema.sql via Node's built-in node:sqlite): emission_factors, entries, targets
```

## 8. Known risks and limitations

- Emission factors are **approximate**; verify against UBA or DEFRA before real use.
- **No authentication**; suitable for one small company on a trusted computer.
- Target progress compares **year-to-date with the whole previous year**, so it looks better early in the year than it is.
- The SQLite calls run **synchronously** and briefly block Node's event loop; fine for one company, not for many concurrent users.
- Importing the same CSV twice creates **duplicate entries**; there is no duplicate check yet.
- Dashboard charts load Chart.js from a CDN; without internet the numbers still show, but the charts do not.
