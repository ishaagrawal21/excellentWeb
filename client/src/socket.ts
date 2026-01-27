import { io, type Socket } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function createSocket(token: string): Socket {
  return io(socketUrl, {
    auth: {
      token,
    },
  });
}

