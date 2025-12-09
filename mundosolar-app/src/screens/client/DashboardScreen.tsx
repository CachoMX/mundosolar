import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { systemsAPI, maintenanceAPI, paymentsAPI } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../constants/colors';
import { SolarSystem, Maintenance, Payment } from '../../types';

const { width } = Dimensions.get('window');

export const ClientDashboard = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<Maintenance[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [totalProduction, setTotalProduction] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [systemsRes, maintenanceRes, paymentsRes] = await Promise.all([
        systemsAPI.getAll(),
        maintenanceAPI.getAll({ status: 'SCHEDULED' }),
        paymentsAPI.getAll(),
      ]);

      if (systemsRes.success) {
        setSystems(systemsRes.data);
        const total = systemsRes.data.reduce(
          (sum: number, s: SolarSystem) => sum + (s.totalProduction || 0),
          0
        );
        setTotalProduction(total);
      }

      if (maintenanceRes.success) {
        setUpcomingMaintenance(maintenanceRes.data.slice(0, 3));
      }

      if (paymentsRes.success) {
        const pending = paymentsRes.data.filter(
          (p: Payment) => p.status === 'PENDING' || p.status === 'OVERDUE'
        );
        setPendingPayments(pending.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={styles.statEmoji}>☀️</Text>
          </View>
          <Text style={styles.statValue}>{systems.length}</Text>
          <Text style={styles.statLabel}>Sistemas Activos</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.success + '20' }]}>
            <Text style={styles.statEmoji}>⚡</Text>
          </View>
          <Text style={styles.statValue}>{totalProduction.toFixed(1)} kWh</Text>
          <Text style={styles.statLabel}>Producción Total</Text>
        </View>
      </View>

      {/* Upcoming Maintenance */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos Mantenimientos</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {upcomingMaintenance.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay mantenimientos programados</Text>
          </View>
        ) : (
          upcomingMaintenance.map((maintenance, index) => (
            <TouchableOpacity key={maintenance.id} style={styles.maintenanceCard}>
              <View style={styles.maintenanceLeft}>
                <View
                  style={[
                    styles.maintenanceDot,
                    { backgroundColor: getPriorityColor(maintenance.priority) },
                  ]}
                />
                <View>
                  <Text style={styles.maintenanceSystem}>{maintenance.solarSystem.name}</Text>
                  <Text style={styles.maintenanceType}>{getMaintenanceType(maintenance.type)}</Text>
                </View>
              </View>
              <Text style={styles.maintenanceDate}>
                {maintenance.scheduledDate
                  ? new Date(maintenance.scheduledDate).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Por programar'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pagos Pendientes</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Ver todos →</Text>
            </TouchableOpacity>
          </View>

          {pendingPayments.map((payment, index) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentLeft}>
                <View
                  style={[
                    styles.paymentIcon,
                    {
                      backgroundColor:
                        payment.status === 'OVERDUE'
                          ? Colors.error + '20'
                          : Colors.warning + '20',
                    },
                  ]}
                >
                  <Text style={styles.paymentEmoji}>💳</Text>
                </View>
                <View>
                  <Text style={styles.paymentConcept}>{payment.concept}</Text>
                  <Text style={styles.paymentDue}>
                    Vence:{' '}
                    {new Date(payment.dueDate).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
              <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📊</Text>
            <Text style={styles.actionLabel}>Ver Producción</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📞</Text>
            <Text style={styles.actionLabel}>Contactar Soporte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>📄</Text>
            <Text style={styles.actionLabel}>Mis Facturas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionEmoji}>🔧</Text>
            <Text style={styles.actionLabel}>Solicitar Servicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return Colors.error;
    case 'HIGH':
      return Colors.warning;
    case 'MEDIUM':
      return Colors.info;
    default:
      return Colors.success;
  }
};

const getMaintenanceType = (type: string) => {
  switch (type) {
    case 'PREVENTIVE':
      return 'Mantenimiento Preventivo';
    case 'CORRECTIVE':
      return 'Mantenimiento Correctivo';
    case 'INSPECTION':
      return 'Inspección';
    default:
      return type;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 60,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  greeting: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  date: {
    fontSize: FontSizes.sm,
    color: '#ffffff',
    opacity: 0.9,
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  maintenanceCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  maintenanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  maintenanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  maintenanceSystem: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  maintenanceType: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  maintenanceDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  paymentCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentEmoji: {
    fontSize: 20,
  },
  paymentConcept: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentDue: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionCard: {
    width: (width - Spacing.md * 3) / 2,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
