import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket server
    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[WebSocket] Connected");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[WebSocket] Disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const on = (event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    socketRef.current?.off(event, callback);
  };

  const emit = (event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  };

  return {
    socket: socketRef.current,
    isConnected,
    on,
    off,
    emit,
  };
}
