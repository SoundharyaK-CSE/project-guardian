import fs from "fs";
import { pool } from "./db/pool.js";

const sql = fs.readFileSync(new URL("./db/schema.sql", import.meta.url), "utf8");

pool.query(sql)
  .then(() => {
    console.log("Schema applied successfully.");
    return pool.end();
  })
  .catch((err) => {
    console.error("Failed to apply schema:", err);
    process.exit(1);
  });