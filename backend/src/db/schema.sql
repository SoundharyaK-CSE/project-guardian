-- Project Guardian schema

CREATE TABLE IF NOT EXISTS requirements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirement_versions (
  id SERIAL PRIMARY KEY,
  requirement_id INT REFERENCES requirements(id) ON DELETE CASCADE,
  version INT NOT NULL,
  text TEXT NOT NULL,
  understanding JSONB,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(requirement_id, version)
);

CREATE TABLE IF NOT EXISTS components (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  path VARCHAR(500),
  description TEXT
);

CREATE TABLE IF NOT EXISTS traceability_links (
  id SERIAL PRIMARY KEY,
  requirement_id INT REFERENCES requirements(id) ON DELETE CASCADE,
  component_id INT REFERENCES components(id) ON DELETE CASCADE,
  relationship VARCHAR(20) NOT NULL DEFAULT 'direct',
  confidence INT NOT NULL DEFAULT 50,
  reason TEXT,
  has_drift BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(requirement_id, component_id)
);

CREATE TABLE IF NOT EXISTS impact_analyses (
  id SERIAL PRIMARY KEY,
  requirement_id INT REFERENCES requirements(id) ON DELETE CASCADE,
  from_version INT,
  to_version INT,
  diff_summary JSONB,
  directly_affected JSONB,
  indirectly_affected JSONB,
  testing_impact JSONB,
  database_impact JSONB,
  impact_score INT,
  risk_level VARCHAR(20),
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drift_issues (
  id SERIAL PRIMARY KEY,
  requirement_id INT REFERENCES requirements(id) ON DELETE CASCADE,
  component_id INT REFERENCES components(id) ON DELETE SET NULL,
  drift_type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  expected_behavior TEXT,
  observed_behavior TEXT,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  requirement_id INT REFERENCES requirements(id) ON DELETE CASCADE,
  component_id INT REFERENCES components(id) ON DELETE SET NULL,
  proposed_change TEXT NOT NULL,
  reason TEXT,
  risk_level VARCHAR(20) DEFAULT 'MEDIUM',
  diff_before TEXT,
  diff_after TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  decided_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_versions_req ON requirement_versions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_links_req ON traceability_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_drift_req ON drift_issues(requirement_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_req ON suggestions(requirement_id);
