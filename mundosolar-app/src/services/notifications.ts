import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { pushAPI } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('No se pudo obtener el token de notificaciones push!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    // Subscribe to push notifications on backend
    try {
      await pushAPI.subscribe({ token, platform: Platform.OS });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  } else {
    alert('Debes usar un dispositivo físico para push notifications');
  }

  return token;
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
