import { Router } from "express";
import { pool } from "../db/pool.js";
import { analyzeImpact, generateSuggestions } from "../services/aiService.js";

const router = Router();

// POST /api/analysis/:requirementId/impact
// Compares two versions (defaults to current vs previous) and stores the result.
router.post("/:requirementId/impact", async (req, res) => {
  const { requirementId } = req.params;
  let { fromVersion, toVersion } = req.body;

  const reqRow = await pool.query("SELECT * FROM requirements WHERE id=$1", [requirementId]);
  if (!reqRow.rows.length) return res.status(404).json({ error: "Requirement not found" });

  toVersion = toVersion || reqRow.rows[0].current_version;
  fromVersion = fromVersion || Math.max(1, toVersion - 1);

  const versions = await pool.query(
    "SELECT * FROM requirement_versions WHERE requirement_id=$1 AND version = ANY($2)",
    [requirementId, [fromVersion, toVersion]]
  );
  const oldV = versions.rows.find((v) => v.version === fromVersion);
  const newV = versions.rows.find((v) => v.version === toVersion);
  if (!oldV || !newV) return res.status(400).json({ error: "Requested versions not found" });

  const componentsRes = await pool.query("SELECT id, name, type FROM components");

  const impact = await analyzeImpact({
    oldText: oldV.text,
    newText: newV.text,
    components: componentsRes.rows,
  });

  const insert = await pool.query(
    `INSERT INTO impact_analyses
      (requirement_id, from_version, to_version, diff_summary, directly_affected, indirectly_affected,
       testing_impact, database_impact, impact_score, risk_level, reasoning)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      requirementId,
      fromVersion,
      toVersion,
      impact.diff_summary,
      JSON.stringify(impact.directly_affected || []),
      JSON.stringify(impact.indirectly_affected || []),
      JSON.stringify(impact.testing_impact || []),
      JSON.stringify(impact.database_impact || []),
      impact.impact_score,
      impact.risk_level,
      impact.reasoning || null,
    ]
  );

  res.status(201).json(insert.rows[0]);
});

// GET /api/analysis/:requirementId/impact — history of past analyses
router.get("/:requirementId/impact", async (req, res) => {
  const { requirementId } = req.params;
  const { rows } = await pool.query(
    "SELECT * FROM impact_analyses WHERE requirement_id=$1 ORDER BY created_at DESC",
    [requirementId]
  );
  res.json(rows);
});

// POST /api/analysis/:requirementId/suggestions
// Generates AI suggestions from the latest impact analysis's directly_affected list.
router.post("/:requirementId/suggestions", async (req, res) => {
  const { requirementId } = req.params;
  const latest = await pool.query(
    "SELECT * FROM impact_analyses WHERE requirement_id=$1 ORDER BY created_at DESC LIMIT 1",
    [requirementId]
  );
  if (!latest.rows.length) return res.status(400).json({ error: "Run impact analysis first" });

  const currentVersion = await pool.query(
    "SELECT rv.text FROM requirement_versions rv JOIN requirements r ON r.id = rv.requirement_id WHERE r.id=$1 AND rv.version = r.current_version",
    [requirementId]
  );

  const suggestions = await generateSuggestions({
    newText: currentVersion.rows[0].text,
    directlyAffected: latest.rows[0].directly_affected,
  });

  const inserted = [];
  for (const s of suggestions) {
    const row = await pool.query(
      `INSERT INTO suggestions (requirement_id, proposed_change, reason, risk_level, diff_before, diff_after)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [requirementId, s.proposed_change, s.reason, s.risk_level, s.diff_before, s.diff_after]
    );
    inserted.push(row.rows[0]);
  }
  res.status(201).json(inserted);
});

// GET suggestions for a requirement
router.get("/:requirementId/suggestions", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM suggestions WHERE requirement_id=$1 ORDER BY created_at DESC",
    [req.params.requirementId]
  );
  res.json(rows);
});

// PATCH /api/analysis/suggestions/:id — developer approves or rejects
router.patch("/suggestions/:id", async (req, res) => {
  const { status } = req.body; // "approved" | "rejected"
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" });
  }
  const { rows } = await pool.query(
    "UPDATE suggestions SET status=$1, decided_at=now() WHERE id=$2 RETURNING *",
    [status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Suggestion not found" });
  res.json(rows[0]);
});

export default router;
