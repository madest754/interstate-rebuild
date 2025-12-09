import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function parsePhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  // Add country code if missing
  if (cleaned.length === 10) {
    return `1${cleaned}`;
  }
  return cleaned;
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDateTime(d);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function generateCallBroadcast(call: any, members: any[]): string {
  const lines: string[] = [];
  
  // Call number
  lines.push(`📞 CALL #${call.callNumber}${call.urgent ? ' ⚠️ URGENT' : ''}`);
  
  // Nature
  if (call.nature) {
    lines.push(`Nature: ${call.nature}`);
  }
  
  // Location
  if (call.highwayId || call.customHighway) {
    const location = [];
    location.push(call.customHighway || call.highwayName || 'Highway');
    if (call.direction) location.push(call.direction);
    if (call.localExpress) location.push(call.localExpress);
    if (call.betweenExit) location.push(`Exit ${call.betweenExit}`);
    if (call.andExit) location.push(`- ${call.andExit}`);
    if (call.mileMarker) location.push(`MM ${call.mileMarker}`);
    lines.push(`📍 ${location.join(' ')}`);
  } else if (call.address) {
    lines.push(`📍 ${call.address}${call.city ? `, ${call.city}` : ''}${call.state ? `, ${call.state}` : ''}`);
  } else if (call.freeTextLocation) {
    lines.push(`📍 ${call.freeTextLocation}`);
  }
  
  // Vehicle
  if (call.carMakeName || call.carModelName || call.carColor || call.customVehicle) {
    if (call.customVehicle) {
      lines.push(`🚗 ${call.customVehicle}`);
    } else {
      const vehicle = [call.carColor, call.carMakeName, call.carModelName].filter(Boolean).join(' ');
      if (vehicle) lines.push(`🚗 ${vehicle}`);
    }
  }
  
  // Map link
  if (call.mapLink) {
    lines.push(`🗺️ ${call.mapLink}`);
  }
  
  // Caller info
  if (call.callerName || call.phone1) {
    const caller = [call.callerName, call.phone1 && formatPhoneNumber(call.phone1)].filter(Boolean).join(' - ');
    lines.push(`👤 ${caller}`);
  }
  
  // Message
  if (call.dispatcherMessage) {
    lines.push('');
    lines.push(`💬 ${call.dispatcherMessage}`);
  }
  
  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate phone number (US)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a random ID
 */
export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}_${random}` : random;
}

/**
 * Parse coordinates from various formats
 */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  // Try "lat, lng" format
  const commaMatch = input.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (commaMatch) {
    const lat = parseFloat(commaMatch[1]);
    const lng = parseFloat(commaMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng };
    }
  }
  
  // Try Google Maps URL
  const gmapsMatch = input.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (gmapsMatch) {
    const lat = parseFloat(gmapsMatch[1]);
    const lng = parseFloat(gmapsMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng };
    }
  }
  
  // Try "q=lat,lng" format
  const qMatch = input.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) {
      return { lat, lng };
    }
  }
  
  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Build Google Maps URL from coordinates
 */
export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Build Google Maps directions URL
 */
export function buildDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Check if we're on a mobile device
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if browser supports notifications
 */
export function supportsNotifications(): boolean {
  return 'Notification' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications()) return false;
  
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Show browser notification
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (!supportsNotifications() || Notification.permission !== 'granted') return;
  
  new Notification(title, {
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    ...options,
  });
}

/**
 * Play notification sound
 */
export function playNotificationSound(): void {
  const audio = new Audio('/notification.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Ignore autoplay errors
  });
}

/**
 * Storage helpers with error handling
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};
