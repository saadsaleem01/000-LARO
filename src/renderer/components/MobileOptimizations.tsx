import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Briefcase,
  Users,
  Bell,
  Menu,
  Archive,
  CheckCircle,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { MessageSquare } from "lucide-react";

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  unreadNotifications?: number;
}

export function MobileBottomNav({ currentPage, onNavigate, unreadNotifications = 0 }: MobileBottomNavProps) {
  // Fetch unread message count
  const { data: unreadMessages = 0 } = trpc.messages.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "cases", label: "Cases", icon: Briefcase },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadMessages },
    { id: "notifications", label: "Alerts", icon: Bell, badge: unreadNotifications },
    { id: "menu", label: "More", icon: Menu },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 px-1.5 py-0 text-xs min-w-[18px] h-[18px] flex items-center justify-center"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { label: string; icon: React.ReactNode; color: string };
  rightAction?: { label: string; icon: React.ReactNode; color: string };
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = { label: "Archive", icon: <Archive className="w-5 h-5" />, color: "bg-blue-500" },
  rightAction = { label: "Complete", icon: <CheckCircle className="w-5 h-5" />, color: "bg-green-500" },
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const threshold = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setOffset(diff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (offset > threshold && onSwipeRight) {
      onSwipeRight();
      toast.success(rightAction.label);
    } else if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft();
      toast.success(leftAction.label);
    }

    setOffset(0);
  };

  const showLeftAction = offset > 20;
  const showRightAction = offset < -20;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left Action */}
      {showLeftAction && (
        <div className={`absolute inset-y-0 left-0 ${rightAction.color} flex items-center px-6 text-white`}>
          {rightAction.icon}
          <span className="ml-2 font-medium">{rightAction.label}</span>
        </div>
      )}

      {/* Right Action */}
      {showRightAction && (
        <div className={`absolute inset-y-0 right-0 ${leftAction.color} flex items-center px-6 text-white`}>
          <span className="mr-2 font-medium">{leftAction.label}</span>
          {leftAction.icon}
        </div>
      )}

      {/* Card Content */}
      <div
        className="relative bg-background transition-transform"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export function OfflineModeIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You're offline. Some features may be limited.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 z-50">
      <div className="flex items-center justify-center gap-2 text-sm">
        <WifiOff className="w-4 h-4" />
        <span>Offline Mode - Viewing cached data</span>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline";
}

export function QuickActionButton({ label, icon, onClick, variant = "default" }: QuickActionButtonProps) {
  return (
    <Button
      variant={variant}
      size="lg"
      className="w-full justify-start gap-3 h-auto py-4"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center">
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </Button>
  );
}

interface NotificationQuickActionProps {
  notification: {
    id: string;
    title: string;
    message: string;
    caseId?: string;
    actionUrl?: string;
  };
  onDismiss: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

export function NotificationQuickAction({ notification, onDismiss, onAction }: NotificationQuickActionProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h4 className="font-medium mb-1">{notification.title}</h4>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          {notification.caseId && (
            <Badge variant="outline" className="mt-2 text-xs">
              {notification.caseId}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onDismiss(notification.id)}
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onAction(notification.id, "view")}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}

// Hook for detecting mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

// Hook for swipe gestures
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    touchStart.current = null;
  };

  return { onTouchStart, onTouchEnd };
}

