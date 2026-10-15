import { Link } from "react-router-dom";
import { Activity, CloudRain, Cpu, Gauge, MapPin, Thermometer, Waves, Zap, ArrowUpRight, BellRing } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useVision } from "../hooks/useVision";
import PageHeader from "../components/common/PageHeader";
import RiskGauge from "../components/common/RiskGauge";
import KpiCard from "../components/common/KpiCard";
import MetricChart from "../components/common/MetricChart";
import StatusBadge from "../components/common/StatusBadge";
import SimulationControl from "../components/common/SimulationControl";
import CorrelatedRiskPanel from "../components/vision/CorrelatedRiskPanel";
import { eventLabel } from "../utils/risk";
import { formatTime } from "../utils/formatters";
import OpsMap from "../components/map/OpsMap";

export default function Dashboard() {
  const { reading, prediction, history, events, alerts, devices, demoMode } = useApp();
  const vision = useVision();
  const active = events.find(e => e.status === "ACTIVE") || events[0];
  return <div>
    <PageHeader title="Water-Risk Command Center" description="The judge should understand the operational situation in seconds." actions={<><span className="btn"><Activity size={15}/> {demoMode ? "DEMO MODE" : "LIVE"}</span><span className="btn"><span className="h-2 w-2 rounded-full bg-emerald-400"/> System Online</span></>} />
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <section className="panel p-5 lg:p-6"><div className="flex flex-col gap-6 md:flex-row md:items-center"><div className="flex flex-1 items-center gap-7"><RiskGauge score={prediction.riskScore}/><div><div className="eyebrow">Current Water Risk</div><h2 className="mt-2 text-2xl font-semibold text-white">{prediction.status}</h2><p className="mt-2 max-w-md text-sm text-slate-400">Risk is elevated because current water behavior is moving beyond the historical operating baseline.</p></div></div><div className="w-full border-l-0 border-slate-800 md:w-72 md:border-l md:pl-6"><div className="eyebrow">Why?</div><div className="mt-3 space-y-3 text-sm"><Reason text="Rapid water-level rise" positive/><Reason text="Heavy rainfall" positive/><Reason text="Above historical baseline" positive/><Reason text="Rise rate above historical behavior" positive/></div></div></div></section>
      <section className="panel p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Active Event</div><div className="mt-1 text-lg font-semibold text-white">{eventLabel(active.event)}</div></div><StatusBadge status={prediction.status}/></div><div className="mt-5 grid grid-cols-2 gap-4"><Info label="Device" value={active.deviceId}/><Info label="Confidence" value={`${prediction.confidence}%`}/><Info label="Detected" value={formatTime(active.timestamp)}/><Info label="Location" value="Monitoring Point A"/></div><Link to={`/events/${active.eventId}`} className="btn btn-primary mt-5 w-full">View Event <ArrowUpRight size={15}/></Link></section>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <KpiCard label="Water Level" value={reading.waterLevel} unit="cm" icon={Waves} trend="Current depth"/>
      <KpiCard label="Rise Rate" value={reading.riseRate} unit="cm/min" icon={Zap} trend="Behavior velocity"/>
      <KpiCard label="Rainfall" value={reading.rainfall} unit="mm" icon={CloudRain} trend="Current context"/>
      <KpiCard label="Temperature" value={reading.temperature} unit="°C" icon={Thermometer}/>
      <KpiCard label="Acceleration" value={reading.acceleration} icon={Gauge} trend="Change in rise rate"/>
      <KpiCard label="Water Trend" value={reading.waterTrend.replaceAll("_"," ")} icon={Activity}/>
      <KpiCard label="Sensor Quality" value={reading.sensorQuality} unit="%" icon={Cpu} tone={reading.sensorQuality < 50 ? "red" : "cyan"}/>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
      <section className="panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow">Water Behavior</div><div className="mt-1 font-semibold text-slate-100">Current vs historical movement</div></div><div className="text-xs text-slate-500">24-hour view</div></div><div className="mt-4"><MetricChart data={history} metrics={["waterLevel","riseRate","risk","rainfall"]}/></div></section>
      <section className="panel p-5"><div className="eyebrow">Current vs Historical Behavior</div><div className="mt-2 text-sm font-semibold text-white">Water Level</div><div className="mt-6 space-y-5"><CompareBar label="Current" value={reading.waterLevel} max={120}/><CompareBar label="Historical Average" value={70} max={120}/><CompareBar label="Historical Maximum" value={90} max={120}/></div><div className="mt-6 border-t border-slate-800 pt-4"><div className="eyebrow">Deviation</div><div className="mt-1 text-2xl font-semibold text-orange-300">+{Math.max(0, reading.waterLevel - 70)} cm</div></div></section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-800 p-5"><div><div className="eyebrow">Live Map</div><div className="mt-1 font-semibold text-white">Operational monitoring points</div></div><Link className="text-xs text-cyan-300" to="/map">Open full map →</Link></div><OpsMap devices={devices} height={340}/></section>
      <section className="panel p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Response Action</div><div className="mt-1 font-semibold text-white">Incident handling status</div></div><BellRing size={17} className="text-cyan-300"/></div><div className="mt-5 space-y-3"><Action text="GSM Alert Sent"/><Action text="Local Alarm Activated"/><Action text="GPS Location Recorded"/><Action text="Event Stored"/></div><div className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-500">Device <span className="text-slate-300">{reading.deviceId}</span> · Last update <span className="text-slate-300">10 sec ago</span></div></section>
    </div>
    <div className="mt-5">
      <CorrelatedRiskPanel vision={vision} sensorReading={reading} prediction={prediction}/>
    </div>

    <div className="mt-5"><SimulationControl/></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><RecentEvents events={events}/><RecentAlerts alerts={alerts}/></div>
  </div>;
}
function Reason({text}){return <div className="flex gap-2 text-slate-300"><span className="text-orange-300">↑</span>{text}</div>}
function Info({label,value}){return <div><div className="eyebrow">{label}</div><div className="mt-1 text-sm text-slate-200">{value}</div></div>}
function CompareBar({label,value,max}){return <div><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-semibold text-slate-200">{value} cm</span></div><div className="h-2 bg-slate-800"><div className="h-full bg-cyan-400 transition-all" style={{width:`${Math.min(100,value/max*100)}%`}}/></div></div>}
function Action({text}){return <div className="flex items-center gap-3 border border-emerald-500/10 bg-emerald-400/5 p-3 text-sm text-slate-300"><span className="text-emerald-300">✓</span>{text}</div>}
function RecentEvents({events}){return <section className="panel p-5"><div className="eyebrow">Recent Events</div><div className="mt-4 space-y-2">{events.slice(0,4).map(e=><Link key={e.eventId} to={`/events/${e.eventId}`} className="flex items-center justify-between border border-slate-800 p-3 hover:bg-slate-900"><div><div className="text-sm font-semibold text-slate-200">{eventLabel(e.event)}</div><div className="mt-1 text-xs text-slate-500">{e.deviceId} · {formatTime(e.timestamp)}</div></div><StatusBadge status={e.riskScore>=76?"CRITICAL":e.riskScore>=51?"WARNING":e.riskScore>=26?"WATCH":"SAFE"}/></Link>)}</div></section>}
function RecentAlerts({alerts}){return <section className="panel p-5"><div className="eyebrow">Recent Alerts</div><div className="mt-4 space-y-2">{alerts.slice(0,4).map(a=><div key={a.alertId} className="flex items-center justify-between border border-slate-800 p-3"><div><div className="text-sm text-slate-200">{a.message}</div><div className="mt-1 text-xs text-slate-500">{a.deviceId} · {a.delivery}</div></div><span className="text-[10px] font-bold uppercase text-emerald-300">{a.status}</span></div>)}</div></section>}
