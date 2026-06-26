export interface User {
  id: string;
  name: string;
  email: string;
  location?: string;
  role?: string;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
  owner_name?: string;
  profile_image?: string;
  role?: string;
}

export interface AuthLoginResponse {
  user: User;
  token: string;
  store?: Store;
  stores?: Store[];
}

export interface CreateSalePayload {
  store_id: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  status: string;
  stripe_payment_intent_id?: string | null;
  items: any;
}
export interface AuthRegisterPayload {
  storeName: string;
  storeLocation: string;
  ownerName: string;
  email: string;
  password: string;
}

export interface AuthRegisterResponse {
  user: User;
  token?: string;
  store?: Store;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateStorePayload {
  name: string;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  selling_price: number;
  cost_price: number;
  unit: string;
  total_quantity: number;
  min_stock_level: number;
  last_restocked_at: string | null;
  barcode: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  description: string;
  selling_price: number;
  cost_price: number;
  unit: string;
  barcode: string;
  total_quantity?: number;
  min_stock_level?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductListResponse {
  products: Product[];
  pagination: PaginationMeta;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: PaginationMeta;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  unit?: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  hire_date: string;
  salary: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: PaginationMeta;
}

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  department?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  is_active: boolean;
  total_orders?: number;
  total_spent?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: PaginationMeta;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface Salesman {
  id: string;
  employee_id: string;
  commission_rate: number;
  target_monthly: number;
  total_sales: number;
  region: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employees?: Employee;
}

export interface Sale {
  id: string;
  salesman_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  status: string;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  salesmen?: Salesman;
  items?: SaleItem[];
}

export interface SaleListResponse {
  sales: Sale[];
  pagination: PaginationMeta;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
  products?: Product;
}

export type DashboardPeriod = 'current_month' | 'last_month' | 'custom';

export interface DashboardStatsComparison {
  profitChange: number;
  salesChange: number;
  productsChange: number;
  employeesChange: number;
}

export interface DashboardStats {
  period: DashboardPeriod;
  startDate: string;
  endDate: string;
  totalProducts: number;
  totalSales: number;
  totalProfit: number;
  totalEmployees: number;
  comparison: DashboardStatsComparison;
}

export interface MonthlyChartData {
  month: string;
  revenue: number;
  orders: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
