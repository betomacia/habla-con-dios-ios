import { Capacitor } from '@capacitor/core';
import { NativePurchases } from '@capgo/native-purchases';
import { AuthService } from './AuthService';
import { LoggerService } from './LoggerService';
import { DebugLogger } from './DebugLogger';

interface NativePurchasesPlugin {
  isBillingSupported(): Promise<{ isBillingSupported: boolean }>;
  purchaseProduct(options: {
    productIdentifier: string;
    planIdentifier?: string;
    productType?: string;
    quantity?: number;
  }): Promise<any>;
  restorePurchases(): Promise<any>;
  getReceipt?(): Promise<{ receipt: string }>;
}

const PURCHASE_TYPE = {
  SUBS: 'subs',
  INAPP: 'inapp'
} as const;

export interface BillingProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: 'subscription' | 'consumable';
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

export interface SubscriptionData {
  tier: 'free' | 'basic' | 'standard' | 'premium';
  credits_remaining: number;
  total_purchased_credits: number;
  credits_total: number;
  expires_at: string;
  is_active: boolean;
}

export class BillingService {
  private static initialized = false;
  private static backendUrl = 'https://backend.movilive.es';

  static async initialize(): Promise<void> {
    DebugLogger.log('1. Iniciando BillingService...');

    if (this.initialized) {
      DebugLogger.log('1.1. BillingService ya inicializado');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      DebugLogger.log('1.2. No es plataforma nativa', { platform: Capacitor.getPlatform() });
      return;
    }

    DebugLogger.log('2. Es plataforma nativa', { platform: Capacitor.getPlatform() });

    try {
      DebugLogger.log('3. Verificando si billing está soportado...');
      const { isBillingSupported } = await NativePurchases.isBillingSupported();
      LoggerService.log('[BillingService] 🔍 DEBUG - isBillingSupported result:', isBillingSupported);
      DebugLogger.log('4. Billing soportado:', { isBillingSupported });

      if (isBillingSupported) {
        this.initialized = true;
        LoggerService.log('[BillingService] ✅ iOS StoreKit initialized');
        DebugLogger.log('4.1. iOS StoreKit inicializado correctamente');
      } else {
        this.initialized = false;
        LoggerService.log('[BillingService] ❌ iOS StoreKit not supported');
        DebugLogger.log('4.2. iOS StoreKit NO soportado');
      }
    } catch (error: any) {
      LoggerService.error('[BillingService] Error initializing:', error);
      DebugLogger.log('ERROR en initialize', { message: error.message, code: error.code });
      this.initialized = false;
    }
  }

  static async purchaseSubscription(productId: string, deviceId: string): Promise<PurchaseResult> {
    DebugLogger.log('5. Iniciando compra', { productId, deviceId });

    if (!Capacitor.isNativePlatform()) {
      DebugLogger.log('5.1. ERROR: No es plataforma nativa');
      return { success: false, error: 'Not on native platform' };
    }

    if (!this.initialized) {
      DebugLogger.log('5.2. BillingService no inicializado, inicializando...');
      await this.initialize();
    }

    // iOS App Store plan identifiers (base plan IDs)
    const planIdentifiers: Record<string, string> = {
      'plan_basic': 'basic-plan',
      'plan_standard': 'plan-standard',
      'premium_plan': 'plan-premium'
    };

    const planIdentifier = planIdentifiers[productId];
    if (!planIdentifier) {
      LoggerService.error('[BillingService] Invalid product ID:', productId);
      DebugLogger.log('ERROR: Invalid product ID', { productId });
      return { success: false, error: 'Invalid product ID' };
    }

    try {
      LoggerService.log('[BillingService] 🛒 Starting iOS purchase:', { productId, planIdentifier });

      LoggerService.log('[BillingService] 🔍 DEBUG - Llamando NativePurchases.purchaseProduct con:', {
        productIdentifier: productId,
        planIdentifier: planIdentifier,
        productType: PURCHASE_TYPE.SUBS,
        quantity: 1,
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform()
      });

      DebugLogger.log('6. Llamando NativePurchases.purchaseProduct', {
        productIdentifier: productId,
        planIdentifier,
        productType: PURCHASE_TYPE.SUBS
      });

      const result = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        planIdentifier: planIdentifier,
        productType: PURCHASE_TYPE.SUBS,
        quantity: 1
      });

