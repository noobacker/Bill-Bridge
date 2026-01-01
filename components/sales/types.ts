// Common types for sales components
export interface Partner {
  id: string
  name: string
}

export interface ProductType {
  id: string
  name: string
  hsnNumber: string
  isService?: boolean
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
}

export interface ProductionBatch {
  id: string
  remainingQuantity: number
  productType: {
    id: string
    name: string
  }
  storageLocation: {
    name: string
    id: string
    createdAt: Date
    updatedAt: Date
    description: string | null
  } | null
}

export interface Sale {
  id: string
  quantity: number
  rate: number
  amount: number
  createdAt: Date
  invoice: {
    id: string
    invoiceNumber: string
    isGst: boolean
    paymentType: string
    totalAmount: number
    invoiceDate: Date | string
    createdAt: Date
    partner: {
      id: string
      name: string
      phone?: string | null
      contactName?: string | null
      email?: string | null
      gstNumber?: string | null
    }
  }
  productType: {
    name: string
    hsnNumber: string
  }
  productionBatch?: {
    id: string
    storageLocation: {
      name: string
    } | null
  }
  batchDetails?: Array<{
    id: string
    quantity: number
    location: string
  }>
}

export interface Invoice {
  id: string
  invoiceNumber: string
  partnerId: string
  invoiceDate: string
  isGst: boolean
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
  paymentType: string
  remarks?: string | null
  transportMode?: string | null
  transportationId?: string | null
  driverName?: string | null
  driverPhone?: string | null
  transportVehicle?: string | null
  deliveryCity?: string | null
  sales: Sale[]
}

export interface SaleDetail {
  id: string
  quantity: number
  rate: number
  amount: number
  productTypeId: string
  productionBatchId: string
  productType?: {
    id: string
    name: string
    hsnNumber: string
  }
  productionBatch?: {
    id: string
    storageLocation: {
      name: string
    } | null
    remainingQuantity: number
  }
}

export interface BatchSelection {
  batchId: string
  quantity: number
  locationName: string
  availableQuantity: number
}

export interface SaleItem {
  id: string // A unique ID for the item in the form, e.g., using crypto.randomUUID()
  productTypeId: string
  rate: number
  batchSelections: BatchSelection[]
  paymentStatus?: string
}

export interface MultiProductSaleFormData {
  invoiceNumber: string
  partnerId: string
  invoiceDate: string
  isGst: boolean
  paymentType: string
  paymentStatus: string
  paidAmount: number
  remarks: string
  transportVehicle: string
  deliveryCity: string
  items: SaleItem[]
} 