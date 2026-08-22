/**
 * Seeds the database with the REQ-001 login → OTP example used throughout
 * the Project Guardian spec, so the dashboard/UI has real data on first run.
 *
 * Run with: npm run seed
 */
import dotenv from "dotenv";
dotenv.config();
import { pool } from "./db/pool.js";
import { understandRequirement, analyzeImpact, detectDrift } from "./services/aiService.js";

async function main() {
  console.log("Seeding Project Guardian...");

  // 1. Components
  const componentDefs = [
    ["LoginPage", "frontend", "src/pages/LoginPage.jsx"],
    ["Authentication Service", "backend", "src/services/authService.js"],
    ["Login API", "api", "POST /api/auth/login"],
    ["Authentication Controller", "backend", "src/controllers/authController.js"],
    ["User Model", "database", "src/models/User.js"],
    ["Authentication Middleware", "backend", "src/middleware/auth.js"],
    ["Login Tests", "test", "tests/auth/login.test.js"],
    ["OTP Service", "backend", "src/services/otpService.js"],
  ];
  const componentIds = {};
  for (const [name, type, path] of componentDefs) {
    const { rows } = await pool.query(
      "INSERT INTO components (name, type, path) VALUES ($1,$2,$3) RETURNING id",
      [name, type, path]
    );
    componentIds[name] = rows[0].id;
  }

  // 2. Requirement v1
  const text1 = "Users can log in using email and password.";
  const understanding1 = await understandRequirement(text1);
  const { rows: reqRows } = await pool.query(
    "INSERT INTO requirements (code, title, current_version) VALUES ($1,$2,1) RETURNING id",
    ["REQ-001", "User Login"]
  );
  const requirementId = reqRows[0].id;
  await pool.query(
    "INSERT INTO requirement_versions (requirement_id, version, text, understanding) VALUES ($1,1,$2,$3)",
    [requirementId, text1, understanding1]
  );

  // 3. Traceability links for v1
  const links = [
    ["LoginPage", "direct", 96, "Renders the login form referenced by the requirement."],
    ["Authentication Service", "direct", 94, "Implements the email/password authentication logic."],
    ["Login API", "direct", 93, "Exposes the endpoint the login form calls."],
    ["Authentication Controller", "direct", 90, "Handles the login request and response."],
    ["User Model", "indirect", 82, "Stores the credentials checked during login."],
    ["Authentication Middleware", "indirect", 78, "Relies on successful login state."],
    ["Login Tests", "testing", 91, "Covers the email/password login flow."],
  ];
  for (const [name, rel, conf, reason] of links) {
    await pool.query(
      "INSERT INTO traceability_links (requirement_id, component_id, relationship, confidence, reason) VALUES ($1,$2,$3,$4,$5)",
      [requirementId, componentIds[name], rel, conf, reason]
    );
  }

  // 4. Requirement v2 (OTP added) — this is the example from the spec
  const text2 = "Users can log in using email, password, and OTP verification.";
  const understanding2 = await understandRequirement(text2);
  await pool.query(
    "INSERT INTO requirement_versions (requirement_id, version, text, understanding) VALUES ($1,2,$2,$3)",
    [requirementId, text2, understanding2]
  );
  await pool.query("UPDATE requirements SET current_version=2 WHERE id=$1", [requirementId]);

  // link OTP Service now that it's relevant
  await pool.query(
    "INSERT INTO traceability_links (requirement_id, component_id, relationship, confidence, reason) VALUES ($1,$2,'direct',88,$3)",
    [requirementId, componentIds["OTP Service"], "Implements OTP generation/validation introduced by the new requirement."]
  );

  // 5. Run impact analysis v1 -> v2
  const componentsRes = await pool.query("SELECT id, name, type FROM components");
  const impact = await analyzeImpact({ oldText: text1, newText: text2, components: componentsRes.rows });
  await pool.query(
    `INSERT INTO impact_analyses
      (requirement_id, from_version, to_version, diff_summary, directly_affected, indirectly_affected,
       testing_impact, database_impact, impact_score, risk_level, reasoning)
     VALUES ($1,1,2,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      requirementId,
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

  // 6. Requirement 2: email verification (used for the drift example in the spec)
  const text3 = "Users must verify their email before accessing the dashboard.";
  const understanding3 = await understandRequirement(text3);
  const { rows: req2Rows } = await pool.query(
    "INSERT INTO requirements (code, title, current_version) VALUES ($1,$2,1) RETURNING id",
    ["REQ-002", "Email Verification Before Dashboard Access"]
  );
  const requirement2Id = req2Rows[0].id;
  await pool.query(
    "INSERT INTO requirement_versions (requirement_id, version, text, understanding) VALUES ($1,1,$2,$3)",
    [requirement2Id, text3, understanding3]
  );

  const dashboardCompRes = await pool.query(
    "INSERT INTO components (name, type, path) VALUES ('Dashboard Access Guard','backend','src/middleware/dashboardGuard.js') RETURNING id"
  );
  const dashboardCompId = dashboardCompRes.rows[0].id;
  await pool.query(
    "INSERT INTO traceability_links (requirement_id, component_id, relationship, confidence, reason, has_drift) VALUES ($1,$2,'direct',85,$3,true)",
    [requirement2Id, dashboardCompId, "Should enforce email verification before granting dashboard access."]
  );

  const observed = "The application checks whether the user is logged in but does not check whether the email has been verified.";
  const drift = await detectDrift({ requirementText: text3, observedImplementation: observed });
  if (drift.has_drift) {
    await pool.query(
      `INSERT INTO drift_issues (requirement_id, component_id, drift_type, severity, expected_behavior, observed_behavior)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [requirement2Id, dashboardCompId, drift.drift_type, drift.severity, drift.expected_behavior, drift.observed_behavior]
    );
  }

  console.log("Seed complete. REQ-001 id:", requirementId, "REQ-002 id:", requirement2Id);
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
