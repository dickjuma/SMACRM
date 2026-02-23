import { io } from "socket.io-client";

const BACKEND_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.pingTimer = null;
  }

  connect() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    if (this.socket?.connected) return this.socket;

    this.socket = io(BACKEND_BASE, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      auth: { token: `Bearer ${token}` }
    });

    this.socket.on("connect", () => {
      this.emitLocal("connectionStatus", { isConnected: true });
      this.startPresencePing();
    });

    this.socket.on("disconnect", () => {
      this.emitLocal("connectionStatus", { isConnected: false });
      this.stopPresencePing();
    });

    this.socket.on("presence:update", (data) => this.emitLocal("presence:update", data));
    this.socket.on("activity:new", (data) => this.emitLocal("activity:new", data));
    this.socket.on("emailStatusUpdate", (data) => this.emitLocal("emailStatusUpdate", data));
    this.socket.on("documentUpdate", (data) => this.emitLocal("documentUpdate", data));
    this.socket.on("clientUpdate", (data) => this.emitLocal("clientUpdate", data));

    return this.socket;
  }

  startPresencePing() {
    this.stopPresencePing();
    this.pingTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("presence:ping");
      }
    }, 30000);
  }

  stopPresencePing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  disconnect() {
    this.stopPresencePing();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).delete(callback);
  }

  emitLocal(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((cb) => {
      try {
        cb(payload);
      } catch (error) {
        console.error(`Socket listener error for ${event}:`, error);
      }
    });
  }

  getConnectionStatus() {
    return Boolean(this.socket?.connected);
  }
}

const socketService = new SocketService();

export { socketService };
export default socketService;

