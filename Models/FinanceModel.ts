// core/models/finance.model.ts

// Devises et Taux de Change
export interface Currency {
  _id: string;
  id: string;
  code: string; // EUR, USD, CDF
  name: string;
  symbol: string;
  isBase: boolean;
}

export interface ExchangeRate {
  _id: string;
  id: string;
  baseCurrencyId: string;
  targetCurrencyId: string;
  rate: number;
  effectiveDate: Date;
  expirationDate?: Date;
}

// Système de Réductions
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export interface Discount {
  _id?: string | undefined;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  startDate: Date;
  endDate?: Date;
  maxAmount?: number;
  minPurchase?: number;
  appliesTo: 'ALL' | 'CATEGORY' | 'PRODUCT';
  targetIds?: string[]; // Produits/catégories concernés
  isActive: boolean;
}

// Paramètres Financiers
export interface FinancialSettings {
  id: string;
  defaultCurrency: string;
  taxRate: number;
  loyaltyPointsRatio: number; // Ex: 1€ = 10 points
  invoiceDueDays: number;
  latePaymentFee: number;
}
