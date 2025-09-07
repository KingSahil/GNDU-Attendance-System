import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `ATT_${timestamp}_${randomStr}`.toUpperCase();
}

export function isSessionExpired(expiryTime: string): boolean {
  return new Date() > new Date(expiryTime);
}

export function getSessionUrl(sessionId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/checkin/${sessionId}`;
  }
  return '';
}