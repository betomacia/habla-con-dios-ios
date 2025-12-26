import type { SubscriptionPlan, SubscriptionTier } from './types';
import { AuthService } from './AuthService';

interface PricingResponse {
  platform: string;
  products: Array<{
    product_id: string;
    tier: SubscriptionTier;
    credits: number;
    price: number;
    name: string;
    description: string;
  }>;
}

export class PricingService {
  private backendUrl: string;
  private deviceId: string;

  constructor(backendUrl: string, deviceId: string = '') {
    this.backendUrl = backendUrl;
    this.deviceId = deviceId;
  }

  async loadPrices(): Promise<PricingResponse | null> {
    try {
      console.log('[PricingService] 💰 Cargando precios desde backend...');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.deviceId) {
        const token = await AuthService.getToken(this.deviceId);
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`https://backend.movilive.es/api/iap/products?platform=ios&lang=${navigator.language?.split('-')[0] || 'es'}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error('[PricingService] ❌ Error HTTP:', response.status);
        return null;
      }

      const data: PricingResponse = await response.json();
      console.log('[PricingService] ✅ Precios cargados:', data);

      return data;
    } catch (error) {
      console.error('[PricingService] ❌ Error cargando precios:', error);
      return null;
    }
  }

  async enrichPlansWithPricing(
    basePlans: Record<SubscriptionTier, SubscriptionPlan>
  ): Promise<Record<SubscriptionTier, SubscriptionPlan>> {
    const pricing = await this.loadPrices();

    if (!pricing) {
      console.warn('[PricingService] ⚠️ Usando precios por defecto');
      return this.getDefaultPrices(basePlans);
    }

    const enrichedPlans = { ...basePlans };

    pricing.products.forEach((product) => {
      if (enrichedPlans[product.tier]) {
        enrichedPlans[product.tier] = {
          ...enrichedPlans[product.tier],
          price: product.price,
          currency: 'EUR',
          localizedPrice: `${product.price.toFixed(2)}€`,
        };
      }
    });

    console.log('[PricingService] ✅ Planes enriquecidos con precios dinámicos');
    return enrichedPlans;
  }

  private getDefaultPrices(
    basePlans: Record<SubscriptionTier, SubscriptionPlan>
  ): Record<SubscriptionTier, SubscriptionPlan> {
    return {
      ...basePlans,
      basic: {
        ...basePlans.basic,
        price: 4.99,
        currency: 'USD',
        localizedPrice: '$4.99',
      },
      standard: {
        ...basePlans.standard,
        price: 9.99,
        currency: 'USD',
        localizedPrice: '$9.99',
      },
      premium: {
        ...basePlans.premium,
        price: 19.99,
        currency: 'USD',
        localizedPrice: '$19.99',
      },
      free: {
        ...basePlans.free,
        price: 0,
        currency: 'USD',
        localizedPrice: 'Free',
      },
    };
  }

  getUserCountry(): string {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const countryMap: Record<string, string> = {
        'America/New_York': 'US',
        'America/Los_Angeles': 'US',
        'America/Chicago': 'US',
        'America/Sao_Paulo': 'BR',
        'America/Argentina/Buenos_Aires': 'AR',
        'America/Mexico_City': 'MX',
        'Europe/Madrid': 'ES',
        'Europe/London': 'GB',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/Rome': 'IT',
        'Europe/Lisbon': 'PT',
        'Asia/Tokyo': 'JP',
        'Asia/Shanghai': 'CN',
        'Australia/Sydney': 'AU',
      };

      for (const [tz, country] of Object.entries(countryMap)) {
        if (timezone.includes(tz)) {
          return country;
        }
      }

      return 'US';
    } catch {
      return 'US';
    }
  }

  getCurrencyForCountry(country: string): string {
    const currencyMap: Record<string, string> = {
      US: 'USD',
      BR: 'BRL',
      AR: 'ARS',
      MX: 'MXN',
      ES: 'EUR',
      GB: 'GBP',
      FR: 'EUR',
      DE: 'EUR',
      IT: 'EUR',
      PT: 'EUR',
      JP: 'JPY',
      CN: 'CNY',
      AU: 'AUD',
    };

    return currencyMap[country] || 'USD';
  }
}
