CREATE TABLE IF NOT EXISTS telemetry_readings (
  device_id TEXT NOT NULL,
  timestamp_ms BIGINT NOT NULL,
  tank_level_percent DOUBLE PRECISION NOT NULL CHECK (tank_level_percent BETWEEN 0 AND 100),
  demand_kw DOUBLE PRECISION NOT NULL CHECK (demand_kw >= 0),
  energy_kwh DOUBLE PRECISION NOT NULL CHECK (energy_kwh >= 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, timestamp_ms)
);

CREATE INDEX IF NOT EXISTS telemetry_readings_timestamp_idx ON telemetry_readings (timestamp_ms DESC);

CREATE TABLE IF NOT EXISTS alarm_events (
  event_id TEXT PRIMARY KEY,
  timestamp_ms BIGINT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alarm_events_timestamp_idx ON alarm_events (timestamp_ms DESC);