import { type User } from '@prisma/client'

export type { User }

// Custom types for status fields (not enums in Prisma schema)
export type OrderStatus = string
export type MaintenanceStatus = string
export type InvoiceStatus = string

export interface ExtendedUser extends User {
  permissions: Permission[]
}

export interface Permission {
  id: string
  userId: string
  resource: string
  actions: string[]
}

export interface ClientWithFiscalData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  notes?: string
  profileImage?: string
  fiscalData?: FiscalData
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface FiscalData {
  id: string
  razonSocial: string
  rfc: string
  email?: string
  telefono?: string
  calle?: string
  numero?: string
  colonia?: string
  codigoPostal?: string
  ciudad?: string
  estado?: string
  regimenFiscal: RegimenFiscal
  usoCFDI: UsoCFDI
}

export interface RegimenFiscal {
  id: string
  code: string
  descripcion: string
}

export interface UsoCFDI {
  id: string
  code: string
  descripcion: string
}

export interface ProductWithCategory {
  id: string
  name: string
  brand?: string
  model?: string
  capacity?: string
  description?: string
  unitPrice?: number
  category: ProductCategory
  subCategory?: ProductSubCategory
  isActive: boolean
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
}

export interface ProductSubCategory {
  id: string
  name: string
  categoryId: string
}

export interface InventoryItemWithDetails {
  id: string
  quantity: number
  serialNumber?: string
  invoiceNumber?: string
  purchaseDate?: Date
  supplier?: string
  unitCost?: number
  totalCost?: number
  notes?: string
  product: ProductWithCategory
  location: Location
}

export interface Location {
  id: string
  name: string
  address?: string
}

export interface OrderWithDetails {
  id: string
  orderNumber: string
  client: ClientWithFiscalData
  status: OrderStatus
  orderType: string
  orderDate: Date
  requiredDate?: Date
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  orderItems: OrderItemWithProduct[]
}

export interface OrderItemWithProduct {
  id: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  product: ProductWithCategory
}

export interface MaintenanceWithDetails {
  id: string
  client: ClientWithFiscalData
  solarSystem?: SolarSystemWithComponents
  maintenanceType: string
  scheduledDate: Date
  completedDate?: Date
  status: MaintenanceStatus
  description?: string
  workPerformed?: string
  cost?: number
}

export interface SolarSystemWithComponents {
  id: string
  systemName: string
  capacity?: number
  installationDate?: Date
  components: SolarSystemComponent[]
}

export interface SolarSystemComponent {
  id: string
  product: ProductWithCategory
  serialNumber?: string
  quantity: number
  installationDate?: Date
}

export interface EnergyReadingData {
  id: string
  readingDate: Date
  dailyGeneration?: number
  totalGeneration?: number
  currentPower?: number
  co2Saved?: number
  revenue?: number
}

export interface DashboardStats {
  totalClients: number
  activeOrders: number
  monthlyRevenue: number
  pendingMaintenance: number
  totalEnergyGenerated: number
  co2SavedThisMonth: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
    fill?: boolean
  }[]
}

// Form types
export interface ClientFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  notes?: string
}

export interface FiscalDataFormData {
  razonSocial: string
  rfc: string
  email?: string
  telefono?: string
  calle?: string
  numero?: string
  colonia?: string
  codigoPostal?: string
  ciudad?: string
  estado?: string
  regimenFiscalId: string
  usoCFDIId: string
}

export interface ProductFormData {
  name: string
  brand?: string
  model?: string
  capacity?: string
  description?: string
  unitPrice?: number
  categoryId: string
  subCategoryId?: string
}

export interface OrderFormData {
  clientId: string
  orderType: string
  requiredDate?: Date
  shippingAddress?: string
  notes?: string
  items: OrderItemFormData[]
}

export interface OrderItemFormData {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

export interface MaintenanceFormData {
  clientId: string
  solarSystemId?: string
  maintenanceType: string
  scheduledDate: Date
  description?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Search and filter types
export interface SearchFilters {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ClientFilters extends SearchFilters {
  isActive?: boolean
  city?: string
  state?: string
}

export interface OrderFilters extends SearchFilters {
  status?: OrderStatus
  clientId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface InventoryFilters extends SearchFilters {
  categoryId?: string
  locationId?: string
  lowStock?: boolean
}