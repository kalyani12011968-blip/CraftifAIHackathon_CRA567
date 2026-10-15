import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../services/api";
import { useRealtime } from "./useRealtime";

export function useVision() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState({
    status: "NOT_CONFIGURED",
    adapterConnected: false,
    modelName: "yolov8_waterlogging.onnx",
    engineName: "yolov8_waterlogging.engine",
    measuredFps: null,
    measuredLatencyMs: null
  });
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVisionData = useCallback(async () => {
    try {
      const [eventsRes, statusRes, corrRes] = await Promise.allSettled([
        apiFetch("/vision/events?limit=20"),
        apiFetch("/vision/status"),
        apiFetch("/vision/correlated-risk")
      ]);

      if (eventsRes.status === "fulfilled" && eventsRes.value?.success) {
        setEvents(eventsRes.value.data || []);
      }
      if (statusRes.status === "fulfilled" && statusRes.value?.success) {
        setStatus(statusRes.value.data || {});
      }
      if (corrRes.status === "fulfilled" && corrRes.value?.success) {
        setCorrelation(corrRes.value.data || null);
      }
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load vision edge data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisionData();
    const interval = setInterval(fetchVisionData, 12000);
    return () => clearInterval(interval);
  }, [fetchVisionData]);

  // Real-time socket updates
  useRealtime((event, data) => {
    if (event === "vision:event" && data) {
      setEvents(prev => {
        // Prevent duplicate IDs
        const exists = prev.some(e => e.id === data.id);
        if (exists) return prev;
        return [data, ...prev.slice(0, 49)];
      });
    }
    if (event === "vision:status" && data) {
      setStatus(prev => ({ ...prev, ...data }));
    }
    if (event === "vision:correlation" && data) {
      setCorrelation(data);
    }
  });

  const triggerTestObservation = async (className = "standing_water", confidence = 0.88) => {
    try {
      const payload = {
        source: "frontend-simulation-trigger",
        eventType: "WATER_HAZARD_OBSERVATION",
        className,
        confidence,
        cameraId: "CAM-001",
        locationId: "SITE-001",
        timestamp: new Date().toISOString(),
        bbox: [140, 210, 290, 175],
        evidenceUrl: "https://jalrakshak.local/evidence/demo_observation.jpg",
        trackId: `TRK-${Date.now().toString().slice(-4)}`,
        isTestEvent: true
      };

      const res = await apiFetch("/vision/events", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res.success && res.data) {
        // Immediately update state
        setEvents(prev => [res.data, ...prev]);
        const corrRes = await apiFetch("/vision/correlated-risk");
        if (corrRes?.success) setCorrelation(corrRes.data);
      }
      return res;
    } catch (err) {
      console.error("Test observation trigger error:", err);
      throw err;
    }
  };

  return {
    events,
    status,
    correlation,
    loading,
    error,
    refresh: fetchVisionData,
    triggerTestObservation
  };
}
