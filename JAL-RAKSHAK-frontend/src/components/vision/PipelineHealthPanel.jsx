import { Cpu, Activity, Clock, Database, Layers, CheckCircle, AlertCircle } from "lucide-react";
import { formatTime } from "../../utils/formatters";

export default function PipelineHealthPanel({ vision }) {
  const { status } = vision;

  const isRunning = status.status === "RUNNING";
  const isStandby = status.status === "STANDBY";

  return (
    <section className="panel p-5">
      <div className="border-b border-slate-800 pb-4">
        <div className="eyebrow flex items-center gap-1.5 text-cyan-400">
          <Cpu size={14} /> PipeGen + TensorRT + Edge Runtime
        </div>
        <h3 className="mt-1 text-lg font-semibold text-white">Edge Pipeline Telemetry & Health</h3>
        <p className="text-xs text-slate-400">
          Operational state of compiled visual inference pipeline and edge transport adapter.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
          <div className="eyebrow text-slate-500">Pipeline State</div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : isStandby ? "bg-amber-400" : "bg-slate-500"}`} />
            <span className={`text-sm font-bold uppercase ${isRunning ? "text-emerald-300" : isStandby ? "text-amber-300" : "text-slate-400"}`}>
              {status.status || "UNKNOWN"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {isRunning ? "Actively processing frames" : "Standby / Awaiting video stream"}
          </div>
        </div>

        {/* Throughput */}
        <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
          <div className="eyebrow text-slate-500">Inference Throughput</div>
          <div className="mt-1.5 text-lg font-bold text-white font-mono">
            {status.measuredFps !== null && status.measuredFps !== undefined ? `${status.measuredFps} FPS` : "Standby"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {status.measuredFps ? "Target: 30.0 FPS" : "Awaiting active video feed"}
          </div>
        </div>

        {/* Latency */}
        <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
          <div className="eyebrow text-slate-500">Inference Latency</div>
          <div className="mt-1.5 text-lg font-bold text-white font-mono">
            {status.measuredLatencyMs !== null && status.measuredLatencyMs !== undefined ? `${status.measuredLatencyMs} ms` : "Standby"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {status.measuredLatencyMs ? "TensorRT FP16 pass" : "Awaiting active benchmark"}
          </div>
        </div>

        {/* Database Persistence */}
        <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
          <div className="eyebrow text-slate-500">Persistence Store</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
            <Database size={14} className={status.databaseConfigured ? "text-cyan-400" : "text-amber-400"} />
            <span>{status.databaseConfigured ? "Neon PostgreSQL" : "Local JSON Store"}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {status.databaseConfigured ? "Table: vision_events" : "Local collection fallback"}
          </div>
        </div>
      </div>

      {/* Model & Runtime Details */}
      <div className="mt-4 rounded border border-slate-800/80 bg-slate-900/30 p-3 text-xs">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-slate-400">
          <div>
            <span className="text-slate-500">Model Name:</span>{" "}
            <strong className="text-slate-300 font-mono">{status.modelName || "yolov8_waterlogging.onnx"}</strong>
          </div>
          <div>
            <span className="text-slate-500">Engine Name:</span>{" "}
            <strong className="text-slate-300 font-mono">{status.engineName || "yolov8_waterlogging.engine"}</strong>
          </div>
          <div>
            <span className="text-slate-500">Last Observation:</span>{" "}
            <strong className="text-slate-300 font-mono">{formatTime(status.lastEventTimestamp)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Adapter Transport:</span>{" "}
            <strong className="text-emerald-400 font-semibold">{status.adapterConnected ? "Connected (HTTP/Socket)" : "Ready"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
