import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { Colors } from '../constants/colors';
import { ActivityIndicator, View } from 'react-native';

// Import screens (will be created next)
import { ClientDashboard } from '../screens/client/DashboardScreen';
import { ClientSystemsScreen } from '../screens/client/SystemsScreen';
import { ClientMaintenanceScreen } from '../screens/client/MaintenanceScreen';
import { ClientPaymentsScreen } from '../screens/client/PaymentsScreen';
import { ClientProfileScreen } from '../screens/client/ProfileScreen';

import { TechnicianDashboard } from '../screens/technician/DashboardScreen';
import { TechnicianMaintenanceScreen } from '../screens/technician/MaintenanceScreen';
import { TechnicianScheduleScreen } from '../screens/technician/ScheduleScreen';
import { TechnicianProfileScreen } from '../screens/technician/ProfileScreen';

import { AdminDashboard } from '../screens/admin/DashboardScreen';
import { AdminClientsScreen } from '../screens/admin/ClientsScreen';
import { AdminSystemsScreen } from '../screens/admin/SystemsScreen';
import { AdminMaintenanceScreen } from '../screens/admin/MaintenanceScreen';
import { AdminReportsScreen } from '../screens/admin/ReportsScreen';
import { AdminProfileScreen } from '../screens/admin/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Client Tab Navigator
const ClientTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ClientDashboard}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <View>🏠</View>,
        }}
      />
      <Tab.Screen
        name="Systems"
        component={ClientSystemsScreen}
        options={{
          title: 'Sistemas',
          tabBarIcon: ({ color }) => <View>☀️</View>,
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={ClientMaintenanceScreen}
        options={{
          title: 'Mantenimiento',
          tabBarIcon: ({ color }) => <View>🔧</View>,
        }}
      />
      <Tab.Screen
        name="Payments"
        component={ClientPaymentsScreen}
        options={{
          title: 'Pagos',
          tabBarIcon: ({ color }) => <View>💳</View>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ClientProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <View>👤</View>,
        }}
      />
    </Tab.Navigator>
  );
};

// Technician Tab Navigator
const TechnicianTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={TechnicianDashboard}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <View>🏠</View>,
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={TechnicianScheduleScreen}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }) => <View>📅</View>,
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={TechnicianMaintenanceScreen}
        options={{
          title: 'Tareas',
          tabBarIcon: ({ color }) => <View>🔧</View>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={TechnicianProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <View>👤</View>,
        }}
      />
    </Tab.Navigator>
  );
};

// Admin/Manager Tab Navigator
const AdminTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <View>📊</View>,
        }}
      />
      <Tab.Screen
        name="Clients"
        component={AdminClientsScreen}
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color }) => <View>👥</View>,
        }}
      />
      <Tab.Screen
        name="Systems"
        component={AdminSystemsScreen}
        options={{
          title: 'Sistemas',
          tabBarIcon: ({ color }) => <View>☀️</View>,
        }}
      />
      <Tab.Screen
        name="Maintenance"
        component={AdminMaintenanceScreen}
        options={{
          title: 'Mantenimiento',
          tabBarIcon: ({ color }) => <View>🔧</View>,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={AdminReportsScreen}
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => <View>📈</View>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AdminProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <View>👤</View>,
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
export const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {user.role === 'CLIENT' && (
              <Stack.Screen name="ClientApp" component={ClientTabs} />
            )}
            {user.role === 'TECHNICIAN' && (
              <Stack.Screen name="TechnicianApp" component={TechnicianTabs} />
            )}
            {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
              <Stack.Screen name="AdminApp" component={AdminTabs} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
