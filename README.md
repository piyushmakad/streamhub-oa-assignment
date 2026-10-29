# Streamhub QA Automation Assessment — Section B

Playwright + Cucumber (TypeScript) framework covering:

| Part | What | Where |
|---|---|---|
| **B1** | Streamhub Catalogue API: Express, mock JSON "database", 3 endpoints + health | [`api/`](api) |
| **B2** | Playwright API tests for it: 88 scenarios, happy paths, validation and edge cases | [`tests/features/api/`](tests/features/api) |
| **B3** | emicalculator.net UI tests: Test Case 1 (pie chart) and Test Case 2 (bar chart) | [`tests/features/ui/`](tests/features/ui) |
| **B4** | SQL: round-trip transfers and IPL 2024 streaks, with schema, seed data and screenshots | [`sql/`](sql), [`reports/sql/`](reports/sql) |
| **AI** | 5 deliberately broken locators + a working self-healing POC | [`self-healing/SELF_HEALING.md`](self-healing/SELF_HEALING.md) |

**Results:** see [`reports/SUMMARY.md`](reports/SUMMARY.md). Each suite has an HTML report, JSON, JUnit XML, console log and screenshots.

| Suite | Result |
|---|---|
| API (B2) | ✅ 88 scenarios / 384 steps passed |
| SQL (B4) | ✅ 2 scenarios passed; output matches the expected rows exactly |
| UI (B3) | ✅ 4 scenarios / 42 steps passed against the live site |
| Broken locators, healing off | ⚠️ drift check detects all 5 (passes); the 2 flows that use them fail, as intended |
| Broken locators, healing on | ✅ 3 scenarios passed: 4 locators healed, 1 hallucinated locator correctly refused |

---

## Setup

Requires Node.js 18+ (developed on Node 20).

```bash
npm install
npx playwright install chromium
```

Optional: `cp config/env/.env.local.example config/env/.env.local` and set `ANTHROPIC_API_KEY` to enable the LLM healing engine.

## How to run

| Command | What it does |
|---|---|
| `npm test` | API, then SQL, then UI suites (stops at the first failing suite) |
| `npm run test:api` | B2: starts the API in-process and runs the API features |
| `npm run test:ui` | B3: emicalculator.net (live site, headless Chromium) |
| `npm run test:sql` | B4: asserts the SQL query outputs |
| `npm run sql` | B4: prints both query outputs and regenerates `reports/sql/` screenshots |
| `npm run test:broken` | Runs the broken-locator scenarios with healing **off** (fails by design) |
| `npm run test:healing` | The same scenarios with `SELF_HEAL=true` |
| `npm run evidence` | Runs every suite above, saves console logs, writes `reports/SUMMARY.md` |
| `npm run api:start` | Runs the API on its own at `http://localhost:3000` |
| `npm run typecheck` | `tsc --noEmit` |

Useful flags:
- `HEADLESS=false npm run test:ui` watches the browser.
- `TEST_ENV=staging npm run test:api` targets another environment.
- `npx cucumber-js --profile ui --tags @pie-chart` runs a subset.

Failed UI scenarios save a Playwright trace to `reports/<suite>/traces/`. Open it with `npx playwright show-trace <zip>`.

---

## Architecture

```
api/src/                    B1 — the API under test
  app.ts                    routes, filtering/sorting/paging, error handler
  validation.ts             declarative query-param validator (collects every error)
  errors.ts                 single error envelope used by all non-2xx responses
  repository.ts, data/      JSON "mock DB"
config/env/                 .env.qa (default), .env.staging, .env.local (git-ignored)
tests/
  features/{api,ui,sql}/    Gherkin — what is tested
  step-definitions/         glue only; no locators or URLs in here
  pages/                    Page Object Model
    EmiCalculatorPage.ts    composes one component object per page area:
    components/             LoanProductTabs, LoanInputPanel, ResultSummary,
                            PieChart, BarChart, StartMonthPicker
    legacy/                 the intentionally broken page object (self-healing exercise)
  api/                      CatalogueApiClient (the API equivalent of a page object), JSON schemas
  support/
    config.ts               loads env config; nothing else reads process.env
    world.ts, hooks.ts      per-scenario state, browser/API lifecycle, screenshots, traces
    utils/emi-calculator.ts independent EMI + amortisation oracle
    self-healing/           healing POC: detect → suggest (LLM | heuristic) → validate → report
sql/                        schema, seed, the two queries, runner (sql.js = SQLite in WASM)
scripts/run-all.ts          evidence runner
reports/                    committed execution results
```

