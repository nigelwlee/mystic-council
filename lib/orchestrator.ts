/**
 * Public orchestrator API.
 *
 * Re-exports the helpers from lib/api/run-expert so that callers outside the
 * API layer (cron jobs, batch routes, tests) can import from a single stable
 * path rather than the internal lib/api/ module.
 *
 * Usage:
 *   import { runSingleExpert, synthesize, formatBirthData, patchToolsWithBirthData } from "@/lib/orchestrator"
 */

export {
  runSingleExpert,
  synthesize,
  formatBirthData,
  patchToolsWithBirthData,
  EXPERT_OUTPUT_RULES,
} from "@/lib/api/run-expert";

export type { SynthesizeOpts } from "@/lib/api/run-expert";
