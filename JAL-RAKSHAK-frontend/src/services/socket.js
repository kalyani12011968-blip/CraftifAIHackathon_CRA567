import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

let socket;

export function getSocket() {
  if (!socket) {
    const socketUrl = API_BASE_URL.replace(/\/api$/, "");
    socket = io(socketUrl, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
