import { io, type Socket } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function createSocket(): Socket {
  return io(socketUrl);
}


