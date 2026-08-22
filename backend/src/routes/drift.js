import { Router } from "express";
import { pool } from "../db/pool.js";
import { detectDrift } from "../services/aiService.js";

const router = Router();

// GET all drift issues (optionally filter by status)
router.get("/", async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = "";
  if (status) {
    params.push(status);
    where = "WHERE d.status = $1";
  }
  const { rows } = await pool.query(
    `SELECT d.*, r.code AS requirement_code, c.name AS component_name
     FROM drift_issues d
     JOIN requirements r ON r.id = d.requirement_id
     LEFT JOIN components c ON c.id = d.component_id
     ${where}
     ORDER BY d.created_at DESC`,
    params
  );
  res.json(rows);
});

// POST run drift detection: compare a requirement's current text to a
// developer-described observed implementation.
router.post("/check", async (req, res) => {
  const { requirementId, componentId, observedImplementation } = req.body;
  if (!requirementId || !observedImplementation) {
    return res.status(400).json({ error: "requirementId and observedImplementation are required" });
  }

  const reqRow = await pool.query(
    `SELECT rv.text FROM requirement_versions rv
     JOIN requirements r ON r.id = rv.requirement_id
     WHERE r.id=$1 AND rv.version = r.current_version`,
    [requirementId]
  );
  if (!reqRow.rows.length) return res.status(404).json({ error: "Requirement not found" });

  const result = await detectDrift({
    requirementText: reqRow.rows[0].text,
    observedImplementation,
  });

  if (!result.has_drift) return res.json({ has_drift: false, explanation: result.explanation });

  const insert = await pool.query(
    `INSERT INTO drift_issues (requirement_id, component_id, drift_type, severity, expected_behavior, observed_behavior)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [requirementId, componentId || null, result.drift_type, result.severity, result.expected_behavior, result.observed_behavior]
  );

  if (componentId) {
    await pool.query("UPDATE traceability_links SET has_drift=true WHERE requirement_id=$1 AND component_id=$2", [
      requirementId,
      componentId,
    ]);
  }

  res.status(201).json({ has_drift: true, explanation: result.explanation, issue: insert.rows[0] });
});

// PATCH mark a drift issue acknowledged/resolved
router.patch("/:id", async (req, res) => {
  const { status } = req.body; // acknowledged | resolved
  const { rows } = await pool.query("UPDATE drift_issues SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Issue not found" });
  res.json(rows[0]);
});

export default router;
