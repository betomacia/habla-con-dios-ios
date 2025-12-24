import { useState, useEffect, useCallback, useRef } from 'react';
import { SubscriptionService } from '../services/SubscriptionService';
import { StorageService } from '../services/StorageService';
import type { SubscriptionStatus, ConversationMode } from '../services/types';

export function useCredits(deviceId: string, backendUrl: string) {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    tier: 'free',
    creditsRemaining: 12, // Free: 12 créditos = 3 preguntas con Jesús
    creditsTotal: 12,
    expiresAt: null,
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flag para saber si ya se sincronizó con backend en esta sesión
  const hasSyncedRef = useRef(false);

  const service = new SubscriptionService(backendUrl);

  // Cargar estado de suscripción al montar
  const loadSubscription = useCallback(async () => {
    // ⚠️ NO llamar al backend si deviceId está vacío
    if (!deviceId || deviceId === '') {
      console.log('[useCredits] ⏳ Esperando deviceId...');
      setLoading(false);
      return;
    }

    // Obtener datos del usuario desde StorageService
    const userData = StorageService.getUserData();

    // ⚠️ NO llamar al backend si NO hay datos de usuario aún (usuario nuevo)
    if (!userData) {
      console.log('[useCredits] ⏸️ Usuario nuevo sin datos, usando valores por defecto (no llamar backend)');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useCredits] ✅ DeviceId y datos de usuario listos, cargando suscripción...', deviceId);
      console.log('[useCredits] 👤 Datos de usuario:', userData);

      const status = await service.getSubscriptionStatus(
        deviceId,
        userData.name,
        userData.gender,
        userData.language
      );

      if (status) {
        setSubscription(status);
        console.log('[useCredits] ✅ Suscripción cargada:', status);
      } else {
        console.warn('[useCredits] ⚠️ No se pudo cargar suscripción, usando valores por defecto');
      }
    } catch (err) {
      console.error('[useCredits] ❌ Error cargando suscripción:', err);
      setError('Error cargando tu suscripción');
    } finally {
      setLoading(false);
    }
  }, [deviceId, backendUrl]);

  // ❌ ELIMINADO: NO cargar automáticamente al montar
  // El backend solo se llama cuando:
  // 1. Usuario nuevo completa formulario → App.tsx llama reloadSubscription()
  // 2. Usuario recurrente hace primera acción → canAsk() llama internamente
  // 3. Usuario abre panel de suscripción explícitamente

  // ✅ Cargar datos LOCALES al montar (sin llamar backend)
  useEffect(() => {
    const localSub = StorageService.getSubscription();
    if (localSub) {
      setSubscription(localSub);
    }
    setLoading(false);
    console.log('[useCredits] 📂 Datos locales cargados (sin backend):', localSub);
  }, []);

  // Verificar si puede hacer una pregunta en el modo actual
  const canAsk = useCallback(
    async (mode: ConversationMode): Promise<boolean> => {
      try {
        console.log('[useCredits] canAsk called for mode:', mode);

        // ✅ Sincronizar con backend la PRIMERA vez que se llama (lazy loading)
        if (!hasSyncedRef.current) {
          console.log('[useCredits] 🔄 Primera acción del usuario, sincronizando con backend...');
          await loadSubscription();
          hasSyncedRef.current = true;
        }

        const check = await service.checkCredits(deviceId, mode);

        console.log('[useCredits] checkCredits result:', check);

        if (check) {
          console.log('[useCredits] hasCredits:', check.hasCredits);
          return check.hasCredits;
        }

        console.warn('[useCredits] No check result returned');
        return false;
      } catch (err) {
        console.error('[useCredits] Error verificando créditos:', err);
        return false;
      }
    },
    [deviceId, service, loadSubscription]
  );


  // Actualizar suscripción (después de compra)
  const updateSubscription = useCallback((newSubscription: SubscriptionStatus) => {
    console.log('[useCredits] 🔄 Actualización de suscripción recibida:', newSubscription);
    setSubscription(prevSub => {
      console.log('[useCredits] 📊 Créditos antes:', prevSub.creditsRemaining, 'después:', newSubscription.creditsRemaining);
      return { ...newSubscription };
    });
  }, []);

  // Calcular cuántas preguntas puede hacer con créditos actuales
  const questionsRemaining = useCallback(
    (mode: ConversationMode): number => {
      return service.calculateQuestions(subscription.creditsRemaining, mode);
    },
    [subscription.creditsRemaining, service]
  );

  // Verificar si tiene créditos
  const hasCredits = subscription.creditsRemaining > 0;

  // Verificar si está en plan free sin créditos
  const needsSubscription = subscription.tier === 'free' && subscription.creditsRemaining <= 0;


  return {
    subscription,
    loading,
    error,
    hasCredits,
    needsSubscription,
    canAsk,
    updateSubscription,
    questionsRemaining,
    reload: loadSubscription,
  };
}