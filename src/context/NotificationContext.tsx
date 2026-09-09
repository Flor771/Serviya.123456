import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const previousUnreadRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') return;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.setValueAtTime(1046.5, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
    } catch (err) {
      console.debug('Sonido de notificación no disponible:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      previousUnreadRef.current = null;
      return;
    }
    try {
      const data = await api.get<{ notifications: Notification[] }>('/notifications');
      const next = data.notifications || [];
      const nextUnread = next.filter(n => !n.read).length;
      if (previousUnreadRef.current !== null && nextUnread > previousUnreadRef.current) {
        playNotificationSound();
      }
      previousUnreadRef.current = nextUnread;
      setNotifications(next);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [user, playNotificationSound]);

  useEffect(() => {
    refreshNotifications();
    if (!user) return;
    const interval = window.setInterval(refreshNotifications, 5000);
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = audioContextRef.current || new AudioContextClass();
        audioContextRef.current = ctx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
      } catch {}
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, [refreshNotifications, user]);

  const markAllAsRead = async () => {
    await api.patch('/notifications/mark-read');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    previousUnreadRef.current = 0;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refreshNotifications, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};
