export type UserRole = 'CLIENT' | 'TECHNICIAN' | 'MANAGER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface SolarSystem {
  id: string;
  name: string;
  capacity: number;
  installDate: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  location?: string;
  panels: number;
  inverterModel?: string;
  currentProduction?: number;
  totalProduction?: number;
}

export interface Maintenance {
  id: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  solarSystem: {
    id: string;
    name: string;
  };
  client: {
    id: string;
    name: string;
    phone?: string;
  };
  technicians?: {
    id: string;
    name: string;
  }[];
}

export interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: Date;
  paidDate?: Date;
  concept: string;
  invoiceNumber?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  pdf?: string;
}

export interface Notification {
  id: string;
  type: 'MAINTENANCE' | 'PAYMENT' | 'SYSTEM_ALERT' | 'GENERAL';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: any;
}

export interface DashboardStats {
  totalSystems?: number;
  activeSystems?: number;
  totalProduction?: number;
  upcomingMaintenances?: number;
  pendingPayments?: number;
  totalRevenue?: number;
}
