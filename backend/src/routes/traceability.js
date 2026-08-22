import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// GET full traceability matrix
router.get("/matrix", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT tl.id, r.code AS requirement_code, r.title AS requirement_title,
           c.name AS component_name, c.type AS component_type,
           tl.relationship, tl.confidence, tl.has_drift, tl.reason
    FROM traceability_links tl
    JOIN requirements r ON r.id = tl.requirement_id
    JOIN components c ON c.id = tl.component_id
    ORDER BY r.code, tl.relationship
  `);
  res.json(rows);
});

// GET traceability graph for one requirement (nodes + edges, for graph rendering)
router.get("/:requirementId/graph", async (req, res) => {
  const { requirementId } = req.params;
  const reqRow = await pool.query("SELECT id, code, title FROM requirements WHERE id=$1", [requirementId]);
  if (!reqRow.rows.length) return res.status(404).json({ error: "Requirement not found" });

  const links = await pool.query(
    `SELECT tl.*, c.name, c.type FROM traceability_links tl
     JOIN components c ON c.id = tl.component_id
     WHERE tl.requirement_id = $1`,
    [requirementId]
  );

  const nodes = [
    { id: `req-${requirementId}`, label: reqRow.rows[0].code, kind: "requirement" },
    ...links.rows.map((l) => ({ id: `comp-${l.component_id}`, label: l.name, kind: l.type, hasDrift: l.has_drift })),
  ];
  const edges = links.rows.map((l) => ({
    from: `req-${requirementId}`,
    to: `comp-${l.component_id}`,
    relationship: l.relationship,
    confidence: l.confidence,
  }));

  res.json({ requirement: reqRow.rows[0], nodes, edges });
});

// POST link a component to a requirement (manual or AI-assisted linking)
router.post("/", async (req, res) => {
  const { requirementId, componentId, relationship, confidence, reason } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO traceability_links (requirement_id, component_id, relationship, confidence, reason)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (requirement_id, component_id) DO UPDATE SET relationship=$3, confidence=$4, reason=$5
     RETURNING *`,
    [requirementId, componentId, relationship || "direct", confidence || 50, reason || null]
  );
  res.status(201).json(rows[0]);
});

export default router;
