# CarbonLog website + app

A multi-page website for **CarbonLog**, the carbon footprint logger for SMEs, with the app built in. On the home page, a dust veil reads *A concept of carbon emission – scroll to clear the dust*. Scrolling clears it into an **Earthrise**: an astronaut on the Moon watches a blue Earth rise, while a HUD counts up the warming (+1.44 °C today, then an illustrated runaway). The Earth overheats into a sun and bursts with a Big Bang flash and boom, and the **Carbon Pulse presents CarbonLog** logo appears from the blast. Time rewinds: the pieces fall back in and form a galaxy, and the camera zooms through the Milky Way to the Earth today, wrapped in a glowing CO₂ atmosphere with heat and Alpine-glacier warnings (with sources). It zooms into Germany and dives through hot haze into a heatwave afternoon (rising thermometer, shimmering air, a burning sunset). After nightfall a green morning begins and the camera walks forward into a hand-painted solarpunk valley (solar cottages, wind turbines, a solar tram, farms with robots, a village square, a sunset overlook) with the snow-capped Alps on the horizon (their snow retreats during the heatwave) while chapter cards explain the product. The valley is rendered at native screen resolution (Retina, capped near 4K) and passed through a comic-book post-process inspired by animated films such as Spider-Verse: ink outlines, halftone dots and an RGB offset that grows when you scroll fast. The interface uses a liquid-glass theme (frosted, light-bending panels with a bright rim). Click sounds, a Big Bang boom when the logo appears, a soft fire crackle under the hot globe, footsteps and a meadow ambience are synthesized in the browser; the speaker button in the navbar turns them off. **Start logging** opens CarbonLog full screen with a circular reveal, with no page reload. CarbonLog gives SMEs an **estimate** of their CO₂ emissions; it is not a certified report.

## Run

Requires Node.js 18 or newer.

```bash
npm install        # express, better-sqlite3
npm run seed       # optional: creates data/carbonlog.db and loads 6 emission factors
npm start          # http://localhost:3000
npm test           # node --test tests/
```

Open **http://localhost:3000**. Always use this address: CarbonLog needs the server for its data, so opening `public/index.html` directly will show the page but CarbonLog will report that it cannot reach the server. Direct link to the app: `http://localhost:3000/#carbonlog`. Change the port with `PORT=4000 npm start`.

CarbonLog's charts load Chart.js from a CDN, so the first run needs an internet connection.

## How the integration works

| File | Role |
|---|---|
| `public/index.html` | Home page. Contains the full-screen overlay with an iframe that loads CarbonLog on first open |
| `public/carbonlog.html`, `carbonlog.css`, `carbonlog.js` | CarbonLog interface (dark green theme matching the website) |
| `server.js`, `app.js`, `routes/`, `services/`, `db/` | Express API and SQLite storage |

- The overlay grows out of the button you clicked. **Esc**, the **Close** button and the browser **Back** button all close it; **Forward** reopens it.
- While the app is open, the animated page behind it pauses and is not reachable with the keyboard.
- CarbonLog runs in an iframe, so its styles and scripts cannot clash with the website's. When embedded it hides its own logo and the "← Website" link, because the overlay shows them.

## Pages

| Address | Page |
|---|---|
| `/` (`index.html`) | Home: dust veil, Earthrise from the Moon, the Earth overheats and bursts, Carbon Pulse logo, rewind into a galaxy, Earth today, zoom into Germany, then the walk into the solarpunk valley |
| `/calculator.html` | **Quick Check**: instant monthly estimate with the app's factors, nothing saved |
| `/learn.html` | **Learn**: scopes 1–3, how it is calculated, where to find data, quick wins, glossary |
| `/pricing.html` | **Pricing**: Free (individuals), Pro (small shops), Enterprise (large organizations) |
| `/contact.html` | **Contact Us**: the three team email addresses (Vignesh Sabarinathan, Suyash Chadha, Venkatesh Dalbhanjan) with copy buttons, and a form that prepares one email to all three |
| `/carbonlog.html` | **Open CarbonLog**: the app as a full page |
| `/nova.html` | The earlier Carbon Pulse 3D scroll demo |

Shared navbar, footer and styles live in `public/site.css` and `public/site.js`; sound effects in `public/sound.js`. `landing.html` now redirects to the home page.

## "I see no animation"

If your system has **Reduce Motion** turned on (macOS: System Settings > Accessibility > Display > Reduce motion), the home page drops idle animation and scroll smoothing and shows the headline straight away. The Nova demo starts in a calm static layout with a **Play full animations** button, or open `http://localhost:3000/nova.html?motion=on`.

## CarbonLog

Companies log activities (electricity, gas, car, flights, train, purchases); the server converts them into estimated CO₂, and the dashboard shows totals, a category breakdown, a monthly trend and progress toward a yearly reduction target.

### Data model

| Table | Columns |
|---|---|
| `entries` | id, category, amount, unit, entry_date, note, co2_kg, created_at |
| `emission_factors` | id, category (unique), unit, kg_co2_per_unit, source, year |
| `targets` | id, year (unique), reduction_percent |

### REST API

| Method and path | Purpose |
|---|---|
| `GET /api/entries` | List entries (optional `from`, `to`, `category`) |
| `POST /api/entries` | Create an entry (201) |
| `GET /api/entries/:id` | Read one entry |
| `PUT /api/entries/:id` | Update an entry (CO₂ is recalculated) |
| `DELETE /api/entries/:id` | Delete an entry (204) |
| `GET /api/factors` | List factors with their allowed units |
| `PUT /api/factors/:id` | Update value, source and year of a factor |
| `GET /api/summary?from=&to=` | Total, by category, by month |
| `GET /api/targets/:year` | Target and progress against the previous year |
| `PUT /api/targets/:year` | Set the reduction target in percent |
| `GET /api/export.csv` | Download all entries as CSV |

Errors always use `{ "error": "message" }` with status 400, 404 or 500. Entry validation errors also include a `fields` object that the form shows inline.

### Design decisions

1. **CO₂ is calculated only on the server**, in `services/calculator.js`. The frontend never computes emissions.
2. **`co2_kg` is stored when the entry is created.** Updating an emission factor does not rewrite history. Editing an entry on purpose recalculates it with the current factor.
3. **Units are matched exactly (case-sensitive) per category.** `MWh` and `mWh` differ by a factor of a billion, so the server rejects unknown units instead of guessing. Conversions: MWh to kWh, miles to km.
4. **Parameterized SQL only.** User input is never concatenated into a query.
5. **CSV export neutralises spreadsheet formulas** in notes (cells starting with `=`, `+`, `-`, `@`).
6. **The frontend builds the DOM with `textContent`**, never `innerHTML`.
7. **The target baseline is the previous calendar year**, which avoids an extra column in the schema.

### Known limitations

- **Emission factors are approximate.** Verify them against an official source (for example Umweltbundesamt or DEFRA) before real use.
- **No authentication or multi-user support.**
- **Target progress compares year-to-date with the full previous year**, so it looks better early in the year than it is.
- **Only six activity types** are covered; this is not a full GHG Protocol inventory.
- **Dates use the server's local time** for the "not in the future" check.
- **Single SQLite file**, suitable for one small company.
