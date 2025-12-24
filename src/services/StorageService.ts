import type { Language, UserData, LegalConsent, SubscriptionStatus } from './types';

const STORAGE_KEYS = {
  LANGUAGE: 'jesus_lang',
  NAME: 'jesus_name',
  GENDER: 'jesus_gender',
  DEVICE_ID: 'jesus_device_id',
  LEGAL_CONSENT: 'jesus_legal_consent',
  SUBSCRIPTION: 'jesus_subscription',
  LAST_MODE: 'jesus_last_mode',
} as const;

export class StorageService {
  static getUserData(): UserData | null {
    try {
      const language = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language | null;
      const name = localStorage.getItem(STORAGE_KEYS.NAME);
      const gender = localStorage.getItem(STORAGE_KEYS.GENDER) as "male" | "female" | null;

      // Validar que los datos sean válidos
      if (language && name && gender) {
        // Detectar nombres corruptos (6 letras minúsculas aleatorias)
        const isCorruptedName = name.match(/^[a-z]{6}$/);

        if (isCorruptedName) {
          console.warn('[Storage] ⚠️ Datos corruptos detectados, limpiando...', { name, gender, language });
          this.clearUserData();
          return null;
        }

        // Validar que el nombre tenga longitud razonable
        if (name.length < 2 || name.length > 50) {
          console.warn('[Storage] ⚠️ Nombre con longitud inválida, limpiando...', { name });
          this.clearUserData();
          return null;
        }

        return { language, name, gender };
      }
      return null;
    } catch (error) {
      console.error('[Storage] Error leyendo datos:', error);
      return null;
    }
  }

  static saveUserData(userData: Omit<UserData, 'deviceId'>): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, userData.language);
      localStorage.setItem(STORAGE_KEYS.NAME, userData.name);
      localStorage.setItem(STORAGE_KEYS.GENDER, userData.gender);

      console.log('[Storage] ✅ Datos guardados');
      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error guardando:', error);
      return false;
    }
  }

  static clearUserData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.LANGUAGE);
      localStorage.removeItem(STORAGE_KEYS.NAME);
      localStorage.removeItem(STORAGE_KEYS.GENDER);
      localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
      console.log('[Storage] ✅ Sesión cerrada');
    } catch (error) {
      console.error('[Storage] Error limpiando:', error);
    }
  }


  static isUserConfigured(): boolean {
    return this.getUserData() !== null;
  }

  static saveLegalConsent(consent: LegalConsent): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LEGAL_CONSENT, JSON.stringify(consent));
      console.log('[Storage] ✅ Consentimiento legal guardado');
    } catch (error) {
      console.error('[Storage] Error guardando consentimiento:', error);
    }
  }

  static getLegalConsent(): LegalConsent | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEGAL_CONSENT);
      if (!data) return null;
      
      const consent = JSON.parse(data);
      return {
        ...consent,
        timestamp: new Date(consent.timestamp)
      };
    } catch {
      return null;
    }
  }

  static hasAcceptedLegalTerms(requiredVersion: string = "1.0"): boolean {
    const consent = this.getLegalConsent();
    return consent !== null && 
           consent.termsAccepted && 
           consent.privacyAccepted &&
           consent.version === requiredVersion;
  }

  static saveSubscription(status: SubscriptionStatus): void {
    try {
      const data = {
        ...status,
        expiresAt: status.expiresAt?.toISOString() || null
      };
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(data));
      console.log('[Storage] ✅ Suscripción actualizada');
    } catch (error) {
      console.error('[Storage] Error guardando suscripción:', error);
    }
  }

  static getSubscription(): SubscriptionStatus | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (!data) return null;

      const sub = JSON.parse(data);
      return {
        ...sub,
        expiresAt: sub.expiresAt ? new Date(sub.expiresAt) : null
      };
    } catch {
      return null;
    }
  }

  static clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      localStorage.removeItem('jesus_avatar_user_data');
      localStorage.removeItem('jesus_avatar_consent');
      localStorage.removeItem('jesus_device_id_v2');
      console.log('[Storage] ✅ Todo limpiado');
    } catch (error) {
      console.error('[Storage] Error limpiando todo:', error);
    }
  }

  static saveLastMode(mode: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_MODE, mode);
      console.log('[Storage] ✅ Último modo guardado:', mode);
    } catch (error) {
      console.error('[Storage] Error guardando modo:', error);
    }
  }

  static getLastMode(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_MODE);
    } catch {
      return null;
    }
  }
}