      LoggerService.log('[BillingService] 📦 Purchase result:', result);
      DebugLogger.log('7. Resultado de compra', result);

      // iOS uses transactionId
      const transactionId = result.transactionId || result.transaction_id;

      if (!transactionId) {
        LoggerService.error('[BillingService] No transaction ID received');
        DebugLogger.log('ERROR: No transaction ID', { result });
        return { success: false, error: 'No transaction ID received' };
      }

      DebugLogger.log('7.1. Transaction ID recibido', { transactionId });

      // Get the receipt for server-side validation
      let receiptData = result.receipt || result.receiptData;

      // If receipt not in result, try to get it separately
      if (!receiptData && NativePurchases.getReceipt) {
        try {
          DebugLogger.log('7.2. Intentando obtener receipt por separado...');
          const receiptResult = await NativePurchases.getReceipt();
          receiptData = receiptResult.receipt;
          DebugLogger.log('7.3. Receipt obtenido', { hasReceipt: !!receiptData });
        } catch (e) {
          LoggerService.log('[BillingService] ⚠️ Could not get receipt separately');
          DebugLogger.log('7.4. No se pudo obtener receipt por separado');
        }
      } else {
        DebugLogger.log('7.2. Receipt incluido en resultado', { hasReceipt: !!receiptData });
      }

      // Obtener precio del producto de la tienda
      const storeProducts = await this.getStoreProducts();
      const product = storeProducts?.products?.find(p => p.identifier === productId);
      const pricePaid = product?.price;
      const currencyCode = product?.currencyCode;
      const priceString = product?.priceString;

      // Verify purchase with backend
      DebugLogger.log('8. Verificando compra con backend...');
      await this.verifyPurchase(deviceId, transactionId, productId, receiptData, pricePaid, currencyCode, priceString);
      DebugLogger.log('9. Compra verificada exitosamente');

