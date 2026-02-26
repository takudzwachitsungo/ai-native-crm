// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'USER';

export interface TenantUser {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// Entity Types
export interface Lead {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  source?: string;
  score?: number;
  estimatedValue?: number;
  notes?: string;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Deal {
  id?: string;
  name: string;
  value: number;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  companyId?: string;
  contactId?: string;
  type?: string;
  source?: string;
  description?: string;
  notes?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id?: string;
  name: string;
  email?: string;
  industry?: string;
  website?: string;
  phone?: string;
  revenue?: number;
  employeeCount?: number;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  companyId?: string;
  isPrimary?: boolean;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  linkedin?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  assignedTo?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventType: 'MEETING' | 'CALL' | 'DEMO' | 'FOLLOW_UP' | 'INTERNAL' | 'PRESENTATION' | 'TRAINING' | 'CONFERENCE' | 'OTHER';
  location?: string;
  meetingLink?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id?: string;
  name: string;
  sku?: string;
  description?: string;
  category?: 'SOFTWARE' | 'SERVICES' | 'TRAINING' | 'SUPPORT' | 'HARDWARE' | 'SUBSCRIPTIONS' | 'OTHER';
  unitPrice: number;
  cost?: number;
  currency?: string;
  stockQuantity?: number;
  unit?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DRAFT';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id?: string;
  quoteNumber: string;
  companyId: string;
  contactId?: string;
  issueDate: string;
  validUntil?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paymentTerms?: string;
  notes?: string;
  lineItems?: QuoteLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteLineItem {
  id?: string;
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  total?: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  companyId: string;
  contactId?: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  subtotal?: number;
  tax?: number;
  total?: number;
  amountPaid?: number;
  paymentDate?: string;
  paymentTerms?: string;
  notes?: string;
  lineItems?: InvoiceLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLineItem {
  id?: string;
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total?: number;
}

export interface Document {
  id?: string;
  name: string;
  type: string;
  size: number;
  url: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Email Types
export interface Email {
  id?: string;
  tenantId?: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  folder?: EmailFolder;
  isDraft?: boolean;
  isSent?: boolean;
  isRead?: boolean;
  sentAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EmailFolder = 'INBOX' | 'SENT' | 'DRAFTS' | 'TEMPLATES';

export interface EmailFilterDTO {
  search?: string;
  folder?: EmailFolder;
  isDraft?: boolean;
  isSent?: boolean;
  isRead?: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
}
