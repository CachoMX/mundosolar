import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_data');
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Solar Systems API
export const systemsAPI = {
  getAll: async () => {
    const response = await api.get('/api/solar-systems');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/solar-systems/${id}`);
    return response.data;
  },

  getProduction: async (id: string, startDate: Date, endDate: Date) => {
    const response = await api.get(`/api/solar-systems/${id}/production`, {
      params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });
    return response.data;
  },
};

// Maintenance API
export const maintenanceAPI = {
  getAll: async (filters?: any) => {
    const response = await api.get('/api/maintenance', { params: filters });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/maintenance/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.patch(`/api/maintenance/${id}/status`, { status, notes });
    return response.data;
  },

  addNote: async (id: string, note: string) => {
    const response = await api.post(`/api/maintenance/${id}/notes`, { note });
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  getAll: async () => {
    const response = await api.get('/api/payments');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/payments/${id}`);
    return response.data;
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async () => {
    const response = await api.get('/api/invoices');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/invoices/${id}`);
    return response.data;
  },

  downloadPDF: async (id: string) => {
    const response = await api.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    const response = await api.get('/api/notifications');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch(`/api/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/api/notifications/read-all');
    return response.data;
  },
};

// Push Notifications API
export const pushAPI = {
  subscribe: async (subscription: any) => {
    const response = await api.post('/api/push/subscribe', subscription);
    return response.data;
  },

  unsubscribe: async () => {
    const response = await api.post('/api/push/unsubscribe');
    return response.data;
  },
};
