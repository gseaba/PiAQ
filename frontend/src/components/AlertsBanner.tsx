import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { DeviceAlert } from '../types';
import { getDeviceAlerts } from '../services/airQualityService';

type AlertsBannerProps = {
  deviceId: string;
};

const DISMISSED_KEY_PREFIX = 'piaq:dismissedAlerts:v1:';

const readDismissed = (deviceId: string): Set<string> => {
  try {
    const raw = sessionStorage.getItem(`${DISMISSED_KEY_PREFIX}${deviceId}`);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
};

const writeDismissed = (deviceId: string, ids: Set<string>) => {
  try {
    sessionStorage.setItem(`${DISMISSED_KEY_PREFIX}${deviceId}`, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
};

export const AlertsBanner: React.FC<AlertsBannerProps> = ({ deviceId }) => {
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed(deviceId));

  const mountedRef = useRef(true);
  const dismissedRef = useRef(dismissed);

  useEffect(() => {
    dismissedRef.current = dismissed;
  }, [dismissed]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const visibleAlerts = useMemo(() => {
    const d = dismissed;
    return alerts.filter((a) => !d.has(String(a.id)));
  }, [alerts, dismissed]);

  const topAlert = visibleAlerts[0];

  const refresh = async (opts?: { forceRefresh?: boolean }) => {
    try {
      const next = await getDeviceAlerts(deviceId, { status: 'active', ...opts });
      if (!mountedRef.current) return;
      setAlerts(next);
    } catch {
      // If backend is down, don't spam console from a polling loop.
    }
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [deviceId]);

  if (!topAlert) return null;

  const dismiss = () => {
    const next = new Set<string>(dismissedRef.current);
    next.add(String(topAlert.id));
    setDismissed(next);
    writeDismissed(deviceId, next);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={String(topAlert.id)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mx-8 mt-4"
      >
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 backdrop-blur-md">
          <div className="flex gap-3">
            <div className="mt-0.5">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-rose-300/80">
                Active alert • {topAlert.metricName}
              </div>
              <div className="text-sm font-medium text-rose-100">{topAlert.message}</div>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20"
            aria-label="Dismiss alert"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
