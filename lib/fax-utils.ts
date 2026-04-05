import { Fax, UnsortedReason } from "@/types";

/**
 * Derives unsorted reasons from fax properties.
 * Returns explicit unsortedReasons if present, otherwise computes from data.
 */
export function computeUnsortedReasons(fax: Fax): UnsortedReason[] {
  if (fax.unsortedReasons && fax.unsortedReasons.length > 0) {
    return fax.unsortedReasons;
  }

  const reasons: UnsortedReason[] = [];

  if (fax.patientMatchStatus === "multiple-matches") {
    reasons.push("multiple-patients");
  }

  // Confidence-based reasons disabled: logprobs not available on current Gemini model,
  // so all scores are null/0. Will re-enable when judge model is added.

  return reasons;
}
