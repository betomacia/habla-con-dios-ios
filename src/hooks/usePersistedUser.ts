import { useState, useEffect } from 'react';
import type { Language } from '../App';
import type { ConversationMode } from '../services/types';
import { deviceService } from '../services/DeviceService';
import { StorageService } from '../services/StorageService';
import { SubscriptionService } from '../services/SubscriptionService';

const STORAGE_KEY = 'jesus_avatar_user_data';
const CONSENT_KEY = 'jesus_avatar_consent';
const MODE_KEY = 'jesus_avatar_last_mode';

export interface UserData {
  name: string;
  gender: 'male' | 'female';
  language: Language;
}

interface ConsentData {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
}

export function usePersistedUser() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [consent, setConsent] = useState<ConsentData>({
    termsAccepted: false,
    privacyAccepted: false,
  });
  const [lastMode, setLastMode] = useState<ConversationMode | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceIdLoaded, setDeviceIdLoaded] = useState(false);

  // Inicializar deviceId
  useEffect(() => {
    const initDeviceId = async () => {
      try {
        console.log('[usePersistedUser] 🔄 Iniciando obtención de deviceId...');
        const id = await deviceService.getDeviceId();

        console.log('[usePersistedUser] 📱 DeviceId obtenido:', {
          deviceId: id,
          length: id.length,
          hasPrefix: id.startsWith('ios-') || id.startsWith('android-') || id.startsWith('web-'),
          platform: id.split('-')[0]
        });

        if (!id || id.trim() === '') {
          console.error('[usePersistedUser] ❌ CRÍTICO: DeviceId está vacío después de obtenerlo');
          throw new Error('DeviceId vacío');
        }

        setDeviceId(id);
        setDeviceIdLoaded(true);
        console.log('[usePersistedUser] ✅ DeviceId inicializado correctamente:', id);

        // Cargar último modo SOLO desde localStorage (sin llamar al backend)
        const storedMode = localStorage.getItem(MODE_KEY);
        if (storedMode) {
          setLastMode(storedMode as ConversationMode);
          console.log('[usePersistedUser] ✅ Último modo cargado desde localStorage:', storedMode);
        } else {
          console.log('[usePersistedUser] ℹ️ No hay modo guardado en localStorage');
        }
      } catch (error) {
        console.error('[usePersistedUser] ❌ Error inicializando deviceId:', error);
        console.error('[usePersistedUser] ❌ Stack:', error instanceof Error ? error.stack : 'No stack trace');
        setDeviceIdLoaded(true); // Marcar como cargado aunque haya error para no bloquear la app
      }
    };
    initDeviceId();
  }, []);

  // Cargar datos al iniciar
  useEffect(() => {
    try {
      // Cargar datos de usuario
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);

        // Validar que los datos no estén corruptos
        const isCorruptedName = parsed.name && parsed.name.match(/^[a-z]{6}$/);
        const isInvalidLength = parsed.name && (parsed.name.length < 2 || parsed.name.length > 50);

        if (isCorruptedName || isInvalidLength) {
          console.warn('[Storage] ⚠️ Datos corruptos detectados, limpiando...', parsed);
          localStorage.removeItem(STORAGE_KEY);
          StorageService.clearUserData();
          setUserData(null);
        } else {
          setUserData(parsed);
          console.log('[Storage] ✅ Datos de usuario cargados:', parsed);
        }
      }

      // Cargar consentimientos
      const storedConsent = localStorage.getItem(CONSENT_KEY);
      if (storedConsent) {
        const parsed = JSON.parse(storedConsent);
        setConsent(parsed);
        console.log('[Storage] ✅ Consentimientos cargados:', parsed);
      }

      // NOTA: lastMode se carga desde localStorage en el primer useEffect
    } catch (error) {
      console.error('[Storage] ❌ Error cargando datos:', error);
    }
  }, []);

  // Guardar usuario
  const saveUser = (data: UserData): boolean => {
    try {
      // Guardar en formato antiguo (compatibilidad)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Guardar en formato nuevo usando StorageService
      StorageService.saveUserData(data);

      setUserData(data);
      console.log('[Storage] ✅ Usuario guardado en ambos formatos:', data);
      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error guardando usuario:', error);
      return false;
    }
  };

  // Aceptar términos
  const acceptTerms = (): boolean => {
    try {
      const newConsent = {
        ...consent,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);
      console.log('[Storage] ✅ Términos aceptados');
      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error guardando términos:', error);
      return false;
    }
  };

  // Aceptar privacidad
  const acceptPrivacy = (): boolean => {
    try {
      const newConsent = {
        ...consent,
        privacyAccepted: true,
        privacyAcceptedAt: new Date().toISOString(),
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);
      console.log('[Storage] ✅ Privacidad aceptada');
      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error guardando privacidad:', error);
      return false;
    }
  };

  // Guardar último modo usado
  const saveLastMode = (mode: ConversationMode): boolean => {
    try {
      localStorage.setItem(MODE_KEY, mode);
      setLastMode(mode);
      console.log('[Storage] ✅ Modo guardado:', mode);
      return true;
    } catch (error) {
      console.error('[Storage] ❌ Error guardando modo:', error);
      return false;
    }
  };

  // Logout (borrar todo)
  const logout = (): void => {
    try {
      // Limpiar formato antiguo
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(MODE_KEY);

      // Limpiar formato nuevo usando StorageService
      StorageService.clearUserData();

      setUserData(null);
      setConsent({
        termsAccepted: false,
        privacyAccepted: false,
      });
      setLastMode(null);
      console.log('[Storage] ✅ Logout completado en ambos formatos');
    } catch (error) {
      console.error('[Storage] ❌ Error en logout:', error);
    }
  };

  return {
    userData,
    isConfigured: !!userData,
    hasAcceptedTerms: consent.termsAccepted,
    hasAcceptedPrivacy: consent.privacyAccepted,
    lastMode,
    acceptTerms,
    acceptPrivacy,
    saveUser,
    saveLastMode,
    logout,
    deviceId,
    deviceIdLoaded,
  };
}