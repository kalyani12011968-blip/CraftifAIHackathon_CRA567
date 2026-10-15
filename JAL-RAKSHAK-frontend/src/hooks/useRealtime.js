import { useEffect, useState } from "react";
import { connectSocket, disconnectSocket } from "../services/socket";

export function useRealtime(onMessage) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const socket = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const events = [
      "sensor:update",
      "risk:update",
      "event:new",
      "alert:new",
      "device:update",
      "vision:event",
      "vision:status",
      "vision:correlation"
    ];
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    events.forEach(event => socket.on(event, data => onMessage?.(event, data)));
    setConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      events.forEach(event => socket.off(event));
      disconnectSocket();
    };
  }, [onMessage]);
  return connected;
}
