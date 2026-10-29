# Self-healing report

Mode: SELF_HEAL=true  
Engine available: heuristic (no ANTHROPIC_API_KEY)  
Generated: 2026-10-29T12:20:07.746Z

| Locator | Status | Engine | Broken selector | Healed locator |
|---|---|---|---|---|
| `legacy.loanAmountInput` | **healed** | heuristic | `#loan-amount` | `page.getByLabel('Home Loan Amount', { exact: true })` |
| `legacy.interestRateInput` | **healed** | heuristic | `xpath=/html/body/div[1]/div[3]/div/div[2]/div/form/div[2]/div[1]/div/input` | `page.getByLabel('Interest Rate', { exact: true })` |
| `legacy.personalLoanTab` | **healed** | heuristic | `div.loanproduct-nav > li:nth-child(2) > a` | `page.getByRole('link', { name: 'Personal Loan', exact: true })` |
| `legacy.emiValue` | **healed** | heuristic | `#emiamount > p > strong` | `page.locator('#emiamount span')` |
| `legacy.calculateButton` | **no-safe-candidate** | heuristic | `button:has-text("Calculate EMI")` | — |
| `legacy.personalLoanTab` | **healed** | heuristic | `div.loanproduct-nav > li:nth-child(2) > a` | `page.getByRole('link', { name: 'Personal Loan', exact: true })` |
| `legacy.loanAmountInput` | **healed** | heuristic | `#loan-amount` | `page.getByLabel('Personal Loan Amount', { exact: true })` |
| `legacy.interestRateInput` | **healed** | heuristic | `xpath=/html/body/div[1]/div[3]/div/div[2]/div/form/div[2]/div[1]/div/input` | `page.getByLabel('Interest Rate', { exact: true })` |
| `legacy.emiValue` | **healed** | heuristic | `#emiamount > p > strong` | `page.locator('#emiamount span')` |
| `legacy.calculateButton` | **no-safe-candidate** | heuristic | `button:has-text("Calculate EMI")` | — |

## legacy.loanAmountInput — healed

- **Intent:** Text input where the user types the loan amount
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByLabel('Home Loan Amount', { exact: true })` | 1 | ✅ accepted | ✓ not positional (Home Loan Amount)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of input (input)<br>✓ is editable |

Proposed patch (for human review — never auto-applied):

```diff
- '#loan-amount'
+ page.getByLabel('Home Loan Amount', { exact: true })
```

## legacy.interestRateInput — healed

- **Intent:** Text input for the annual interest rate percentage
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByLabel('Interest Rate', { exact: true })` | 1 | ✅ accepted | ✓ not positional (Interest Rate)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of input (input)<br>✓ is editable |

Proposed patch (for human review — never auto-applied):

```diff
- 'xpath=/html/body/div[1]/div[3]/div/div[2]/div/form/div[2]/div[1]/div/input'
+ page.getByLabel('Interest Rate', { exact: true })
```

## legacy.personalLoanTab — healed

