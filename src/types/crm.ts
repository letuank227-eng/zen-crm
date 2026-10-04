export type Role = 'ADMIN' | 'LEADER' | 'SALE' | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  teamId?: string;
  teamName?: string;
  phone?: string;
  isLocked: boolean;
  password?: string; // bcrypt hash, server-side only
  hasPassword?: boolean; // exposed to client instead of password
  targetRevenue: number; // Mục tiêu doanh số tháng (VND)
  targetDeals: number;   // Mục tiêu số deal chốt
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  targetRevenue: number;
}

export type LeadSource = string;
export type LeadStatus = string;

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address?: string;
  dob?: string;
  company?: string;
  source: string;
  status: string; // NEW, CONSULTING, POTENTIAL, WON, LOST, v.v.
  assignedSaleId?: string;
  assignedSaleName?: string;
  tags: string[];
  productIds?: string[]; // IDs của các sản phẩm khách mua / quan tâm
  productNames?: string[]; // Tên các sản phẩm mua / quan tâm
  discount?: number; // Giảm giá đã áp dụng
  deposit?: number; // Tiền cọc đã nhận
  shippingFee?: number; // Tiền ship
  subtotal?: number; // Tổng tiền hàng
  totalAmount?: number; // Tổng giá trị đơn hàng
  remainingDebt?: number; // Công nợ còn lại
  orderId?: string; // ID đơn hàng được tự động tạo
  orderCode?: string; // Mã đơn hàng tự động tạo
  notesCount: number;
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  leadId?: string;
  dealId?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'STAGE_CHANGE' | 'IMPORT' | 'EXPORT';
  entityType: 'LEAD' | 'DEAL' | 'ORDER' | 'TASK' | 'USER' | 'SETTINGS';
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  defaultProbability: number;
  color: string;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

export interface DealProductItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Quotation {
  id: string;
  dealId: string;
  code: string;
  items: DealProductItem[];
  subtotal: number;
  vat: number;
  discount: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  validUntil: string;
  notes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  dealId: string;
  contractCode: string;
  title: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'TERMINATED';
  fileName?: string;
  fileSize?: string;
  signedDate?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  pipelineId: string;
  stageId: string;
  value: number;
  winProbability: number;
  expectedCloseDate: string;
  assignedSaleId: string;
  assignedSaleName: string;
  closeReason?: string;
  closedAt?: string;
  products: DealProductItem[];
  contracts: Contract[];
  quotation?: Quotation;
  stageUpdatedAt: string; // Theo dõi deal đứng im > 7 ngày
  createdAt: string;
  updatedAt: string;
}

export type TaskType = 'CALL' | 'MEETING' | 'SEND_QUOTE' | 'DEMO' | 'EMAIL' | 'OTHER';
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  leadId?: string;
  dealId?: string;
  customerName?: string;
  assignedSaleId: string;
  assignedSaleName: string;
  dueDate: string; // ISO String
  status: TaskStatus;
  notes?: string;
  createdAt: string;
}

export interface InteractionLog {
  id: string;
  leadId: string;
  authorId: string;
  authorName: string;
  channel: 'PHONE' | 'ZALO' | 'MEETING' | 'EMAIL' | 'SMS';
  summary: string;
  occurredAt: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price?: number;
  retailPrice: number;
  wholesalePrice?: number;
  vipPrice?: number;
  imageUrl?: string;
  notes?: string;
  unit?: string;
  commissionRate?: number; // % hoa hồng Sale (ví dụ 10 = 10%)
  commissionAmount?: number; // Số tiền hoa hồng thực nhận (VND)
  sku?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
}

export type OrderStatus = 'PENDING' | 'DELIVERED_UNPAID' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  code: string;
  dealId?: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  company?: string;
  items: OrderItem[];
  subtotal?: number; // Tổng tiền sản phẩm
  discount?: number; // Giảm giá / Chiết khấu (VND, mặc định 0)
  shippingFee?: number; // Tiền ship / Phí vận chuyển (VND, mặc định 0)
  deposit?: number; // Tiền cọc đã thu trước (VND, mặc định 0)
  totalAmount: number; // Tổng giá trị đơn = subtotal + shippingFee - discount
  paidAmount: number; // Số tiền đã thu (= deposit lúc tạo)
  remainingDebt: number; // Công nợ còn lại = totalAmount - paidAmount
  status: OrderStatus;
  cancelReason?: string; // Lý do hủy đơn hàng nếu đơn bị hủy
  leadSource?: string; // Nguồn lead
  consultingStatus?: string; // Trạng thái tư vấn
  notes?: string; // Ghi chú đơn hàng / tư vấn
  assignedSaleId: string;
  assignedSaleName: string;
  createdAt: string;
  dueDate?: string;
}

export interface UserNotification {
  id: string;
  userId: string; // ID người nhận thông báo (Sale phụ trách)
  title: string;
  message: string;
  type: 'ORDER_STATUS' | 'LEAD_ASSIGNED' | 'SYSTEM';
  orderId?: string;
  orderCode?: string;
  leadId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'CATALOG' | 'PRICE_LIST' | 'BROCHURE' | 'CONTRACT_TEMPLATE';
  fileSize: string;
  fileType: string;
  url: string;
  allowedRoles: Role[];
  description?: string;
  updatedAt: string;
}

export interface SalesScript {
  id: string;
  title: string;
  category: 'OBJECTION_HANDLING' | 'COLD_CALL' | 'CLOSING_TECHNIQUE' | 'FAQ';
  questionOrScenario: string;
  recommendedResponse: string;
  tips: string;
  allowedRoles: Role[];
}

export interface CrmDatabase {
  users: User[];
  teams: Team[];
  sources: string[];
  statuses: { id: string; name: string; color: string; isWon?: boolean; isLost?: boolean }[];
  leads: Lead[];
  notes: Note[];
  auditLogs: AuditLog[];
  pipelines: Pipeline[];
  deals: Deal[];
  tasks: Task[];
  interactions: InteractionLog[];
  products: Product[];
  productCategories?: string[];
  orders: Order[];
  documents: DocumentItem[];
  salesScripts: SalesScript[];
  notifications?: UserNotification[];
}
