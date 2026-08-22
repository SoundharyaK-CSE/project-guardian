import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM components ORDER BY type, name");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, type, path, description } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });
  const { rows } = await pool.query(
    "INSERT INTO components (name, type, path, description) VALUES ($1,$2,$3,$4) RETURNING *",
    [name, type, path || null, description || null]
  );
  res.status(201).json(rows[0]);
});

export default router;
