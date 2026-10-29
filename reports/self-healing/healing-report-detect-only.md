# Self-healing report

Mode: detect only (SELF_HEAL=false)  
Engine available: heuristic (no ANTHROPIC_API_KEY)  
Generated: 2026-10-29T12:19:15.028Z

| Locator | Status | Engine | Broken selector | Healed locator |
|---|---|---|---|---|
| `legacy.loanAmountInput` | **detected-only** | none | `#loan-amount` | — |
| `legacy.interestRateInput` | **detected-only** | none | `xpath=/html/body/div[1]/div[3]/div/div[2]/div/form/div[2]/div[1]/div/input` | — |
| `legacy.personalLoanTab` | **detected-only** | none | `div.loanproduct-nav > li:nth-child(2) > a` | — |
| `legacy.emiValue` | **detected-only** | none | `#emiamount > p > strong` | — |
| `legacy.calculateButton` | **detected-only** | none | `button:has-text("Calculate EMI")` | — |
| `legacy.personalLoanTab` | **detected-only** | none | `div.loanproduct-nav > li:nth-child(2) > a` | — |
| `legacy.calculateButton` | **detected-only** | none | `button:has-text("Calculate EMI")` | — |

## legacy.loanAmountInput — detected-only

- **Intent:** Text input where the user types the loan amount
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

## legacy.interestRateInput — detected-only

- **Intent:** Text input for the annual interest rate percentage
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

## legacy.personalLoanTab — detected-only

- **Intent:** Personal Loan tab link in the loan product navigation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

## legacy.emiValue — detected-only

- **Intent:** The displayed monthly Loan EMI amount figure
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

## legacy.calculateButton — detected-only

- **Intent:** Calculate EMI submit button that triggers the calculation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

## legacy.personalLoanTab — detected-only

- **Intent:** Personal Loan tab link in the loan product navigation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`

## legacy.calculateButton — detected-only

- **Intent:** Calculate EMI submit button that triggers the calculation
- **Detected failure:** locator.waitFor: Timeout 3000ms exceeded.
- **Owner:** `tests/pages/legacy/LegacyEmiCalculatorPage.ts`
