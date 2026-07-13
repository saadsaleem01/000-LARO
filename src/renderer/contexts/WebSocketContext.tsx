import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

// Buffer high-frequency event toasts so a burst (e.g. 50 evidence files added
// in a few seconds by auto-collection) collapses into a single summary toast
// instead of flooding the corner and hiding any error toast under the stack.
const TOAST_BURST_WINDOW_MS = 1500;

function useBurstToaster() {
  const buffers = useRef<Record<string, { count: number; lastDetail?: string; timer: ReturnType<typeof setTimeout> | null }>>({});

  const flush = (key: string, render: (count: number, lastDetail?: string) => void) => {
    const buf = buffers.current[key];
    if (!buf || buf.count === 0) return;
    render(buf.count, buf.lastDetail);
    buf.count = 0;
    buf.lastDetail = undefined;
    buf.timer = null;
  };

  const push = (
    key: string,
    detail: string | undefined,
    render: (count: number, lastDetail?: string) => void
  ) => {
    const existing = buffers.current[key];
    if (existing) {
      existing.count += 1;
      existing.lastDetail = detail;
      if (existing.timer) clearTimeout(existing.timer);
      existing.timer = setTimeout(() => flush(key, render), TOAST_BURST_WINDOW_MS);
      return;
    }
    buffers.current[key] = {
      count: 1,
      lastDetail: detail,
      timer: setTimeout(() => flush(key, render), TOAST_BURST_WINDOW_MS),
    };
  };

  return { push };
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const { push } = useBurstToaster();

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket server
    const socketInstance = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);

      // Join user-specific room
      socketInstance.emit("join", user.id);
    });

    socketInstance.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    });

    // Listen for real-time events. All high-frequency events go through the
    // burst toaster — only one toast per ~1.5s window, regardless of how many
    // events arrived. Error toasts elsewhere stay visible because they're not
    // drowned under a flood of info toasts.
    socketInstance.on("new_message", (message) => {
      console.log("[WebSocket] New message received:", message);
      push("new_message", message.subject, (count, lastDetail) => {
        toast.info(count === 1 ? "New message received" : `${count} new messages received`, {
          description: count === 1 ? lastDetail || "You have a new message" : undefined,
        });
      });
    });

    socketInstance.on("case_update", (caseUpdate) => {
      console.log("[WebSocket] Case update received:", caseUpdate);
      push("case_update", caseUpdate.caseId, (count, lastDetail) => {
        toast.info(count === 1 ? "Case updated" : `${count} cases updated`, {
          description: count === 1 && lastDetail ? `Case ${lastDetail} has been updated` : undefined,
        });
      });
    });

    socketInstance.on("evidence_update", (evidenceUpdate) => {
      console.log("[WebSocket] Evidence update received:", evidenceUpdate);
      push("evidence_update", evidenceUpdate.caseId, (count, lastDetail) => {
        toast.success(
          count === 1 ? "New evidence added" : `${count} new evidence items added`,
          {
            description: count === 1 && lastDetail ? `Added to case ${lastDetail}` : undefined,
          }
        );
      });
    });

    socketInstance.on("notification", (notification) => {
      console.log("[WebSocket] Notification received:", notification);
      // Generic notifications keep per-event behavior so distinct titles stay
      // distinct — they're not the spam source.
      toast(notification.title, {
        description: notification.message,
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, push]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

