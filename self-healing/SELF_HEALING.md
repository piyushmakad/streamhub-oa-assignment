# AI self-healing locators

This document describes how this framework detects broken locators, asks an AI for replacements, and validates any replacement before it is used. The proof-of-concept is real and runs in this repo:

| Command | What happens |
|---|---|
| `npm run test:broken` | `SELF_HEAL=false`. A drift-check scenario detects all five broken locators up front (it passes), and the two flows that use them fail as they would in any suite. Every detection is logged to `reports/self-healing/healing-report-detect-only.{json,md}`. |
| `npm run test:healing` | `SELF_HEAL=true`. The same three scenarios all pass: the healer proposes and validates replacements, uses them for this run only, and writes `reports/self-healing/healing-report.{json,md}` with a proposed patch for each one. |

Code: [`tests/support/self-healing/`](../tests/support/self-healing). The broken locators are in [`tests/pages/legacy/LegacyEmiCalculatorPage.ts`](../tests/pages/legacy/LegacyEmiCalculatorPage.ts).

---

## 1. The deliberately broken locators

| # | Key | Broken selector | What is wrong | Healed to (heuristic engine, real run) |
|---|---|---|---|---|
| 1 | `legacy.loanAmountInput` | `#loan-amount` | Wrong id. The real id is `loanamount`. | `getByLabel('Personal Loan Amount', { exact: true })` |
| 2 | `legacy.interestRateInput` | `xpath=/html/body/div[1]/div[3]/…/input` | Absolute positional XPath, as recorded by a browser plugin. | `getByLabel('Interest Rate', { exact: true })` |
| 3 | `legacy.personalLoanTab` | `div.loanproduct-nav > li:nth-child(2) > a` | Positional, and the parent is really a `<ul>`. | `getByRole('link', { name: 'Personal Loan', exact: true })` |
| 4 | `legacy.emiValue` | `#emiamount > p > strong` | Wrong element type. The figure is a `<span>`. | `locator('#emiamount span')` |
| 5 | `legacy.calculateButton` | `button:has-text("Calculate EMI")` | **Hallucinated.** The site recalculates on input, so this button does not exist. | **Refused.** No candidate passed validation. |

Locator #5 matters most. An AI healer that always returns *something* will "fix" a test by clicking the wrong button, and the test then passes for the wrong reason. A healer has to be allowed to say no.

## 2. Detection

`healable(page, spec)` wraps each lookup in the page object. Each spec carries:

- the selector,
- an **intent** (a plain-language description of the element),
- the **traits** any replacement must have (tag, editable, text pattern).

A locator counts as broken when either of these is true:

- it does not attach within a short wait (3 s, well below the step timeout), or
- it matches anything other than exactly one element.

The second check matters: a selector that silently starts matching two elements is broken too, even though Playwright would just pick the first one.

Lazy detection has one weakness: a scenario stops at its *first* broken locator, so the ones after it are never checked. **The drift check fixes this.** `auditLocators(page, specs)` in [`healer.ts`](../tests/support/self-healing/healer.ts) probes every locator in a page object before any step uses it. It is the first scenario in [`self_healing_broken_locators.feature`](../tests/features/ui/self_healing_broken_locators.feature), and it reports all five broken locators in one run, whether healing is off or on. Run nightly against each new build, this flags drift before a test ever fails on it.

In a larger suite, detection could also come from **failure triage**: classifying Playwright `TimeoutError` / strict-mode violations in the JSON report after a run.

## 3. Prompt approach

**Context, not HTML.** Sending raw HTML is expensive, and it invites the model to build long, brittle selectors. Instead, [`dom-snapshot.ts`](../tests/support/self-healing/dom-snapshot.ts) collects up to 250 *visible* candidate elements. For each one it keeps only the attributes resilient locators are built from: tag, id, name, type, role, aria-label, associated `<label>` text, placeholder, `data-testid`, short visible text, classes, and the nearest ancestor id.

**The request** ([`llm-engine.ts`](../tests/support/self-healing/llm-engine.ts)) is a single JSON message containing:

