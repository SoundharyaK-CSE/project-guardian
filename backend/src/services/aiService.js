/**
 * aiService.js
 * Every call to the LLM for Project Guardian lives here.
 * Uses Claude (Anthropic API) to turn plain-English requirements into
 * structured understanding, impact analysis, and drift explanations.
 *
 * If ANTHROPIC_API_KEY is not set, falls back to a deterministic mock
 * so the rest of the app is runnable/demoable without a key.
 */
import Anthropic from "@anthropic-ai/sdk";

const hasKey = !!process.env.ANTHROPIC_API_KEY;
const client = hasKey ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

async function callClaude(system, userPrompt) {
  if (!client) return null; // caller falls back to mock
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Extract structured understanding from a requirement's text:
 * entities, actions, business rules, related modules, security/testing notes.
 */
export async function understandRequirement(text) {
  const system =
    "You are a senior software analyst. Given one software requirement, extract its meaning as JSON only, no prose, no markdown fences. " +
    'Schema: {"entities": string[], "actions": string[], "business_rules": string[], ' +
    '"related_modules": string[], "security_notes": string[], "testing_notes": string[]}';

  const result = await callClaude(system, `Requirement: "${text}"`);
  if (result) return result;

  // Deterministic mock fallback (keyword based)
  const lower = text.toLowerCase();
  return {
    entities: lower.includes("user") ? ["User"] : ["Entity"],
    actions: lower.match(/\b(login|verify|register|access|reset|update|delete|create)\w*/gi) || ["perform action"],
    business_rules: [text],
    related_modules: [
      lower.includes("login") || lower.includes("password") ? "Authentication" : null,
      lower.includes("otp") ? "OTP Verification" : null,
      lower.includes("email") ? "Email Verification" : null,
      lower.includes("dashboard") ? "Dashboard Access" : null,
    ].filter(Boolean),
    security_notes: lower.includes("password") || lower.includes("otp") ? ["Handles credentials — review for secure storage/transmission"] : [],
    testing_notes: ["Add/verify unit and integration tests for this behavior"],
  };
}

/**
 * Compare two requirement versions and produce impact analysis.
 */
export async function analyzeImpact({ oldText, newText, components }) {
  const system =
    "You are a staff software architect performing change-impact analysis for a codebase. " +
    "Given an old requirement, a new requirement, and a list of known components (with type), " +
    "return ONLY JSON with this schema: " +
    '{"diff_summary": {"added": string[], "removed": string[], "modified": string[]}, ' +
    '"directly_affected": [{"component": string, "reason": string}], ' +
    '"indirectly_affected": [{"component": string, "reason": string}], ' +
    '"testing_impact": string[], "database_impact": string[], ' +
    '"impact_score": number (0-100), "risk_level": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", ' +
    '"reasoning": string}';

  const userPrompt = `Old requirement: "${oldText}"\nNew requirement: "${newText}"\nKnown components: ${JSON.stringify(
    components
  )}`;

  const result = await callClaude(system, userPrompt);
  if (result) return result;

  // Mock fallback: simple heuristic impact scoring
  const addedWords = newText
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w && !oldText.toLowerCase().includes(w));
  const touchesAuth = /login|password|otp|auth/i.test(newText);
  const touchesDb = /database|store|table|model/i.test(newText) || touchesAuth;

  const directly = components.filter((c) => ["frontend", "backend", "api"].includes(c.type)).slice(0, 4);
  const indirectly = components.filter((c) => ["backend", "database"].includes(c.type)).slice(0, 3);

  const score = Math.min(95, 30 + addedWords.length * 5 + (touchesAuth ? 25 : 0) + (touchesDb ? 15 : 0));
  const risk = score > 80 ? "CRITICAL" : score > 60 ? "HIGH" : score > 35 ? "MEDIUM" : "LOW";

  return {
    diff_summary: {
      added: addedWords,
      removed: [],
      modified: ["requirement behavior updated"],
    },
    directly_affected: directly.map((c) => ({ component: c.name, reason: `Implements behavior described in the requirement (${c.type}).` })),
    indirectly_affected: indirectly.map((c) => ({ component: c.name, reason: `Depends on data/logic touched by the change (${c.type}).` })),
    testing_impact: ["Update tests covering the changed flow", touchesAuth ? "Add authentication/OTP test cases" : "Review existing test coverage"],
    database_impact: touchesDb ? ["Schema/data may need new fields to support the change"] : [],
    impact_score: score,
    risk_level: risk,
  };
}

/**
 * Compare a requirement's expected behavior against a developer-described
 * "observed implementation" to detect drift.
 */
export async function detectDrift({ requirementText, observedImplementation }) {
  const system =
    "You are a QA/architecture auditor. Compare a requirement's expected behavior to the described " +
    "observed implementation and return ONLY JSON: " +
    '{"has_drift": boolean, "drift_type": "missing"|"partial"|"contradictory"|"outdated"|"api"|"database"|"test"|null, ' +
    '"severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"|null, "expected_behavior": string, "observed_behavior": string, "explanation": string}';

  const userPrompt = `Requirement: "${requirementText}"\nObserved implementation: "${observedImplementation}"`;
  const result = await callClaude(system, userPrompt);
  if (result) return result;

  // Mock fallback: naive keyword comparison
  const reqWords = new Set(requirementText.toLowerCase().match(/[a-z]+/g) || []);
  const implWords = new Set(observedImplementation.toLowerCase().match(/[a-z]+/g) || []);
  const missing = [...reqWords].filter((w) => w.length > 4 && !implWords.has(w));
  const hasDrift = missing.length > 0;

  return {
    has_drift: hasDrift,
    drift_type: hasDrift ? "partial" : null,
    severity: hasDrift ? (missing.length > 2 ? "HIGH" : "MEDIUM") : null,
    expected_behavior: requirementText,
    observed_behavior: observedImplementation,
    explanation: hasDrift
      ? `The implementation appears to omit or not enforce: ${missing.join(", ")}.`
      : "Implementation appears to match the requirement's stated behavior.",
  };
}

/**
 * Generate concrete, per-component change suggestions for an approved requirement change.
 */
export async function generateSuggestions({ newText, directlyAffected }) {
  const system =
    "You are a senior engineer proposing concrete code changes. Given a new requirement and a list of " +
    "affected components, return ONLY JSON array with schema: " +
    '[{"component": string, "proposed_change": string, "reason": string, "risk_level": "LOW"|"MEDIUM"|"HIGH", ' +
    '"diff_before": string, "diff_after": string}]. Keep diffs short (one line each).';

  const userPrompt = `New requirement: "${newText}"\nAffected components: ${JSON.stringify(directlyAffected)}`;
  const result = await callClaude(system, userPrompt);
  if (result) return result;

  return directlyAffected.map((c) => ({
    component: c.component || c.name,
    proposed_change: `Update ${c.component || c.name} to support: ${newText}`,
    reason: c.reason || "Directly implements the changed requirement.",
    risk_level: "MEDIUM",
    diff_before: "// existing implementation",
    diff_after: "// updated implementation to satisfy new requirement",
  }));
}

export const aiConfigured = hasKey;