**Design decisions**

- **No hardcoded URLs.** The API base URL, EMI site URL, browser, viewport, timeouts and ad-blocking all come from `config/env/.env.<TEST_ENV>`. Real environment variables override the file (for CI). `config.ts` fails fast on missing keys.
- **Locator strategy.** Prefer role, label or text: `getByRole('link', { name: 'Personal Loan' })`, `getByLabel('Interest Rate')`, `getByLabel('Schedule showing EMI payments starting from')`. Where the site gives no accessible hook, fall back to stable ids (`#loanamountslider`) or the chart library's semantic classes (`.highcharts-tooltip`). No positional CSS or XPath anywhere in the real page objects.
- **Independent oracle.** UI tests never trust the site's numbers. [`emi-calculator.ts`](tests/support/utils/emi-calculator.ts) computes the EMI, totals and a calendar-year amortisation schedule, and every displayed figure is compared to it within ±₹2 (the site rounds to the rupee). The calculated-vs-displayed values are attached to each scenario in the HTML report.
- **Isolation.** Cucumber creates a new World per scenario. Each UI scenario gets a fresh browser context, and each API scenario a fresh request context. The browser and the in-process API server are shared and started lazily, only when a scenario tagged `@ui` or `@api` needs them.
- **Flake control for a live third-party site.**
  - Ad and analytics hosts are aborted at the network layer, because their iframes can sit over the calculator.
  - Waits are web-first (`expect.poll` / `toHaveText`), never fixed sleeps.
  - The UI profile retries once.
  - Traces are kept for failures.

---

## B1 — Streamhub Catalogue API

| Endpoint | Query parameters |
|---|---|
| `GET /api/titles` | `q` (search, 2–100 chars), `type` (movie\|series), `genre`, `language`, `minRating` (0–10), `yearFrom`/`yearTo` (1900–2100, inclusive), `sort` (id\|title\|releaseYear\|rating), `order` (asc\|desc), `page` (≥1), `limit` (1–50) |
| `GET /api/titles/:id` | none (positive integer id) |
| `GET /api/genres` | `sort` (name\|count), `order` |
| `GET /health` | none |

Errors always use one shape: `{ "error": { "status", "code", "message", "details": [{ "param", "message" }] } }`.