```json
{
  "broken_selector": "#loan-amount",
  "playwright_error": "locator.waitFor: Timeout 3000ms exceeded.",
  "element_description": "Text input where the user types the loan amount",
  "required_traits": { "tags": ["input"], "editable": true },
  "candidates": [ { "index": 12, "tag": "input", "id": "loanamount", "labelText": "Personal Loan Amount", ... } ]
}
```

**The system prompt** encodes the team's locator policy:

- prefer, in order: test id, then label, then role + name, then a stable id, then a selector scoped to an id, then visible text;
- never return positional selectors;
- only use attribute values that appear in the candidate list (this is the anti-hallucination rule);
- **an empty list is a correct answer.**

**Structured output.** The response is constrained to a JSON schema with `output_config.format` (via the SDK's `betaZodOutputFormat`). That makes it a typed list of `{ strategy, value, name?, confidence, reasoning }` rather than free text that has to be parsed. The strategy is an enum (`role | label | testid | text | css`), so the model picks a Playwright locator *type* and the framework builds it with `getByRole` / `getByLabel` / and so on.

**Model.** Configured with `HEAL_MODEL`, default `claude-opus-5-5`. The call runs at `effort: "low"` because it's a short, well-specified ranking task, and it opts into server-side refusal fallbacks. The call only happens when `ANTHROPIC_API_KEY` is set. Otherwise, or if the call fails, the **offline heuristic engine** ([`heuristic-engine.ts`](../tests/support/self-healing/heuristic-engine.ts)) is used. It scores candidates by token overlap with the intent and the broken selector, plus near-matches on ids (`loan-amount` ≈ `loanamount`), and applies the same preference order. This keeps the POC deterministic, and it runs in CI without secrets.

## 4. Validation before applying a fix

Nothing an engine returns is trusted. [`validator.ts`](../tests/support/self-healing/validator.ts) runs every suggestion against the **live page**, and a suggestion is accepted only if **all** of these pass:

1. **Not positional.** `nth-child`, `nth-of-type`, `:nth()`, XPath indexes and raw XPath are rejected outright. We don't heal into another brittle selector.
2. **Confidence ≥ 0.3.**
3. **Matches exactly one element.** Ambiguous locators are rejected.
4. **Is visible.**
5. **Has the declared traits:** the tag is in the allowed set, the element is editable when the spec says it must be, and its text matches the expected pattern.

The first suggestion that passes is used **for this run only**. After that, the test's own assertions act as a final, behaviour-level check. For example, the healed EMI locator must still read a figure that matches the independently calculated EMI. A heal that picks a plausible but wrong element fails there.

Every suggestion is written to the report, accepted or rejected, along with each check's result, so a reviewer can see *why* a candidate won.

## 5. Applying the fix: human in the loop

The healer **never edits source files**. A heal that silently rewrites selectors hides real regressions: the button really did move, or the label really did change. Instead:

1. The run passes with the healed locator (`SELF_HEAL=true` should be enabled in CI only on non-blocking jobs).
2. The report contains a ready-to-apply diff per locator, for example:
   ```diff
   - '#loan-amount'
   + page.getByLabel('Personal Loan Amount', { exact: true })
   ```
3. A human (or a bot that opens a PR for review) applies it to the page object.
4. **Repeated heals of the same key are a signal**, not a fix. If a locator heals on every run, the page object is stale and the fix should be committed.

## 6. Limitations and next steps

- **The heuristic engine is shallow.** It proves the pipeline but won't match an LLM on semantic intent, for example "the field next to the rupee sign".
- **Label-based heals can be context-specific.** The committed run shows this. The drift check runs on the Home Loan tab and heals `#loan-amount` to `getByLabel('Home Loan Amount')`. The Personal Loan flow heals the same locator to `getByLabel('Personal Loan Amount')`. Both are correct for their page state, but neither is the right permanent fix. A team policy could prefer heals that hold across states, such as a regex label `/Loan Amount$/`, which the LLM could be asked to produce. Seeing different heals for one key is itself a useful signal for the human reviewer.
- **Cost and latency.** The healer runs once per broken locator per run. Caching approved heals by `(key, page fingerprint)` would avoid repeated calls.
- **The LLM path has not been run here.** It is implemented and type-checked, but no API key was available. The heuristic path is what produced the committed results.
