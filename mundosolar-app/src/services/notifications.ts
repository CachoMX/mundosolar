import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  // Note: Push notifications require a development build, not Expo Go
  // This function is kept for compatibility but won't work in Expo Go
  console.log('Push notifications require a development build');
  return null;
};

export const scheduleMaintenanceReminder = async (
  maintenanceId: string,
  systemName: string,
  date: Date
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔧 Mantenimiento Programado',
      body: `Tienes un mantenimiento programado para ${systemName}`,
      data: { maintenanceId, type: 'MAINTENANCE' },
      sound: true,
    },
    trigger: {
      date: new Date(date.getTime() - 24 * 60 * 60 * 1000), // 1 day before
    },
  });
};

export const schedulePaymentReminder = async (
  paymentId: string,
  amount: number,
  dueDate: Date
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💳 Pago Pendiente',
      body: `Tienes un pago de $${amount.toFixed(2)} con vencimiento próximo`,
      data: { paymentId, type: 'PAYMENT' },
      sound: true,
    },
    trigger: {
      date: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
    },
  });
};

export const sendLocalNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getBadgeCount = async () => {
  return await Notifications.getBadgeCountAsync();
};

export const setBadgeCount = async (count: number) => {
  await Notifications.setBadgeCountAsync(count);
};
