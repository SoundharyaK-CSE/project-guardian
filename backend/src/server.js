import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { aiConfigured } from "./services/aiService.js";

import requirementsRouter from "./routes/requirements.js";
import analysisRouter from "./routes/analysis.js";
import traceabilityRouter from "./routes/traceability.js";
import driftRouter from "./routes/drift.js";
import dashboardRouter from "./routes/dashboard.js";
import componentsRouter from "./routes/components.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiConfigured });
});

app.use("/api/requirements", requirementsRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/traceability", traceabilityRouter);
app.use("/api/drift", driftRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/components", componentsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Project Guardian API running on port ${PORT}`);
  console.log(`AI mode: ${aiConfigured ? "Claude API (live)" : "mock/heuristic fallback (no ANTHROPIC_API_KEY set)"}`);
});
