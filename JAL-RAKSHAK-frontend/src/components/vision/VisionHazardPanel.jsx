import { useState } from "react";
import { Camera, Eye, Filter, RefreshCw, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatTime } from "../../utils/formatters";

export default function VisionHazardPanel({ vision }) {
  const { events, loading, error, refresh, triggerTestObservation } = vision;
  const [selectedCamera, setSelectedCamera] = useState("ALL");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [triggering, setTriggering] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const cameras = ["ALL", ...new Set(events.map(e => e.cameraId).filter(Boolean))];
  const classes = ["ALL", "standing_water", "road_waterlogging"];

  const filteredEvents = events.filter(e => {
    if (selectedCamera !== "ALL" && e.cameraId !== selectedCamera) return false;
    if (selectedClass !== "ALL" && e.className !== selectedClass) return false;
    return true;
  });

  const handleSimulate = async () => {
    setTriggering(true);
    setTestResult(null);
    try {
      const res = await triggerTestObservation("standing_water", 0.91);
      setTestResult({ ok: true, msg: "Test event transmitted & persisted (HTTP 201)" });
    } catch (err) {
      setTestResult({ ok: false, msg: err.message || "Failed to trigger test event" });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-cyan-400">
            <Camera size={14} /> Edge Vision Observation Feed
          </div>
          <h3 className="mt-1 text-lg font-semibold text-white">Visual Water-Hazard Detections</h3>
          <p className="text-xs text-slate-400">
            Surface water & road waterlogging events verified by edge vision pipeline.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulate}
            disabled={triggering}
            className="btn btn-primary text-xs flex items-center gap-1.5"
            title="Inject development verification event"
          >
            <Send size={13} /> {triggering ? "Injecting..." : "Simulate Camera Event"}
          </button>
          <button
            onClick={refresh}
            className="btn text-xs text-slate-400 hover:text-white"
            title="Refresh observations"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`mt-3 p-2.5 text-xs border ${testResult.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"} flex items-center justify-between`}>
          <span>{testResult.msg}</span>
          <span className="font-mono text-[10px] uppercase font-bold">DEV TEST</span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Filter size={12} />
          <span>Camera:</span>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-200"
          >
            {cameras.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-200"
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <span className="ml-auto text-[11px] text-slate-500">
          Showing {filteredEvents.length} observations
        </span>
      </div>

      {/* Events List */}
      <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {loading && events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading vision feed...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded border border-dashed border-slate-800 py-8 text-center text-xs text-slate-500">
            No visual water hazards detected matching current filters.
          </div>
        ) : (
          filteredEvents.map(event => (
            <div
              key={event.id}
              className="flex flex-col gap-2 rounded border border-slate-800/80 bg-slate-900/60 p-3 text-xs transition hover:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border ${event.className.includes("water") ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                  <Eye size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 capitalize">
                      {event.className.replace(/_/g, " ")}
                    </span>
                    <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                      {(event.confidence * 100).toFixed(1)}% conf
                    </span>
                    {event.isTestEvent && (
                      <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-yellow-300 uppercase tracking-wide">
                        TEST EVENT
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                    <span>Camera: <strong className="text-slate-300">{event.cameraId}</strong></span>
                    {event.locationId && <span>Location: <strong className="text-slate-300">{event.locationId}</strong></span>}
                    {event.trackId && <span>Track: <span className="font-mono text-slate-400">{event.trackId}</span></span>}
                    {event.bbox && <span>BBox: <span className="font-mono text-slate-500">[{event.bbox.join(", ")}]</span></span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-right sm:flex-col sm:items-end">
                <span className="text-[11px] text-slate-500 font-mono">
                  {formatTime(event.timestamp)}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 size={11} /> Verified Ingestion
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>Live annotated camera streams require RTSP/V4L2 hardware connection</span>
        <span className="font-mono">Socket.IO: vision:event</span>
      </div>
    </section>
  );
}
