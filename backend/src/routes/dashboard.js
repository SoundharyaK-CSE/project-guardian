import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const [reqs, comps, changedReqs, drift, highImpact, pendingSuggestions] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM requirements"),
    pool.query("SELECT COUNT(*) FROM components"),
    pool.query("SELECT COUNT(*) FROM requirements WHERE current_version > 1"),
    pool.query("SELECT COUNT(*) FROM drift_issues WHERE status='open'"),
    pool.query("SELECT COUNT(*) FROM impact_analyses WHERE risk_level IN ('HIGH','CRITICAL')"),
    pool.query("SELECT COUNT(*) FROM suggestions WHERE status='pending'"),
  ]);

  const totalReqs = Number(reqs.rows[0].count) || 0;
  const linked = await pool.query("SELECT COUNT(DISTINCT requirement_id) FROM traceability_links");
  const tested = await pool.query("SELECT COUNT(DISTINCT requirement_id) FROM traceability_links WHERE relationship='testing'");
  const driftCount = Number(drift.rows[0].count) || 0;

  const requirementAlignment = totalReqs ? Math.round((Number(linked.rows[0].count) / totalReqs) * 100) : 0;
  const implementationCoverage = totalReqs ? Math.round((Number(linked.rows[0].count) / totalReqs) * 100) : 0;
  const testAlignment = totalReqs ? Math.round((Number(tested.rows[0].count) / totalReqs) * 100) : 0;
  const driftLevel = driftCount === 0 ? "LOW" : driftCount <= 3 ? "MEDIUM" : "HIGH";

  const health = Math.round(
    requirementAlignment * 0.4 + implementationCoverage * 0.35 + testAlignment * 0.25 - driftCount * 2
  );

  res.json({
    requirements: totalReqs,
    codeComponents: Number(comps.rows[0].count) || 0,
    changedRequirements: Number(changedReqs.rows[0].count) || 0,
    driftIssues: driftCount,
    highImpactChanges: Number(highImpact.rows[0].count) || 0,
    pendingSuggestions: Number(pendingSuggestions.rows[0].count) || 0,
    projectHealth: Math.max(0, Math.min(100, health)),
    requirementAlignment,
    implementationCoverage,
    testAlignment,
    driftLevel,
  });
});

export default router;
