import { Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import AppShell from "./components/layout/AppShell";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import RiskPrediction from "./pages/RiskPrediction";
import Devices from "./pages/Devices";
import DeviceDetails from "./pages/DeviceDetails";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Alerts from "./pages/Alerts";
import Weather from "./pages/Weather";
import Analytics from "./pages/Analytics";
import AIAssistant from "./pages/AIAssistant";
import MapPage from "./pages/Map";
import Settings from "./pages/Settings";
import VisionEdge from "./pages/VisionEdge";

export default function App(){
 return <AppProvider><Routes>
   <Route path="/" element={<Landing/>}/>
   <Route element={<AppShell/>}>
    <Route path="/dashboard" element={<Dashboard/>}/>
    <Route path="/vision-edge" element={<VisionEdge/>}/>
    <Route path="/monitoring" element={<Monitoring/>}/>
    <Route path="/risk" element={<RiskPrediction/>}/>
    <Route path="/devices" element={<Devices/>}/>
    <Route path="/devices/:deviceId" element={<DeviceDetails/>}/>
    <Route path="/events" element={<Events/>}/>
    <Route path="/events/:eventId" element={<EventDetails/>}/>
    <Route path="/alerts" element={<Alerts/>}/>
    <Route path="/weather" element={<Weather/>}/>
    <Route path="/analytics" element={<Analytics/>}/>
    <Route path="/ai-assistant" element={<AIAssistant/>}/>
    <Route path="/map" element={<MapPage/>}/>
    <Route path="/settings" element={<Settings/>}/>
   </Route>
   <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
 </Routes></AppProvider>;
}
