-- ============================================================
-- JAL-RAKSHAK EDGE: VISION EVENTS & HEARTBEATS SCHEMA
-- MIGRATION: 002_create_vision_events.sql
-- ============================================================

-- 1. VISION EVENTS TABLE
CREATE TABLE IF NOT EXISTS vision_events (
    event_id VARCHAR(100) PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    camera_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hazard_type VARCHAR(50) NOT NULL CHECK (hazard_type IN ('waterlogging', 'debris_blockage', 'overflow', 'turbulence', 'rapid_rise', 'none')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    bounding_box JSONB DEFAULT '[]'::jsonb,
    optical_flow JSONB DEFAULT '{}'::jsonb,
    is_test_event BOOLEAN DEFAULT FALSE,
    pipeline_fps DOUBLE PRECISION,
    pipeline_latency_ms DOUBLE PRECISION,
    snapshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying of vision events
CREATE INDEX IF NOT EXISTS idx_vision_events_device ON vision_events(device_id);
CREATE INDEX IF NOT EXISTS idx_vision_events_timestamp ON vision_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vision_events_hazard ON vision_events(hazard_type);
CREATE INDEX IF NOT EXISTS idx_vision_events_severity ON vision_events(severity);

-- 2. VISION HEARTBEATS TABLE (Pipeline health telemetry)
CREATE TABLE IF NOT EXISTS vision_heartbeats (
    heartbeat_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    camera_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    pipeline_fps DOUBLE PRECISION,
    inference_latency_ms DOUBLE PRECISION,
    e2e_latency_ms DOUBLE PRECISION,
    system_metrics JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vision_heartbeats_device ON vision_heartbeats(device_id);
CREATE INDEX IF NOT EXISTS idx_vision_heartbeats_timestamp ON vision_heartbeats(timestamp DESC);

-- 3. CORRELATED RISK LOG TABLE
CREATE TABLE IF NOT EXISTS correlated_risk_events (
    correlation_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical_risk_score DOUBLE PRECISION NOT NULL,
    visual_risk_score DOUBLE PRECISION NOT NULL,
    correlated_risk_score DOUBLE PRECISION NOT NULL,
    correlated_level VARCHAR(20) NOT NULL,
    correlation_state VARCHAR(50) NOT NULL,
    latest_hazard_type VARCHAR(50),
    latest_hazard_confidence DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corr_risk_device ON correlated_risk_events(device_id);
CREATE INDEX IF NOT EXISTS idx_corr_risk_timestamp ON correlated_risk_events(timestamp DESC);
