// ============================================
// SUBSCRIPTIONSERVICE.TS - GESTIÓN DE CRÉDITOS
// ============================================

import type { SubscriptionStatus, SubscriptionTier, ConversationMode, CreditCheckResponse } from './types';
import { CREDITS_PER_MODE } from './types';
import { StorageService } from './StorageService';
import { AuthService } from './AuthService';
import { Capacitor } from '@capacitor/core';

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    monthlyCredits: 10,
    features: ['10 mensajes/día', 'Solo chat']
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    monthlyCredits: 100,
    features: ['100 mensajes/mes', 'Chat + Audio']
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    monthlyCredits: -1, // Ilimitado
    features: ['Chat + Audio + Jesús']
  }
} as const;

export class SubscriptionService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Verificar si el usuario tiene un plan activo (sin cargar datos)
   * Backend retorna 404 si no existe → Usuario nuevo
   * Backend retorna 200 si existe → Usuario existente
   */
  async checkUserHasPlan(deviceId: string): Promise<{
    has_plan: boolean;
    tier: string | null;
    user_name?: string | null;
    gender?: string | null;
    language?: string | null;
    credits_remaining?: number;
    last_mode?: string;
  }> {
    try {
      const token = await AuthService.getToken(deviceId);
      const url = `https://backend.movilive.es/api/subscription/status?deviceId=${deviceId}`;
      console.log('[SubscriptionService] 🔍 Verificando plan existente para:', deviceId);

      const response = await fetch(url, {
        method: 'GET',
        headers: AuthService.getAuthHeaders(token)
      });

      if (response.status === 404) {
        console.log('[SubscriptionService] ❌ Usuario no encontrado (nuevo usuario)');
        return {
          has_plan: false,
          tier: null
        };
      }

      if (response.ok) {
        const data = await response.json();
        console.log('[SubscriptionService] ✅ Usuario encontrado:', {
          tier: data.tier,
          user_name: data.user_name,
          gender: data.gender,
          language: data.language,
          credits_remaining: data.credits_remaining
        });

        return {
          has_plan: true,
          tier: data.tier,
          user_name: data.user_name,
          gender: data.gender,
          language: data.language,
          credits_remaining: data.credits_remaining,
          last_mode: data.last_mode
        };
      }

      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      console.error('[SubscriptionService] ❌ Error verificando plan:', error);
      throw error;
    }
  }

  /**
   * Crear usuario explícitamente en el backend (POST)
   */
  async createUser(
    deviceId: string,
    userName: string,
    gender: string,
    language: string
  ): Promise<SubscriptionStatus> {
    try {
      console.log('[SubscriptionService] 📝 Creando usuario nuevo:', {
        deviceId,
        userName,
        gender,
        language
      });

      const token = await AuthService.getToken(deviceId);
      const response = await fetch('https://backend.movilive.es/api/subscription/create-user', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(token),
        body: JSON.stringify({
          deviceId: deviceId,
          user_name: userName,
          gender: gender,
          language: language,
          platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          console.log('[SubscriptionService] ℹ️ Usuario ya existe (409)');
          throw new Error('User already exists');
        }
        throw new Error(`Failed to create user: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SubscriptionService] ✅ Usuario creado:', data);

      const status: SubscriptionStatus = {
        tier: data.tier || 'free',
        creditsRemaining: data.credits_remaining ?? 12,
        creditsTotal: data.credits_total ?? 12,
        expiresAt: data.expires_at || null,
        isActive: data.is_active ?? true,
        userName: data.user_name,
        gender: data.gender,
        language: data.language,
        lastMode: data.last_mode || 'chat',
        hasPlan: data.tier !== 'free'
      };

      // Guardar en localStorage
      StorageService.saveSubscription(status);

      return status;
    } catch (error) {
      console.error('[SubscriptionService] ❌ Error creando usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario existente en el backend (PUT)
   */
  async updateUser(
    deviceId: string,
    userName: string,
    gender: string,
    language: string
  ): Promise<SubscriptionStatus> {
    try {
      console.log('[SubscriptionService] 📝 Actualizando usuario:', {
        deviceId,
        userName,
        gender,
        language
      });

      const token = await AuthService.getToken(deviceId);
      const response = await fetch('https://backend.movilive.es/api/subscription/update-user', {
        method: 'PUT',
        headers: AuthService.getAuthHeaders(token),
        body: JSON.stringify({
          deviceId: deviceId,
          user_name: userName,
          gender: gender,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SubscriptionService] ✅ Usuario actualizado:', data);

      const status: SubscriptionStatus = {
        tier: data.tier || 'free',
        creditsRemaining: data.credits_remaining ?? 12,
        creditsTotal: data.credits_total ?? 12,
        expiresAt: data.expires_at || null,
        isActive: data.is_active ?? true,
        userName: data.user_name,
        gender: data.gender,
        language: data.language,
        lastMode: data.last_mode || 'chat',
        hasPlan: data.tier !== 'free'
      };

      StorageService.saveSubscription(status);
      return status;
    } catch (error) {
      console.error('[SubscriptionService] ❌ Error actualizando usuario:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use createUser() instead
   */
  async saveUserData(
    deviceId: string,
    userName: string,
    gender: string,
    language: string
  ): Promise<boolean> {
    try {
      await this.createUser(deviceId, userName, gender, language);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener estado actual de suscripción (local + backend)
   */
  async getSubscriptionStatus(
    deviceId: string,
    userName?: string,
    gender?: string,
    language?: string
  ): Promise<SubscriptionStatus> {
    try {
      // Construir query params
      const params = new URLSearchParams({ deviceId });
      if (userName) params.append('user_name', userName);
      if (gender) params.append('gender', gender);
      if (language) params.append('language', language);

      const token = await AuthService.getToken(deviceId);
      const url = `https://backend.movilive.es/api/subscription/status?${params.toString()}`;

      console.log('[SubscriptionService] 📤 Enviando datos al backend:', {
        deviceId,
        user_name: userName,
        gender,
        language
      });

      // Primero intentar desde backend
      const response = await fetch(url, {
        method: 'GET',
        headers: AuthService.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[SubscriptionService] Response data:', data);

        const status: SubscriptionStatus = {
          tier: data.tier || 'free',
          creditsRemaining: data.credits_remaining ?? 0,
          creditsTotal: data.credits_total ?? 0,
          expiresAt: data.expires_at || null,
          isActive: data.is_active ?? true,
          userName: data.user_name,
          gender: data.gender,
          language: data.language,
          lastMode: data.last_mode || 'video-chat',
          hasPlan: !!data.tier && data.tier !== 'free'
        };

        console.log('[SubscriptionService] Mapped status:', status);

        // Guardar en localStorage
        StorageService.saveSubscription(status);
        return status;
      }
    } catch (error) {
      console.error('[Subscription] Error obteniendo status del backend:', error);
    }

    // Fallback: usar localStorage
    const localStatus = StorageService.getSubscription();
    if (localStatus) {
      return localStatus;
    }

    // Default: usuario free
    const defaultStatus: SubscriptionStatus = {
      tier: 'free',
      creditsRemaining: 12,
      creditsTotal: 12,
      expiresAt: null,
      isActive: true
    };
    
    StorageService.saveSubscription(defaultStatus);
    return defaultStatus;
  }

  /**
   * Consumir un crédito al enviar mensaje
   */
  async consumeCredit(deviceId: string, mode: 'chat' | 'audio' | 'video'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/subscriptions/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, mode })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Actualizar localStorage
        const status: SubscriptionStatus = {
          tier: data.tier,
          creditsRemaining: data.creditsRemaining,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          isActive: data.isActive
        };
        StorageService.saveSubscription(status);
        
        return true;
      } else if (response.status === 402) {
        // Sin créditos
        console.warn('[Subscription] Sin créditos disponibles');
        return false;
      }
    } catch (error) {
      console.error('[Subscription] Error consumiendo crédito:', error);
    }
    
    return false;
  }

  /**
   * Verificar si puede usar un modo específico
   */
  canUseMode(status: SubscriptionStatus, mode: 'chat' | 'audio' | 'video'): boolean {
    if (!status.isActive) return false;
    
    switch (mode) {
      case 'chat':
        return true; // Todos pueden usar chat
      case 'audio':
        return status.tier === 'basic' || status.tier === 'premium';
      case 'video':
        return status.tier === 'premium';
      default:
        return false;
    }
  }

  /**
   * Obtener productos disponibles para compra
   */
  async getAvailableProducts(deviceId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/subscriptions/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Subscription] Error obteniendo productos:', error);
    }
    
    return [];
  }

  /**
   * Validar recibo de compra (Google Play / App Store)
   */
  async validatePurchase(
    deviceId: string,
    platform: 'android' | 'ios',
    receipt: string,
    productId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/subscriptions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          platform,
          receipt,
          productId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Actualizar estado local
        const status: SubscriptionStatus = {
          tier: data.tier,
          creditsRemaining: data.creditsRemaining,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          isActive: true
        };
        StorageService.saveSubscription(status);
        
        return true;
      }
    } catch (error) {
      console.error('[Subscription] Error validando compra:', error);
    }
    
    return false;
  }

  /**
   * Cancelar suscripción
   */
  async cancelSubscription(deviceId: string): Promise<boolean> {
    try {
      const token = await AuthService.getToken(deviceId);
      const response = await fetch('https://backend.movilive.es/api/subscription/cancel', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(token),
        body: JSON.stringify({ device_id: deviceId })
      });

      return response.ok;
    } catch (error) {
      console.error('[Subscription] Error cancelando:', error);
      return false;
    }
  }

  /**
   * Formatear créditos para mostrar
   */
  formatCredits(credits: number): string {
    if (credits === -1) return '∞ Ilimitado';
    return `${credits} mensajes`;
  }

  /**
   * Formatear fecha de expiración
   */
  formatExpiration(date: Date | null, language: string = 'es'): string {
    if (!date) return '-';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options);
  }

  /**
   * Verificar si tiene créditos suficientes para un modo
   */
  async checkCredits(deviceId: string, mode: ConversationMode): Promise<CreditCheckResponse | null> {
    try {
      // Obtener datos del usuario desde StorageService
      const userData = StorageService.getUserData();

      console.log('[SubscriptionService.checkCredits] 👤 Datos de usuario:', userData);

      // VALIDAR que los datos sean válidos antes de usarlos
      const isValidUserData = userData &&
        userData.name &&
        userData.name.length > 1 &&
        userData.name.length < 50 &&
        !userData.name.match(/^[a-z]{6}$/) && // Detectar nombres aleatorios tipo "kxtyqh"
        (userData.gender === 'male' || userData.gender === 'female') &&
        userData.language;

      // Si no hay datos válidos, solo hacer verificación local sin llamar backend
      if (!isValidUserData) {
        console.log('[SubscriptionService.checkCredits] ⚠️ Sin datos de usuario válidos, verificación solo local');
        // Obtener suscripción desde localStorage
        const localSub = StorageService.getSubscription();
        const creditsNeeded = CREDITS_PER_MODE[mode];
        const hasCredits = localSub.creditsRemaining >= creditsNeeded;

        return {
          hasCredits,
          creditsNeeded,
          creditsRemaining: localSub.creditsRemaining,
          subscription: localSub
        };
      }

      // Solo llamar al backend si tenemos datos VÁLIDOS
      const subscription = await this.getSubscriptionStatus(
        deviceId,
        userData.name,
        userData.gender,
        userData.language
      );
      const creditsNeeded = CREDITS_PER_MODE[mode];
      const hasCredits = subscription.creditsRemaining >= creditsNeeded;

      console.log('[SubscriptionService] checkCredits:', {
        mode,
        creditsNeeded,
        creditsRemaining: subscription.creditsRemaining,
        creditsRemainingType: typeof subscription.creditsRemaining,
        comparison: `${subscription.creditsRemaining} >= ${creditsNeeded}`,
        hasCredits,
        rawSubscription: subscription
      });

      return {
        hasCredits,
        creditsRemaining: subscription.creditsRemaining,
        subscription
      };
    } catch (error) {
      console.error('[Subscription] Error verificando créditos:', error);
      return null;
    }
  }


  /**
   * Calcular cuántas preguntas puede hacer con créditos actuales
   */
  calculateQuestions(creditsRemaining: number, mode: ConversationMode): number {
    const creditsNeeded = CREDITS_PER_MODE[mode];
    return Math.floor(creditsRemaining / creditsNeeded);
  }

  /**
   * Actualizar último modo usado del usuario
   */
  async updateUserMode(deviceId: string, mode: ConversationMode): Promise<void> {
    try {
      console.log('[SubscriptionService] 🔄 Actualizando modo en backend:', { deviceId, mode });

      const token = await AuthService.getToken(deviceId);
      const response = await fetch('https://backend.movilive.es/api/subscription/update-mode', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(token),
        body: JSON.stringify({
          deviceId,
          last_mode: mode
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update mode: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SubscriptionService] ✅ Modo actualizado en backend:', data);
    } catch (error) {
      console.error('[SubscriptionService] ❌ Error al actualizar modo:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de conversaciones de los últimos N días
   */
  async getChatHistory(deviceId: string, days: number = 60): Promise<{
    success: boolean;
    messages: Array<{
      user_message: string;
      assistant_message: string;
      mode: string;
      created_at: string;
    }>;
    count: number;
  } | null> {
    try {
      const token = await AuthService.getToken(deviceId);
      const url = `${this.baseUrl}/api/subscription/chat-history?deviceId=${deviceId}&days=${days}`;
      console.log('[SubscriptionService] 📜 Cargando historial de chat (endpoint correcto):', { deviceId, days, url });

      const response = await fetch(url, {
        method: 'GET',
        headers: AuthService.getAuthHeaders(token)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[SubscriptionService] ✅ Historial cargado:', {
          count: data.count,
          messages: data.messages?.length,
          rawData: data
        });
        console.log('[SubscriptionService] 🔍 Primeros 3 mensajes:', data.messages?.slice(0, 3));
        return data;
      }

      console.warn('[SubscriptionService] ⚠️ No se pudo cargar historial:', response.status);
      return null;
    } catch (error) {
      console.error('[SubscriptionService] ❌ Error cargando historial:', error);
      return null;
    }
  }

}