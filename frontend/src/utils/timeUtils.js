// Bangladesh Standard Time = UTC+6

export function getBangladeshTime() {
  const now = new Date();
  const bdOffset = 6 * 60; // minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + bdOffset * 60000);
}

export function getBDHour() {
  return getBangladeshTime().getHours();
}

export function getServiceStatus() {
  const bdTime = getBangladeshTime();
  const hour = bdTime.getHours();
  const minute = bdTime.getMinutes();

  // Night service: 19:00 - 05:00
  if (hour >= 19 || hour < 5) {
    return { status: 'open', label: 'Night Service Active', color: '#16a34a' };
  }
  // Pre-boarding: 17:00 - 19:00
  if (hour >= 17 && hour < 19) {
    return { status: 'boarding', label: 'Pre-Boarding', color: '#ca8a04' };
  }
  // Day - closed
  return { status: 'closed', label: 'Off Duty', color: '#dc2626' };
}

export function getCountdownToOpen() {
  const bdTime = getBangladeshTime();
  const hour = bdTime.getHours();
  const minute = bdTime.getMinutes();
  const second = bdTime.getSeconds();

  let targetHour = 19;
  // If already past 19 or before 5, service is open
  if (hour >= 19 || hour < 5) return null;

  const totalSecondsNow = hour * 3600 + minute * 60 + second;
  const totalSecondsTarget = targetHour * 3600;
  const diff = totalSecondsTarget - totalSecondsNow;

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  return { hours: h, minutes: m, seconds: s, total: diff };
}

export function formatBDTime(date) {
  const bdTime = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return bdTime.toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
}

export function formatBDDateTime(dateStr) {
  const date = new Date(dateStr);
  const bdTime = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return bdTime.toLocaleString('en-BD', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
  });
}

export function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-BD');
}