| Situation | Response |
|---|---|
| Invalid, unknown, empty or repeated parameter | `400 VALIDATION_ERROR`. **All** problems are listed, not just the first. |
| Unknown id or route | `404 NOT_FOUND` |
| Page past the end | `200` with an empty `data` (it's a valid request) |

Sorting always tie-breaks on `id` ascending, so paging is deterministic.

## B2 — API tests

The API tests cover:
- **Happy paths:** every filter, every sort field in both directions, the filter + sort + page combinations, and paging through the whole catalogue (each title exactly once).
- **Validation:** 21 invalid-parameter cases (out of range, wrong type, scientific notation, unknown and repeated parameters, inverted year range), boundary values that must be accepted, and hostile search strings (HTML, SQL-injection text, emoji, regex metacharacters) that must not cause a 5xx.
- **Response shape:** each response is validated with JSON Schema (Ajv, `additionalProperties: false`).
- **Cross-endpoint consistency:** genre counts must equal the `/api/titles?genre=` totals.

**Testing caught two real bugs in the API while it was being built.** Under `order=desc`, both `/api/titles` and `/api/genres` also reversed their tie-break (id and name respectively), which breaks deterministic paging. One was found by an early smoke test and the other by the sort-order scenarios. Both are fixed in the API code, not worked around in the tests.

## B3 — EMI Calculator UI tests

**Test Case 1, pie chart (Home Loan).** The test types the inputs, then checks the EMI, total interest and total payment against the oracle. It checks that the pie chart is visible and has two sections. It then extracts each section's numbers and fails if any is ≤ 0. The site only shows **percentages** in the pie (tooltips and slice labels), so the test reads those from the UI and the slices' ₹ amounts from the chart's data model, then checks both against the calculation.

| Scenario | EMI (calculated / shown) | Pie (shown) | Slice ₹ |
|---|---|---|---|
| A: 25L, 10%, 10 yrs | 33,037.68 / **33,038** | 63.1% / 36.9% | 25,00,000 / 14,64,522 |
| B: 50L, 7.5%, 15 yrs | 46,350.62 / **46,351** | 59.9% / 40.1% | 50,00,000 / 33,43,111 |

**Test Case 2, bar chart (Personal Loan).** The values are set **with the sliders**:
1. Read the range with the End/Home keys.
2. Drag the handle to the proportional position.
3. Nudge with the arrow keys until the bound input shows exactly 10L / 12% / 5 years.

The test then picks a start month in the calendar widget, checks the bar chart is visible, counts the bars, hovers one bar, and validates the tooltip against the amortisation schedule.

| Start month | Calendar years | Bars | Tooltip checked | Shown / calculated |
|---|---|---|---|---|
| Jan 2027 | 2027–2031 (5) | **10** | Principal, 2028 | ₹1,74,985 / 1,74,984.93; total ₹2,66,933 / 2,66,933.37 |
| Jul 2027 | 2027–2032 (6) | **12** | Interest, 2027 (6 months) | ₹58,139 / 58,138.66; total ₹1,33,467 / 1,33,466.69 |

"Count the bars" is ambiguous because the chart is stacked: each year has a Principal bar and an Interest bar, plus a Balance line that has no bars. I count rendered bars (2 × calendar years) and also assert one bar per series per year. A 5-year loan spans 6 calendar years when it starts mid-year, so the expected count comes from the chosen month rather than being fixed at 5.

## B4 — SQL

[`sql/schema.sql`](sql/schema.sql) · [`sql/seed.sql`](sql/seed.sql) · results in [`reports/sql/results.md`](reports/sql/results.md) · screenshots in [`reports/sql/screenshots/`](reports/sql/screenshots)

The seed data is built from edge cases, and each row's expected outcome is commented next to it. The outputs are asserted by [`tests/features/sql/sql_scenarios.feature`](tests/features/sql/sql_scenarios.feature).

**Scenario 1, round-trip transfers** ([query](sql/scenario1_round_trip_transfers.sql)). A self-join on reversed accounts, return strictly after the original and at most 24 h later, with `|returned − sent| × 10 ≤ sent`. Integer maths avoids floating-point problems at exactly 10%.

Interpretation:
- 10% is measured against the original amount, inclusive.
- Whoever sent first is Account A.
- An outbound transfer answered twice produces two rows.

The data covers:

| Kind | Cases |
|---|---|
| Matches | exactly ±10%, exactly 24 h, crossing midnight, rows inserted out of time order, one transfer with two returns |
| Rejected | 10.5%, 24 h 1 min, same direction twice, money moving on to a third account |

Result: **7 rows**.

**Scenario 2, IPL 2024 streaks** ([query](sql/scenario2_ipl_streaks.sql)). Gaps and islands with `ROW_NUMBER()`. Number each player's 2024 appearances, keep only the 30+ innings, and use `appearance# − row#` as the streak id. Groups of 3 or more are streaks.

Interpretation:
- "Consecutive" means the player's consecutive appearances.
- A did-not-bat appearance (`runs IS NULL`) breaks a streak.
- 2023 matches never chain into 2024.
- Two separate streaks give two rows.

To make did-not-bat appearances *skip* rather than break a streak, add `AND s.runs IS NOT NULL` to the `appearances` CTE.

The data covers:

| Kind | Cases |
|---|---|
| Included | exactly 30, a 4-match streak, two streaks for one player |
| Excluded | broken by a 29, broken by did-not-bat, alternating scores, a run that would only reach 3 by chaining 2023 into 2024 |

Result: **6 rows**.

The queries run on SQLite via sql.js (WebAssembly, no install). Window functions are standard SQL. The only SQLite-specific part is the `datetime(…, '+24 hours')` arithmetic, and the PostgreSQL equivalent is in the query's comments.

## AI self-healing

See [`self-healing/SELF_HEALING.md`](self-healing/SELF_HEALING.md) for the full design: detection, prompt approach and validation. In short:
- 5 broken locators live in [`tests/pages/legacy/LegacyEmiCalculatorPage.ts`](tests/pages/legacy/LegacyEmiCalculatorPage.ts).
- A drift check probes all five up front, so one run reports every broken locator instead of stopping at the first.
- The POC collects a compact candidate list from the live DOM and asks for replacements. It uses Claude (`claude-opus-5-5`, structured JSON output) when `ANTHROPIC_API_KEY` is set, otherwise an offline heuristic engine.
- **Every suggestion must pass validation on the live page** before use: not positional, exactly one match, visible, correct tag, editability and text.
- Fixes apply only to the current run. A report with a proposed diff is written for human review, and source files are never auto-edited.
- The fifth locator is a *hallucinated* "Calculate EMI" button. The healer correctly refuses to map it onto another element.

---

## Known limitations

- **The UI suite depends on emicalculator.net.** Layout or content changes on that site will fail it. That's why CI treats it as non-blocking while API and SQL are gating.
- **Pie slice ₹ amounts come from the chart's data model.** They are read via Highcharts in the page, because the UI only ever renders percentages. The percentages themselves are read from the UI.
- **The LLM healing path has only been type-checked.** No API key was available in this run, so the committed healing results come from the heuristic engine.

## Using Claude Code — reflection

> _Personal reflection: edit to match your own experience before submitting._

I used Claude Code as a pair programmer for the whole build, not just the scaffold.

**What worked**
- **Scaffolding from a plain-language description.** The folder layout, Cucumber profiles, World and hooks, and the page-object/component split were all generated from a description of the framework I wanted. I then reviewed and adjusted them.
- **Inspecting before writing locators.** Rather than letting it guess selectors for emicalculator.net, we first ran a throwaway Playwright script that dumped the real DOM: ids, labels, slider behaviour, the date picker's markup, Highcharts series and tooltip text. Every locator was written from that dump. This turned up facts no one would guess: the pie tooltip shows percentages, not rupees; each slider key press moves a fixed step (₹10k, 0.25%, 0.25 years); and the date picker opens in month view.
- **Unfamiliar territory.** It explained the gaps-and-islands technique for the streak query, and helped design seed rows that each pin down one rule.
- **Tests catching real bugs.** Running a smoke test and then the suite early surfaced two tie-break ordering bugs in the API it had written. We fixed the API, not the tests.

**Where it was wrong, and I corrected it**
- **Locator scoping.** `filter({ has: nav.getByRole(...) })` was scoped to the wrong parent. Playwright resolves `has:` relative to each `li`, so it never matched.
- **Library internals.** `.highcharts-column-series` also matches Highcharts' empty marker groups, which produced a bar count of `[5, 0, 5, 0]`. The fix was to scope to `g.highcharts-series`.
- **Hand-counted totals.** Two expected totals in the Scenario Outline were simply wrong (7 and 4 instead of 6 and 3). The assertion was right; the test data needed fixing.
- **A duplicate step definition** that would have made a step ambiguous.
- **Tooling drift.** `npm install typescript` pulled TypeScript 7 (the native compiler), which `ts-node` can't use. I pinned TypeScript 5.
- **Using an assumption as a specification.** "Count the bars" and "within 10%" both needed an explicit interpretation, written down here rather than silently picked.

**Takeaway.** It's fastest when it works from evidence (the real DOM, real test output) and checks its own output by running things. It's least reliable when asked to recall selectors, library internals or hand-computed numbers. Every one of those needed checking against a real run.
