import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { Candidate, HealableLocatorSpec, Suggestion } from './types';

/**
 * LLM-backed suggestion engine. The model only *proposes* locators; nothing it returns is used
 * until the validator (validator.ts) has proven it against the live page.
 */
const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        strategy: z.enum(['role', 'label', 'testid', 'text', 'css']),
        value: z.string(),
        name: z.string().optional(),
        confidence: z.number(),
        reasoning: z.string(),
      }),
    )
    .max(5),
});

const SYSTEM = `You repair broken Playwright locators.
You get: the broken selector, the error Playwright raised, a description of the element the test meant to target, the traits it must have, and a JSON list of visible candidate elements from the live page.
Return up to 5 replacement locators, best first, each targeting exactly one candidate.
Rules:
- Prefer, in order: data-testid, accessible label, ARIA role + accessible name, stable id, an id-scoped CSS selector, visible text.
- Never return positional selectors (nth-child, nth-of-type, :nth(), XPath indexes, long descendant chains).
- Only use attribute values that appear in the candidate list. Do not invent ids, labels or text.
- If no candidate matches the description, return an empty list. An empty list is a correct answer; a wrong element is not.
For strategy "role", put the ARIA role in "value" and the accessible name in "name".`;

export async function suggestWithLlm(
  spec: HealableLocatorSpec,
  failure: string,
  candidates: Candidate[],
  opts: { apiKey: string; model: string },
): Promise<Suggestion[]> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const request = {
    broken_selector: spec.selector,
    playwright_error: failure.slice(0, 500),
    element_description: spec.intent,
    required_traits: {
      tags: spec.expect.tags,
      editable: spec.expect.editable,
      text_pattern: spec.expect.textPattern?.source,
    },
    candidates,
  };

  const response = await client.beta.messages.parse({
    model: opts.model,
    max_tokens: 4000,
    // Opt into server-side refusal fallbacks (routes a policy decline to the default fallback model).
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // A short, well-specified ranking task: low effort keeps latency and cost down.
    output_config: { effort: 'low', format: betaZodOutputFormat(SuggestionSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(request) }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`Model declined the healing request (${response.stop_details?.category ?? 'no category'})`);
  }
  if (!response.parsed_output) throw new Error(`Model returned no parseable suggestions (stop_reason=${response.stop_reason})`);
  return response.parsed_output.suggestions;
}
