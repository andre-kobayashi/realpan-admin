// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Customer Types
export interface Customer {
  id: string;
  type: 'INDIVIDUAL' | 'BUSINESS';
  firstName?: string | null;
  lastName?: string | null;
  firstNameKana?: string | null;
  lastNameKana?: string | null;
  companyName?: string | null;
  companyNameKana?: string | null;
  houjinBangou?: string | null;
  businessType?: 'KOJIN_JIGYOU' | 'HOUJIN' | null;
  invoiceNumber?: string | null;
  representativeName?: string | null;
  businessStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  contractNotes?: string | null;
  email: string;
  phone: string;
  phoneAlt?: string | null;
  postalCode?: string | null;
  prefecture?: string | null;
  city?: string | null;
  ward?: string | null;
  streetAddress?: string | null;
  building?: string | null;
  stripeCustomerId?: string | null;
  paymentTerms?: number | null;
  creditLimit?: number | null;
  discountRate?: number | null;
  billingClosingDay?: number | null;
  billingDueDay?: number | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  slug: string;
  namePt: string;
  nameJa: string;
  descriptionPt?: string;
  descriptionJa?: string;
  image?: string;
  icon?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

// Product Types
export interface Product {
  id: string;
  hinban: string;
  janCode?: string | null;
  slug: string;
  namePt: string;
  nameJa: string;
  descriptionPt?: string | null;
  descriptionJa?: string | null;
  shortDescPt?: string | null;
  shortDescJa?: string | null;
  categoryId: string;
  category?: Category;
  images: string[];
  primaryImage?: string | null;
  weight?: string | null;
  weightGrams?: number | null; // Para facilitar cálculos
  quantityInfo?: string | null;
  dimensions?: string | null;
  storageType: string;
  shelfLife?: string | null;
  shelfLifeDays?: number | null; // Para facilitar cálculos
  allergens: string[];
  wholesaleUnit: 'UNIT' | 'BOX';
  unitsPerBox?: number | null;
  boxPrice?: number | null;
  originalPrice: number;
  retailMarkup: number;
  promoPrice?: number | null;
  promoStartDate?: string | null;
  promoEndDate?: string | null;
  stock: number;
  minStock: number;
  maxStock?: number | null;
  stockUnit: string;
  availableForPf: boolean;
  availableForPj: boolean;
  isBestseller: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'COD' | 'INVOICE' | 'STRIPE' | 'DAIBIKI' | 'KONBINI' | 'PAYPAY';
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  
  // Campos de entrega
  carrierId?: string;
  carrier?: {
    id: string;
    name: string;
    namePt: string;
  };
  trackingCode?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  
  // Endereço de entrega
  shippingName?: string;
  shippingPhone?: string;
  shippingPostalCode?: string;
  shippingPrefecture?: string;
  shippingCity?: string;
  shippingWard?: string;
  shippingStreet?: string;
  shippingBuilding?: string;
  daibikiFee?: number;
  
  items?: OrderItem[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountPercent?: number;
  discountAmount: number;
}

// Form Types
export interface CategoryFormData {
  namePt: string;
  nameJa: string;
  descriptionPt: string;
  descriptionJa: string;
}

export interface ProductFormData {
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  price: number;
  stock: number;
  categoryId: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: {
    pt: string;
    ja: string;
  };
}

// Campos adicionais para Product (se não existirem)
// quantityInfo, weightGrams, shelfLifeDays, storageType, wholesaleUnit, unitsPerBox