- **Intent:** Personal Loan tab link in the loan product navigation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByRole('link', { name: 'Personal Loan', exact: true })` | 1 | ✅ accepted | ✓ not positional (link)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of a (a)<br>✓ text matches /^Personal Loan$/ (Personal Loan) |

Proposed patch (for human review — never auto-applied):

```diff
- 'div.loanproduct-nav > li:nth-child(2) > a'
+ page.getByRole('link', { name: 'Personal Loan', exact: true })
```

## legacy.emiValue — healed

- **Intent:** The displayed monthly Loan EMI amount figure
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.locator('#emiamount span')` | 1 | ✅ accepted | ✓ not positional (#emiamount span)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of span/strong/p (span)<br>✓ text matches /^[\d,]+$/ (44,986) |

Proposed patch (for human review — never auto-applied):

```diff
- '#emiamount > p > strong'
+ page.locator('#emiamount span')
```

## legacy.calculateButton — no-safe-candidate

- **Intent:** Calculate EMI submit button that triggers the calculation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByLabel('Schedule showing EMI payments starting from', { exact: true })` | 1 | ❌ rejected | ✓ not positional (Schedule showing EMI payments starting from)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 2 | `page.locator('#startmonthyear')` | 1 | ❌ rejected | ✓ not positional (#startmonthyear)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 3 | `page.locator('#emipaymentscheduleheader input')` | 1 | ❌ rejected | ✓ not positional (#emipaymentscheduleheader input)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 4 | `page.getByLabel('Home Loan Amount', { exact: true })` | 0.53 | ❌ rejected | ✓ not positional (Home Loan Amount)<br>✓ confidence ≥ 0.3 (0.53)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 5 | `page.locator('#loanamount')` | 0.53 | ❌ rejected | ✓ not positional (#loanamount)<br>✓ confidence ≥ 0.3 (0.53)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 6 | `page.locator('#emicalculatorinnerform input')` | 0.53 | ❌ rejected | ✓ not positional (#emicalculatorinnerform input)<br>✓ confidence ≥ 0.3 (0.53)<br>✗ matches exactly one element (matched 7) |

## legacy.personalLoanTab — healed

- **Intent:** Personal Loan tab link in the loan product navigation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByRole('link', { name: 'Personal Loan', exact: true })` | 1 | ✅ accepted | ✓ not positional (link)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of a (a)<br>✓ text matches /^Personal Loan$/ (Personal Loan) |

Proposed patch (for human review — never auto-applied):

```diff
- 'div.loanproduct-nav > li:nth-child(2) > a'
+ page.getByRole('link', { name: 'Personal Loan', exact: true })
```

## legacy.loanAmountInput — healed

- **Intent:** Text input where the user types the loan amount
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByLabel('Personal Loan Amount', { exact: true })` | 1 | ✅ accepted | ✓ not positional (Personal Loan Amount)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of input (input)<br>✓ is editable |

Proposed patch (for human review — never auto-applied):

```diff
- '#loan-amount'
+ page.getByLabel('Personal Loan Amount', { exact: true })
```

## legacy.interestRateInput — healed

- **Intent:** Text input for the annual interest rate percentage
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByLabel('Interest Rate', { exact: true })` | 1 | ✅ accepted | ✓ not positional (Interest Rate)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of input (input)<br>✓ is editable |

Proposed patch (for human review — never auto-applied):

```diff
- 'xpath=/html/body/div[1]/div[3]/div/div[2]/div/form/div[2]/div[1]/div/input'
+ page.getByLabel('Interest Rate', { exact: true })
```

## legacy.emiValue — healed

- **Intent:** The displayed monthly Loan EMI amount figure
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.locator('#emiamount span')` | 1 | ✅ accepted | ✓ not positional (#emiamount span)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of span/strong/p (span)<br>✓ text matches /^[\d,]+$/ (22,244) |

Proposed patch (for human review — never auto-applied):

```diff
- '#emiamount > p > strong'
+ page.locator('#emiamount span')
```

## legacy.calculateButton — no-safe-candidate

- **Intent:** Calculate EMI submit button that triggers the calculation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

| # | Suggestion | Confidence | Result | Checks |
|---|---|---|---|---|
| 1 | `page.getByLabel('Schedule showing EMI payments starting from', { exact: true })` | 1 | ❌ rejected | ✓ not positional (Schedule showing EMI payments starting from)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 2 | `page.locator('#startmonthyear')` | 1 | ❌ rejected | ✓ not positional (#startmonthyear)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 3 | `page.locator('#emipaymentscheduleheader input')` | 1 | ❌ rejected | ✓ not positional (#emipaymentscheduleheader input)<br>✓ confidence ≥ 0.3 (1)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 4 | `page.getByLabel('Home Loan Amount', { exact: true })` | 0.53 | ❌ rejected | ✓ not positional (Home Loan Amount)<br>✓ confidence ≥ 0.3 (0.53)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 5 | `page.locator('#loanamount')` | 0.53 | ❌ rejected | ✓ not positional (#loanamount)<br>✓ confidence ≥ 0.3 (0.53)<br>✓ matches exactly one element (matched 1)<br>✓ is visible<br>✓ tag is one of button/input (input)<br>✗ text matches /calculate/i |
| 6 | `page.locator('#emicalculatorinnerform input')` | 0.53 | ❌ rejected | ✓ not positional (#emicalculatorinnerform input)<br>✓ confidence ≥ 0.3 (0.53)<br>✗ matches exactly one element (matched 7) |
