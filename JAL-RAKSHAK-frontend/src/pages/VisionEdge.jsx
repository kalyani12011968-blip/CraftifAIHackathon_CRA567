import { Camera, Activity, Cpu, ShieldAlert, Sparkles, Send } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import { useApp } from "../context/AppContext";
import { useVision } from "../hooks/useVision";
import VisionHazardPanel from "../components/vision/VisionHazardPanel";
import CorrelatedRiskPanel from "../components/vision/CorrelatedRiskPanel";
import PipelineHealthPanel from "../components/vision/PipelineHealthPanel";

export default function VisionEdge() {
  const { reading, prediction, demoMode } = useApp();
  const vision = useVision();

  return (
    <div className="space-y-5">
      <PageHeader
        title="JAL-RAKSHAK Edge — Vision Intelligence"
        description="Real-time road waterlogging and standing-water observations powered by PipeGen & TensorRT on edge GPU."
        actions={
          <>
            <span className="btn">
              <Camera size={14} className="text-cyan-400" /> CAM-001 (Adyar)
            </span>
            <span className="btn">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Vision Stream Active
            </span>
          </>
        }
      />

      {/* Multi-Source Correlated Risk Pillar */}
      <CorrelatedRiskPanel
        vision={vision}
        sensorReading={reading}
        prediction={prediction}
      />

      {/* Pipeline Health & Performance Metrics */}
      <PipelineHealthPanel vision={vision} />

      {/* Visual Hazard Observations List & Simulation */}
      <VisionHazardPanel vision={vision} />

      {/* Edge Architecture Banner */}
      <section className="panel p-5 text-xs text-slate-400">
        <div className="eyebrow flex items-center gap-1.5 text-cyan-400">
          <Sparkles size={13} /> PipeGen End-to-End Pipeline Path
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-4 font-mono text-[11px]">
          <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
            <span className="text-cyan-400 font-bold">1. Input:</span> RTSP / Video Stream (samples/road_waterlogging_sample.mp4)
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
            <span className="text-cyan-400 font-bold">2. PipeGen IR:</span> Pipeline graph compilation (PipeGen v0.5.1)
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
            <span className="text-cyan-400 font-bold">3. Engine:</span> TensorRT FP16 (GeForce RTX 4050 Laptop GPU)
          </div>
          <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
            <span className="text-cyan-400 font-bold">4. Transport:</span> EdgeAdapter -&gt; Backend HTTP 201 -&gt; Socket.IO
          </div>
        </div>
      </section>
    </div>
  );
}
