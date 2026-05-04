/**
 * Push notifications — registers an Expo push token for the current user.
 *
 * Why Expo push (not FCM/APNs directly): the Expo push service is free,
 * works on iOS/Android with one API, and ships with `expo-notifications`.
 * Production scale: Expo handles batching + retries. Free tier: unlimited.
 */
import type * as NotificationsTypes from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// A static `import` triggers expo-notifications' DevicePushTokenAutoRegistration
// side-effect at module load, which throws in Expo Go. Conditional require means
// the module (and its side effects) never loads in Expo Go.
const Notifications: typeof NotificationsTypes | null = isExpoGo
  ? null
  : require('expo-notifications');

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldPlaySound:  false,
        shouldSetBadge:   true,
      }),
    });
  } catch (e) {
    console.warn('[notifications] setNotificationHandler failed:', e);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Notifications || isExpoGo || !Device.isDevice) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const r = await Notifications.requestPermissionsAsync();
      final = r.status;
    }
    if (final !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenObj.data;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        device_push_token: token,
      } as any).eq('id', user.id);
    }

    return token;
  } catch (e) {
    console.warn('[notifications] registration failed:', e);
    return null;
  }
}

export function addNotificationListener(
  handler: (n: NotificationsTypes.Notification) => void,
) {
  return Notifications?.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (r: NotificationsTypes.NotificationResponse) => void,
) {
  return Notifications?.addNotificationResponseReceivedListener(handler);
}
