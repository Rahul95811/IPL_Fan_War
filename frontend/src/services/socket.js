import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace("/api", "");

const socket = io(socketUrl, {
  autoConnect: false,
  transports: ["websocket"],
});


export default socket;
