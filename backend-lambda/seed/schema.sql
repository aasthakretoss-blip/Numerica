CREATE TABLE IF NOT EXISTS employees (
  id          UUID PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  department  TEXT NOT NULL,
  role        TEXT NOT NULL,
  location    TEXT,
  status      TEXT NOT NULL CHECK (status IN ('Active','Leave','Inactive')),
  hire_date   TIMESTAMPTZ,
  tags        TEXT[],
  avatar_url  TEXT
);
CREATE INDEX IF NOT EXISTS idx_employees_fullname ON employees ((lower(first_name || ' ' || last_name)));
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees (lower(email));
CREATE INDEX IF NOT EXISTS idx_employees_filters ON employees (department, role, status, location);

