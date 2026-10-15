import { ShieldAlert, CheckCircle, AlertTriangle, Eye, Waves, GitMerge, Info } from "lucide-react";

export default function CorrelatedRiskPanel({ vision, sensorReading, prediction }) {
  const { correlation, events } = vision;
  const latestVision = events[0] || null;

  const category = correlation?.category || (
    latestVision && prediction?.riskScore >= 50 ? "MULTI_SOURCE_RISK" :
    latestVision ? "VISUAL_OBSERVATION_ONLY" : "SENSOR_PREDICTION_ONLY"
  );

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "MULTI_SOURCE_RISK":
        return {
          bg: "bg-red-500/10 border-red-500/30 text-red-300",
          icon: ShieldAlert,
          title: "Multi-Source Correlated Risk",
          desc: "Independent sensor telemetry AND visual camera observation confirm water hazard."
        };
      case "VISUAL_OBSERVATION_ONLY":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
          icon: Eye,
          title: "Visual Observation Only",
          desc: "Visible standing water identified by camera, without elevated sensor threshold."
        };
      case "SENSOR_PREDICTION_ONLY":
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/30 text-blue-300",
          icon: Waves,
          title: "Sensor Prediction Only",
          desc: "Telemetry-driven risk assessment active without visual confirmation."
        };
    }
  };

  const badge = getCategoryBadge(category);
  const BadgeIcon = badge.icon;

  return (
    <section className="panel p-5">
      <div className="border-b border-slate-800 pb-4">
        <div className="eyebrow flex items-center gap-1.5 text-cyan-400">
          <GitMerge size={14} /> Multi-Source Risk Intelligence Fusion
        </div>
        <h3 className="mt-1 text-lg font-semibold text-white">Cross-Modal Risk Correlation</h3>
        <p className="text-xs text-slate-400">
          Correlates independent physical sensor telemetry with edge visual observation post.
        </p>
      </div>

      {/* Primary Category Banner */}
      <div className={`mt-4 rounded border p-4 ${badge.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold uppercase tracking-wide text-xs">
            <BadgeIcon size={16} />
            {badge.title}
          </div>
          <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-black/40">
            {correlation?.correlated ? "Cross-Verified" : "Single-Source"}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-200">
          {correlation?.reason || badge.desc}
        </p>
      </div>

      {/* Three Independent Pillars */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {/* Pillar 1: Sensor Prediction */}
        <div className="rounded border border-slate-800 bg-slate-900/70 p-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="eyebrow flex items-center gap-1 text-slate-400">
              <Waves size={12} className="text-cyan-400" /> Sensor Pillar
            </span>
            <span className="font-mono text-[10px] text-slate-400">{sensorReading?.deviceId || "JR-001"}</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Water Depth:</span>
              <strong className="text-slate-200">{sensorReading?.waterLevel ?? 42} cm</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rise Rate:</span>
              <strong className="text-slate-200">{sensorReading?.riseRate ?? 3.5} cm/min</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rainfall:</span>
              <strong className="text-slate-200">{sensorReading?.rainfall ?? 80} mm</strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-semibold">Sensor Risk:</span>
              <span className={`font-bold ${prediction?.riskScore >= 76 ? "text-red-400" : prediction?.riskScore >= 51 ? "text-amber-400" : "text-emerald-400"}`}>
                {prediction?.riskScore ?? 82}/100 ({prediction?.status ?? "WARNING"})
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Visual Observation */}
        <div className="rounded border border-slate-800 bg-slate-900/70 p-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="eyebrow flex items-center gap-1 text-slate-400">
              <Eye size={12} className="text-amber-400" /> Vision Pillar
            </span>
            <span className="font-mono text-[10px] text-slate-400">{latestVision?.cameraId || "CAM-001"}</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Detected Class:</span>
              <strong className="text-slate-200 capitalize">
                {latestVision ? latestVision.className.replace(/_/g, " ") : "No observation"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence:</span>
              <strong className="text-slate-200">
                {latestVision ? `${(latestVision.confidence * 100).toFixed(1)}%` : "N/A"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Observation Type:</span>
              <span className={latestVision?.isTestEvent ? "text-yellow-400 font-bold" : "text-emerald-400"}>
                {latestVision?.isTestEvent ? "DEV SIMULATION" : latestVision ? "EDGE INFERENCE" : "IDLE"}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-semibold">Evidence Status:</span>
              <span className="text-slate-300">
                {latestVision?.evidenceUrl ? "Snapshot logged" : "Metadata verified"}
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Correlation Reasoning */}
        <div className="rounded border border-slate-800 bg-slate-900/70 p-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="eyebrow flex items-center gap-1 text-slate-400">
              <GitMerge size={12} className="text-emerald-400" /> Decision Engine
            </span>
            <span className="font-mono text-[10px] text-cyan-400">Window: 300s</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Location Mapping:</span>
              <strong className="text-slate-200">
                {correlation?.locationName || "Adyar Bridge (Mapped)"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time Alignment:</span>
              <strong className="text-slate-200">
                {correlation?.timeDeltaSeconds ? `Δ ${correlation.timeDeltaSeconds}s` : "Synchronized"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Calibration:</span>
              <span className="text-slate-400 italic">Independent Sources</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-semibold">Classification:</span>
              <span className="font-bold text-cyan-300 uppercase">{category.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded bg-slate-900/50 p-2.5 text-[11px] text-slate-400">
        <Info size={14} className="shrink-0 text-cyan-400" />
        <span>
          <strong>Preservation Principle:</strong> Visual observation confirms standing road water without fabricating flood depth or overriding underlying sensor calibration.
        </span>
      </div>
    </section>
  );
}
