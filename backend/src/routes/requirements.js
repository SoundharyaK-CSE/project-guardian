import { Router } from "express";
import { pool } from "../db/pool.js";
import { understandRequirement } from "../services/aiService.js";

const router = Router();

// GET all requirements (with latest version text)
router.get("/", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.id, r.code, r.title, r.current_version, r.status,
           rv.text AS current_text, rv.understanding
    FROM requirements r
    JOIN requirement_versions rv
      ON rv.requirement_id = r.id AND rv.version = r.current_version
    ORDER BY r.id
  `);
  res.json(rows);
});

// GET one requirement with full version history
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const reqRes = await pool.query("SELECT * FROM requirements WHERE id=$1", [id]);
  if (!reqRes.rows.length) return res.status(404).json({ error: "Requirement not found" });

  const versions = await pool.query(
    "SELECT * FROM requirement_versions WHERE requirement_id=$1 ORDER BY version",
    [id]
  );
  res.json({ ...reqRes.rows[0], versions: versions.rows });
});

// POST create a new requirement (version 1) — runs AI understanding
router.post("/", async (req, res) => {
  const { code, title, text } = req.body;
  if (!code || !title || !text) return res.status(400).json({ error: "code, title, text are required" });

  const understanding = await understandRequirement(text);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reqInsert = await client.query(
      "INSERT INTO requirements (code, title, current_version) VALUES ($1,$2,1) RETURNING *",
      [code, title]
    );
    const requirement = reqInsert.rows[0];
    const versionInsert = await client.query(
      "INSERT INTO requirement_versions (requirement_id, version, text, understanding) VALUES ($1,1,$2,$3) RETURNING *",
      [requirement.id, text, understanding]
    );
    await client.query("COMMIT");
    res.status(201).json({ ...requirement, versions: [versionInsert.rows[0]] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create requirement" });
  } finally {
    client.release();
  }
});

// POST new version of an existing requirement — runs AI understanding
// (impact analysis + drift are computed separately via /api/analysis)
router.post("/:id/versions", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const reqRow = await pool.query("SELECT * FROM requirements WHERE id=$1", [id]);
  if (!reqRow.rows.length) return res.status(404).json({ error: "Requirement not found" });

  const nextVersion = reqRow.rows[0].current_version + 1;
  const understanding = await understandRequirement(text);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const versionInsert = await client.query(
      "INSERT INTO requirement_versions (requirement_id, version, text, understanding) VALUES ($1,$2,$3,$4) RETURNING *",
      [id, nextVersion, text, understanding]
    );
    await client.query("UPDATE requirements SET current_version=$1 WHERE id=$2", [nextVersion, id]);
    await client.query("COMMIT");
    res.status(201).json(versionInsert.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create version" });
  } finally {
    client.release();
  }
});

export default router;
