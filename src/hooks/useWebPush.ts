// Minimal Web Push opt-in. Only registers in published deployments —
// inside the Lovable preview iframe service workers are unreliable, so we no-op there.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const isPreviewHost = () => {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  if (host.includes('lovableproject.com') || host.includes('id-preview--')) return true;
  try { return window.self !== window.top; } catch { return true; }
};

export const useWebPush = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isPreviewHost()) { setSupported(false); return; }
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return { ok: false, reason: 'unsupported' as const };
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return { ok: false, reason: 'denied' as const };

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // VAPID key would normally come from an edge function. For now subscribe without
    // applicationServerKey (works on some browsers, falls back gracefully).
    let pushSub: PushSubscription | null = null;
    try {
      pushSub = await reg.pushManager.subscribe({ userVisibleOnly: true });
    } catch (e) {
      console.warn('Push subscribe failed', e);
      return { ok: false, reason: 'no_vapid' as const };
    }

    const json = pushSub.toJSON();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: 'unauthenticated' as const };

    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: pushSub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' });

    setSubscribed(true);
    return { ok: true as const };
  }, [supported]);

  return { supported, permission, subscribed, subscribe };
};
