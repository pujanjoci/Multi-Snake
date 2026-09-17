'use client';

import React, { useEffect, useState } from 'react';
import { SessionNotification } from '../lib/types';
import { AlertCircle, Flame, Hourglass, Bell, X } from 'lucide-react';

interface NotificationOverlayProps {
  notification: SessionNotification | null;
  timeRemaining: number;
  onDismiss?: () => void;
}

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  notification,
  timeRemaining,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [permissionBannerDismissed, setPermissionBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestBrowserNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification('Snake Arena Alerts Enabled!', {
          body: 'You will receive desktop warnings when session rounds are ending.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const handleDismissAlert = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  useEffect(() => {
    if (notification) {
      setVisible(true);

      // Trigger desktop notification if permitted and tab is blurred
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }

      const timer = setTimeout(() => {
        setVisible(false);
      }, notification.durationMs || 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Special 10-second countdown big pulse
  const isFinalTenSeconds = timeRemaining > 0 && timeRemaining <= 10;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-start pt-6 px-4">
      {/* Browser Notification Permission Banner (if in lobby / early session) */}
      {notificationPermission === 'default' && !permissionBannerDismissed && (
        <div className="pointer-events-auto mb-4 flex items-center gap-3 rounded-full bg-slate-900/95 border border-emerald-500/30 px-4 py-2 text-xs font-medium text-slate-300 shadow-xl backdrop-blur-md transition hover:border-emerald-500/60 animate-in fade-in">
          <Bell className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
          <span>Enable desktop notifications for match end alerts?</span>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={requestBrowserNotification}
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
            >
              Allow
            </button>
            <button
              onClick={() => setPermissionBannerDismissed(true)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Dismiss prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Toast / Alert Announcement with Dismiss Button */}
      {visible && notification && (
        <div
          className={`pointer-events-auto flex max-w-md transform items-center gap-4 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'critical'
              ? 'border-red-500/50 bg-red-950/90 text-red-100 shadow-red-950/60'
              : notification.type === 'rush'
              ? 'border-amber-500/50 bg-amber-950/90 text-amber-100 shadow-amber-950/60'
              : notification.type === 'warning'
              ? 'border-indigo-500/50 bg-slate-900/95 text-indigo-100 shadow-slate-950/70'
              : 'border-slate-700 bg-slate-900/95 text-slate-100'
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              notification.type === 'critical'
                ? 'bg-red-500/20 text-red-400'
                : notification.type === 'rush'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-indigo-500/20 text-indigo-400'
            }`}
          >
            {notification.type === 'critical' ? (
              <AlertCircle className="h-6 w-6 animate-bounce" />
            ) : notification.type === 'rush' ? (
              <Flame className="h-6 w-6 animate-pulse" />
            ) : (
              <Hourglass className="h-6 w-6 animate-spin" />
            )}
          </div>

          <div className="flex-1 pr-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              {notification.title}
            </h4>
            <p className="mt-0.5 text-xs text-slate-300 font-medium leading-relaxed">
              {notification.message}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismissAlert}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition active:scale-95"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Big Center Countdown Pulse for Final 10 Seconds */}
      {isFinalTenSeconds && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center">
            <span className="text-8xl font-black tracking-tighter text-amber-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-ping">
              {timeRemaining}
            </span>
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-amber-200 mt-2 bg-slate-950/80 px-4 py-1 rounded-full border border-amber-500/40">
              Final Countdown
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
