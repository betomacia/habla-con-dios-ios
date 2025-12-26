import { Device } from '@capacitor/device';
import { BillingService } from './BillingService';
import { AuthService } from './AuthService';

interface Product {
  product_id: string;
  tier: string;
  credits: number;
  price: number;
  name: string;
  description: string;
}

export class PurchaseService {
  private static isInitialized = false;

  static async initialize(deviceId: string): Promise<void> {
    if (this.isInitialized) return;
    
    // Initialize BillingService for iOS
    await BillingService.initialize();
    
    this.isInitialized = true;
    console.log('[PurchaseService] ✅ Initialized (iOS billing via BillingService)');
  }

  static async getProducts(deviceId: string, language: string = 'es'): Promise<Product[]> {
    try {
      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`https://backend.movilive.es/api/iap/products?platform=ios&lang=${language}`, {
        headers: AuthService.getAuthHeaders(token)
      });
      const data = await response.json();

      console.log('[PurchaseService] 📦 Productos iOS disponibles:', data.products);
      return data.products;
    } catch (error) {
      console.error('[PurchaseService] ❌ Error obteniendo productos:', error);
      return [];
    }
  }

  static async purchaseProduct(productId: string, deviceId: string): Promise<boolean> {
    try {
      console.log('[PurchaseService] 🛒 Iniciando compra iOS:', productId);

      const result = await BillingService.purchaseSubscription(productId, deviceId);

      console.log('[PurchaseService] Resultado:', result);

      return result.success;
    } catch (error: any) {
      console.error('[PurchaseService] ❌ Error en compra:', error);
      return false;
    }
  }

  static async purchaseExtraCredits(deviceId: string): Promise<boolean> {
    try {
      console.log('[PurchaseService] 🛒 Iniciando compra créditos extra iOS');

      const result = await BillingService.purchaseExtraCredits(deviceId);

      console.log('[PurchaseService] Resultado:', result);

      return result.success;
    } catch (error: any) {
      console.error('[PurchaseService] ❌ Error en compra:', error);
      return false;
    }
  }

  static async restorePurchases(deviceId: string): Promise<boolean> {
    try {
      console.log('[PurchaseService] 🔄 Restaurando compras iOS...');
      
      const result = await BillingService.restorePurchases(deviceId);
      
      console.log('[PurchaseService] Resultado restore:', result);
      
      return result.success;
    } catch (error) {
      console.error('[PurchaseService] ❌ Error restaurando compras:', error);
      return false;
    }
  }
}

export const purchaseService = PurchaseService;