      return {
        success: true,
        transactionId: transactionId,
        productId
      };

    } catch (error: any) {
      LoggerService.error('[BillingService] Purchase error:', error);
      DebugLogger.log('ERROR', { message: error.message, code: error.code });

      if (error.message?.toLowerCase().includes('cancel') ||
          error.code === 'E_USER_CANCELLED' ||
          error.code === 2) {
        DebugLogger.log('Usuario canceló la compra');
        return { success: false, error: 'User cancelled purchase' };
      }

      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  static async purchaseExtraCredits(deviceId: string): Promise<PurchaseResult> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not on native platform' };
    }

    if (!this.initialized) {
      await this.initialize();
    }

    try {
      LoggerService.log('[BillingService] 🛒 Starting iOS consumable purchase: extra_credits');

      const result = await NativePurchases.purchaseProduct({
        productIdentifier: 'extra_credits',
        productType: PURCHASE_TYPE.INAPP,
        quantity: 1
      });

      LoggerService.log('[BillingService] 📦 Purchase result:', result);

      const transactionId = result.transactionId || result.transaction_id;

      if (!transactionId) {
        LoggerService.error('[BillingService] No transaction ID received');
        return { success: false, error: 'No transaction ID received' };
      }

      // Get receipt for validation
      let receiptData = result.receipt || result.receiptData;

      if (!receiptData && NativePurchases.getReceipt) {
        try {
          const receiptResult = await NativePurchases.getReceipt();
          receiptData = receiptResult.receipt;
        } catch (e) {
          LoggerService.log('[BillingService] ⚠️ Could not get receipt separately');
        }
      }

      // Obtener precio del producto de la tienda
      const storeProducts = await this.getStoreProducts();
      const product = storeProducts?.products?.find(p => p.identifier === 'extra_credits');
      const pricePaid = product?.price;
      const currencyCode = product?.currencyCode;
      const priceString = product?.priceString;

      await this.verifyPurchase(deviceId, transactionId, 'extra_credits', receiptData, pricePaid, currencyCode, priceString);

      return {
        success: true,
        transactionId: transactionId,
        productId: 'extra_credits'
      };

    } catch (error: any) {
      LoggerService.error('[BillingService] Purchase error:', error);

      if (error.message?.toLowerCase().includes('cancel') ||
          error.code === 'E_USER_CANCELLED' ||
          error.code === 2) {
        return { success: false, error: 'User cancelled purchase' };
      }

      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  private static async verifyPurchase(
    deviceId: string,
    transactionId: string,
    productId: string,
    receiptData?: string,
    pricePaid?: number,
    currencyCode?: string,
    priceString?: string
  ): Promise<void> {
    try {
      LoggerService.log('[BillingService] 🔐 Verifying iOS purchase with backend:', {
        deviceId,
        transactionId,
        productId,
        hasReceipt: !!receiptData
      });

      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`${this.backendUrl}/api/verify-purchase`, {
        method: 'POST',
        headers: AuthService.getAuthHeaders(token),
        body: JSON.stringify({
          device_id: deviceId,
          transaction_id: transactionId,
          product_id: productId,
          platform: Capacitor.getPlatform(),
          receipt_data: receiptData,
          price_paid: pricePaid,
          currency_code: currencyCode,
          price_string: priceString
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        LoggerService.error('[BillingService] Verification failed:', errorText);
        throw new Error(`Verification failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      LoggerService.log('[BillingService] ✅ Purchase verified:', data);

    } catch (error) {
      LoggerService.error('[BillingService] Verification error:', error);
      throw error;
    }
  }

  static async refreshSubscriptionData(deviceId: string): Promise<SubscriptionData | null> {
    try {
      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`${this.backendUrl}/api/subscription/status?deviceId=${deviceId}`, {
        method: 'GET',
        headers: AuthService.getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.status}`);
      }

      const data = await response.json();

      return {
        tier: data.tier || 'free',
        credits_remaining: data.credits_remaining || 0,
        total_purchased_credits: data.total_purchased_credits || 0,
        credits_total: data.credits_total || 0,
        expires_at: data.expires_at || null,
        is_active: data.is_active || false
      };
    } catch (error) {
      console.error('[BillingService] ❌ Error refreshing subscription:', error);
      return null;
    }
  }

  static async restorePurchases(deviceId: string): Promise<PurchaseResult> {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not on native platform' };
    }

    try {
      LoggerService.log('[BillingService] 🔄 Restoring iOS purchases...');

      const result = await NativePurchases.restorePurchases();
      LoggerService.log('[BillingService] 📦 Restore result:', result);

      // After restore, refresh subscription data from backend
      await this.refreshSubscriptionData(deviceId);

      return { success: true };
    } catch (error: any) {
      LoggerService.error('[BillingService] Restore error:', error);
      return { success: false, error: error.message || 'Restore failed' };
    }
  }

  static getProductCredits(productId: string): number {
    const creditsMap: Record<string, number> = {
      'plan_basic': 300,
      'plan_standard': 600,
      'premium_plan': 900,
      'extra_credits': 900
    };
    return creditsMap[productId] || 0;
  }

  static getProductPrice(productId: string): string {
    const priceMap: Record<string, string> = {
      'plan_basic': '$4.99',
      'plan_standard': '$9.99',
      'premium_plan': '$19.99',
      'extra_credits': '$19.99'
    };
    return priceMap[productId] || '';
  }

  static async getStoreProducts(): Promise<{
    products: Array<{
      identifier: string;
      priceString: string;
      price: number;
      currencyCode: string;
      title: string;
      description: string;
    }>;
  } | null> {
    if (!Capacitor.isNativePlatform()) {
      LoggerService.log('[BillingService] Not on native platform, skipping store products');
      return null;
    }

    try {
      LoggerService.log('[BillingService] 🏪 Getting products from native store...');

      const result = await NativePurchases.getProducts({
        productIdentifiers: ['plan_basic', 'plan_standard', 'premium_plan', 'extra_credits'],
        productType: PURCHASE_TYPE.SUBS
      });

      LoggerService.log('[BillingService] ✅ Store products received:', result);
      return result;
    } catch (error) {
      LoggerService.error('[BillingService] Error getting store products:', error);
      return null;
    }
  }
}