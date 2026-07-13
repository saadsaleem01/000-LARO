/**
 * Date Formatting Utilities
 * 
 * Consistent date/time formatting across the application.
 */

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Format date to short string (MM/DD/YYYY)
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format time only
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? "hour" : "hours"} ago`;
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
  if (diffWeek < 4) return `${diffWeek} ${diffWeek === 1 ? "week" : "weeks"} ago`;
  if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? "month" : "months"} ago`;
  return `${diffYear} ${diffYear === 1 ? "year" : "years"} ago`;
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is this week
 */
export function isThisWeek(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays < 7;
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add months to date
 */
export function addMonths(date: Date | string, months: number): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Get date range label
 */
export function getDateRangeLabel(start: Date | string, end: Date | string): string {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "-";
  
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  
  if (sameMonth) {
    return `${formatDate(startDate)} - ${endDate.getDate()}`;
  } else if (sameYear) {
    return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(startDate)} - ${formatDate(endDate)}`;
  } else {
    return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
  }
}

/**
 * Parse ISO date string to Date
 */
export function parseISODate(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Get business days between two dates (excluding weekends)
 */
export function getBusinessDays(start: Date | string, end: Date | string): number {
  const startDate = typeof start === "string" ? new Date(start) : new Date(start);
  const endDate = typeof end === "string" ? new Date(end) : new Date(end);
  
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

