/** A locator that is allowed to self-heal: the selector plus enough intent to recognise the right element. */
export interface HealableLocatorSpec {
  /** Stable identifier, e.g. "legacy.loanAmountInput". */
  key: string;
  /** The (possibly broken) selector as written in the page object. */
  selector: string;
  /** Plain-language description of the element — the most important input for healing. */
  intent: string;
  /** Page object file that owns the selector, so the report can propose a patch. */
  sourceFile: string;
  /** Traits a replacement must have before it is accepted. */
  expect: {
    tags?: string[];
    editable?: boolean;
    textPattern?: RegExp;
  };
}

/** One element on the page, summarised for a suggestion engine. */
export interface Candidate {
  index: number;
  tag: string;
  id?: string;
  name?: string;
  type?: string;
  role?: string;
  ariaLabel?: string;
  labelText?: string;
  placeholder?: string;
  testId?: string;
  text?: string;
  classes?: string;
  /** id of the nearest ancestor that has one — lets us build scoped selectors for id-less elements. */
  ancestorId?: string;
}

export type Strategy = 'role' | 'label' | 'testid' | 'text' | 'css';

export interface Suggestion {
  strategy: Strategy;
  /** role name for 'role'; label/text/test id for those; a CSS selector for 'css'. */
  value: string;
  /** Accessible name, only for strategy 'role'. */
  name?: string;
  confidence: number;
  reasoning: string;
}

export interface ValidationResult {
  suggestion: Suggestion;
  accepted: boolean;
  checks: { check: string; passed: boolean; detail?: string }[];
}

export interface HealingRecord {
  timestamp: string;
  key: string;
  sourceFile: string;
  brokenSelector: string;
  intent: string;
  failure: string;
  engine: 'llm' | 'heuristic' | 'none';
  status: 'healed' | 'no-safe-candidate' | 'detected-only';
  healedLocator?: string;
  validations: ValidationResult[];
}
