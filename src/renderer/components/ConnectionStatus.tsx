import { useWebSocket } from "@/contexts/WebSocketContext";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isConnected ? "outline" : "destructive"}
          className="cursor-pointer"
        >
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Disconnected</span>
            </>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {isConnected
            ? "Real-time updates active"
            : "Real-time updates unavailable"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

