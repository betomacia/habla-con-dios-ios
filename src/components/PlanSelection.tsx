import React, { useState, useEffect } from 'react';
import { Check, Crown, Sparkles, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import type { Language } from '../App';
import type { SubscriptionTier, SubscriptionPlan } from '../services/types';
import { BillingService } from '../services/BillingService';
import { PricingService } from '../services/PricingService';
import { StorageService } from '../services/StorageService';
import { LoggerService } from '../services/LoggerService';
import { DebugLogger } from '../services/DebugLogger';

const I18N = {
  title: {
    es: 'Elige tu Plan',
    en: 'Choose Your Plan',
    pt: 'Escolha seu Plano',
    it: 'Scegli il tuo Piano',
    de: 'Wähle deinen Plan',
    fr: 'Choisis ton Plan',
  },
  subtitle: {
    es: 'Comienza gratis o elige un plan mensual',
    en: 'Start free or choose a monthly plan',
    pt: 'Comece grátis ou escolha um plano mensal',
    it: 'Inizia gratis o scegli un piano mensile',
    de: 'Starte kostenlos oder wähle einen monatlichen Plan',
    fr: 'Commence gratuitement ou choisis un plan mensuel',
  },
  creditsExhausted: {
    es: 'Tus créditos gratuitos se han agotado. Elige un plan para continuar.',
    en: 'Your free credits have been exhausted. Choose a plan to continue.',
    pt: 'Seus créditos gratuitos se esgotaram. Escolha um plano para continuar.',
    it: 'I tuoi crediti gratuiti sono esauriti. Scegli un piano per continuare.',
    de: 'Deine kostenlosen Credits sind aufgebraucht. Wähle einen Plan, um fortzufahren.',
    fr: 'Vos crédits gratuits sont épuisés. Choisissez un plan pour continuer.',
  },
  continue: {
    es: 'Continuar',
    en: 'Continue',
    pt: 'Continuar',
    it: 'Continua',
    de: 'Weiter',
    fr: 'Continuer',
  },
  cancel: {
    es: 'Volver',
    en: 'Back',
    pt: 'Voltar',
    it: 'Indietro',
    de: 'Zurück',
    fr: 'Retour',
  },
  processing: {
    es: 'Procesando...',
    en: 'Processing...',
    pt: 'Processando...',
    it: 'Elaborazione...',
    de: 'Verarbeitung...',
    fr: 'Traitement...',
  },
  creditsCost: {
    es: 'Costo por modo:',
    en: 'Cost per mode:',
    pt: 'Custo por modo:',
    it: 'Costo per modalità:',
    de: 'Kosten pro Modus:',
    fr: 'Coût par mode:',
  },
  credits: {
    es: 'créditos',
    en: 'credits',
    pt: 'créditos',
    it: 'crediti',
    de: 'Credits',
    fr: 'crédits',
  },
  perMonth: {
    es: '/mes',
    en: '/month',
    pt: '/mês',
    it: '/mese',
    de: '/Monat',
    fr: '/mois',
  },
  free: {
    es: 'Gratis',
    en: 'Free',
    pt: 'Grátis',
    it: 'Gratis',
    de: 'Kostenlos',
    fr: 'Gratuit',
  },
  loadingPrices: {
    es: 'Cargando precios...',
    en: 'Loading prices...',
    pt: 'Carregando preços...',
    it: 'Caricamento prezzi...',
    de: 'Preise werden geladen...',
    fr: 'Chargement des prix...',
  },
  popular: {
    es: 'POPULAR',
    en: 'POPULAR',
    pt: 'POPULAR',
    it: 'POPOLARE',
    de: 'BELIEBT',
    fr: 'POPULAIRE',
  },
  planNames: {
    free: {
      es: 'Gratis',
      en: 'Free',
      pt: 'Grátis',
      it: 'Gratis',
      de: 'Kostenlos',
      fr: 'Gratuit',
    },
    basic: {
      es: 'Básico',
      en: 'Basic',
      pt: 'Básico',
      it: 'Base',
      de: 'Basis',
      fr: 'Basique',
    },
    standard: {
      es: 'Estándar',
      en: 'Standard',
      pt: 'Padrão',
      it: 'Standard',
      de: 'Standard',
      fr: 'Standard',
    },
    premium: {
      es: 'Premium',
      en: 'Premium',
      pt: 'Premium',
      it: 'Premium',
      de: 'Premium',
      fr: 'Premium',
    },
  },
  modes: {
    chatOnly: {
      es: 'Chat solo',
      en: 'Chat only',
      pt: 'Apenas chat',
      it: 'Solo chat',
      de: 'Nur Chat',
      fr: 'Chat seulement',
    },
    chatVoice: {
      es: 'Chat + Voz',
      en: 'Chat + Voice',
      pt: 'Chat + Voz',
      it: 'Chat + Voce',
      de: 'Chat + Stimme',
      fr: 'Chat + Voix',
    },
    jesus: {
      es: 'Jesús',
      en: 'Jesus',
      pt: 'Jesus',
      it: 'Gesù',
      de: 'Jesus',
      fr: 'Jésus',
    },
    jesusChat: {
      es: 'Jesús + Chat',
      en: 'Jesus + Chat',
      pt: 'Jesus + Chat',
      it: 'Gesù + Chat',
      de: 'Jesus + Chat',
      fr: 'Jésus + Chat',
    },
  },
  features: {
    free: {
      es: ['3 preguntas con Jesús + Chat', 'Una sola vez por dispositivo'],
      en: ['3 questions with Jesus + Chat', 'One time per device'],
      pt: ['3 perguntas com Jesus + Chat', 'Uma vez por dispositivo'],
      it: ['3 domande con Gesù + Chat', 'Una volta per dispositivo'],
      de: ['3 Fragen mit Jesus + Chat', 'Einmal pro Gerät'],
      fr: ['3 questions avec Jésus + Chat', 'Une fois par appareil'],
    },
    basic: {
      es: ['Créditos mensuales', 'Todos los modos', 'Renovación automática'],
      en: ['Monthly credits', 'All modes', 'Auto-renewal'],
      pt: ['Créditos mensais', 'Todos os modos', 'Renovação automática'],
      it: ['Crediti mensili', 'Tutte le modalità', 'Rinnovo automatico'],
      de: ['Monatliche Credits', 'Alle Modi', 'Automatische Verlängerung'],
      fr: ['Crédits mensuels', 'Tous les modes', 'Renouvellement automatique'],
    },
    standard: {
      es: ['Créditos mensuales', 'Todos los modos', 'Renovación automática'],
      en: ['Monthly credits', 'All modes', 'Auto-renewal'],
      pt: ['Créditos mensais', 'Todos os modos', 'Renovação automática'],
      it: ['Crediti mensili', 'Tutte le modalità', 'Rinnovo automatico'],
      de: ['Monatliche Credits', 'Alle Modi', 'Automatische Verlängerung'],
      fr: ['Crédits mensuels', 'Tous les modes', 'Renouvellement automatique'],
    },
    premium: {
      es: ['Créditos mensuales', 'Todos los modos', 'Renovación automática', 'Soporte prioritario'],
      en: ['Monthly credits', 'All modes', 'Auto-renewal', 'Priority support'],
      pt: ['Créditos mensais', 'Todos os modos', 'Renovação automática', 'Suporte prioritário'],
      it: ['Crediti mensili', 'Tutte le modalità', 'Rinnovo automatico', 'Supporto prioritario'],
      de: ['Monatliche Credits', 'Alle Modi', 'Automatische Verlängerung', 'Prioritäts-Support'],
      fr: ['Crédits mensuels', 'Tous les modes', 'Renouvellement automatique', 'Support prioritaire'],
    },
  },
  extraCredits: {
    title: {
      es: 'Créditos Extra',
      en: 'Extra Credits',
      pt: 'Créditos Extras',
      it: 'Crediti Extra',
      de: 'Extra Credits',
      fr: 'Crédits Supplémentaires',
    },
    oneTime: {
      es: 'Pago único',
      en: 'One-time payment',
      pt: 'Pagamento único',
      it: 'Pagamento unico',
      de: 'Einmalige Zahlung',
      fr: 'Paiement unique',
    },
    noExpiration: {
      es: 'Sin vencimiento',
      en: 'No expiration',
      pt: 'Sem vencimento',
      it: 'Senza scadenza',
      de: 'Kein Ablauf',
      fr: 'Sans expiration',
    },
    creditsLabel: {
      es: 'créditos adicionales',
      en: 'additional credits',
      pt: 'créditos adicionais',
      it: 'crediti aggiuntivi',
      de: 'zusätzliche Credits',
      fr: 'crédits supplémentaires',
    },
    features: {
      es: ['Sin vencimiento', 'Pago único', 'Se suman a tu plan actual'],
      en: ['No expiration', 'One-time payment', 'Added to your current plan'],
      pt: ['Sem vencimento', 'Pagamento único', 'Adicionados ao seu plano atual'],
      it: ['Senza scadenza', 'Pagamento unico', 'Aggiunti al tuo piano attuale'],
      de: ['Kein Ablauf', 'Einmalige Zahlung', 'Zu Ihrem aktuellen Plan hinzugefügt'],
      fr: ['Sans expiration', 'Paiement unique', 'Ajoutés à votre plan actuel'],
    },
  },
};

interface PlanSelectionProps {
  language: Language;
  onSelectPlan: (tier: SubscriptionTier) => void;
  backendUrl: string;
  deviceId: string;
  currentTier?: string;
  creditsRemaining?: number;
  onCancel?: () => void;
}

export default function PlanSelection({ language, onSelectPlan, backendUrl, deviceId, currentTier, creditsRemaining, onCancel }: PlanSelectionProps) {
  // Determinar si el plan FREE debe ocultarse
  // Ocultar FREE solo si tiene un plan de pago (basic, standard, premium) O si es free pero sin créditos
  const shouldHideFreePlan = currentTier && currentTier !== 'free' || (currentTier === 'free' && creditsRemaining !== undefined && creditsRemaining <= 0);

  // Determinar selección inicial según el tier actual
  const getInitialSelection = (): { tier: SubscriptionTier, isExtraCredits: boolean } => {
    if (currentTier === 'premium') {
      // Usuario Premium: solo puede comprar créditos extra
      return { tier: 'premium', isExtraCredits: true };
    } else if (currentTier === 'standard') {
      // Usuario Standard: sugerir upgrade a Premium
      return { tier: 'premium', isExtraCredits: false };
    } else if (currentTier === 'basic') {
      // Usuario Basic: sugerir upgrade a Standard
      return { tier: 'standard', isExtraCredits: false };
    } else if (shouldHideFreePlan) {
      // Usuario free sin créditos: sugerir Basic
      return { tier: 'basic', isExtraCredits: false };
    } else {
      // Usuario free con créditos
      return { tier: 'free', isExtraCredits: false };
    }
  };

  const initialSelection = getInitialSelection();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(initialSelection.tier);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [iapProducts, setIapProducts] = useState<any[]>([]);
  const [isExtraCreditsSelected, setIsExtraCreditsSelected] = useState(initialSelection.isExtraCredits);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<Array<{ timestamp: string; message: string; data?: any }>>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogsList, setDebugLogsList] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = DebugLogger.subscribe(setDebugLogsList);
    return unsubscribe;
  }, []);

  const handleTitleClick = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 5) {
      setShowDebug(true);
      setTapCount(0);
    }

    setTimeout(() => {
      setTapCount(0);
    }, 2000);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

  // Filtrar planes según el tier actual del usuario
  const getAvailablePlans = () => {
    if (!currentTier) return iapProducts; // Usuario nuevo, mostrar todos

    // Filtrar planes superiores al actual
    const tierOrder = ['free', 'basic', 'standard', 'premium'];
    const currentIndex = tierOrder.indexOf(currentTier);

    return iapProducts.filter(product => {
      const productIndex = tierOrder.indexOf(product.tier);
      return productIndex > currentIndex;
    });
  };

  const availablePlans = getAvailablePlans();
  const extraCreditsProduct = iapProducts.find(p => p.tier === 'extra');

  // Solo auto-seleccionar si el plan FREE está oculto Y el plan seleccionado no está visible
  useEffect(() => {
    if (shouldHideFreePlan && availablePlans.length > 0) {
      const selectedIsVisible = availablePlans.some(p => p.tier === selectedTier);
      if (!selectedIsVisible && !isExtraCreditsSelected) {
        setSelectedTier(availablePlans[0].tier);
      }
    }
  }, [shouldHideFreePlan, availablePlans, selectedTier, isExtraCreditsSelected]);

  // Inicializar BillingService solo cuando se monta PlanSelection
  useEffect(() => {
    const initBilling = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        await BillingService.initialize();
      } catch (e) {
        // Error inicializando Billing
      }
    };

    initBilling();
  }, []);

  // Cargar productos IAP al montar
  useEffect(() => {
    loadIAPProducts();
  }, [language]);

  async function loadIAPProducts() {
    setLoadingPrices(true);

    try {
      const pricingService = new PricingService(backendUrl);
      const pricingData = await pricingService.loadPrices();

      if (pricingData && pricingData.products) {
        const products = pricingData.products.map(product => ({
          product_id: product.product_id,
          tier: product.tier,
          name: product.name,
          price: product.price.toString(),
          credits: product.credits
        }));

        setIapProducts(products as any);
      } else {
        const products = [
          { product_id: 'plan_basic', tier: 'basic', name: 'Basic', price: '4.99', credits: 300 },
          { product_id: 'plan_standard', tier: 'standard', name: 'Standard', price: '9.99', credits: 600 },
          { product_id: 'premium_plan', tier: 'premium', name: 'Premium', price: '19.99', credits: 1200 }
        ];
        setIapProducts(products as any);
      }
    } catch (error) {
      const products = [
        { product_id: 'plan_basic', tier: 'basic', name: 'Basic', price: '4.99', credits: 300 },
        { product_id: 'plan_standard', tier: 'standard', name: 'Standard', price: '9.99', credits: 600 },
        { product_id: 'premium_plan', tier: 'premium', name: 'Premium', price: '19.99', credits: 1200 }
      ];
      setIapProducts(products as any);
    } finally {
      setLoadingPrices(false);
    }
  }

  async function handlePurchase(tier: SubscriptionTier) {
    DebugLogger.log('PURCHASE START', { tier, deviceId, purchasing });

    if (purchasing) {
      DebugLogger.log('PURCHASE BLOCKED - already purchasing');
      return;
    }
    if (tier === 'free') {
      DebugLogger.log('PURCHASE BLOCKED - free tier');
      return;
    }

    setPurchasing(true);

    try {
      const productIds: Record<string, string> = {
        'basic': 'plan_basic',
        'standard': 'plan_standard',
        'premium': 'premium_plan'
      };

      const productId = productIds[tier];
      DebugLogger.log('PURCHASE - calling BillingService', { productId, tier });

      if (!productId) {
        DebugLogger.log('PURCHASE ERROR - no productId');
        setPurchasing(false);
        return;
      }

      const result = await BillingService.purchaseSubscription(productId, deviceId);
      DebugLogger.log('PURCHASE RESULT', result);

      if (result.success) {
        setPurchaseSuccess(true);
        console.log('[PlanSelection] ✅ Compra exitosa, verificando last_mode...');

        // Recargar datos de suscripción
        const newData = await BillingService.refreshSubscriptionData(deviceId);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verificar el modo guardado para navegar correctamente
        const savedMode = StorageService.getLastMode() || 'chat';
        console.log('[PlanSelection] 🎯 Modo guardado:', savedMode);

        // Llamar al onCancel que manejará la navegación según el modo
        if (onCancel) {
          onCancel();
        }
      }
    } catch (error: any) {
      DebugLogger.log('PURCHASE ERROR', { message: error.message, stack: error.stack });
    } finally {
      setPurchasing(false);
    }
  }


  return (
    <div
      className="fixed inset-0"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'auto',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      <style>{`
        .plan-selection-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center p-4 py-8 plan-selection-container" style={{ paddingTop: 'clamp(80px, 15vh, 120px)' }}>
        <div className="w-full max-w-6xl bg-black/60 backdrop-blur-sm rounded-3xl p-6">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1
              onClick={handleTitleClick}
              className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg flex items-center justify-center gap-3 cursor-pointer select-none"
            >
              <Crown className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" />
              {I18N.title[language]}
            </h1>
            <p className="text-base md:text-lg text-white drop-shadow">
              {currentTier === 'free' && (creditsRemaining ?? 0) <= 0
                ? I18N.creditsExhausted[language]
                : I18N.subtitle[language]}
            </p>
          </div>

          {/* Plans Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${shouldHideFreePlan ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 mb-4`}>
            {/* Plan FREE - Ocultar si se agotaron los créditos */}
            {!shouldHideFreePlan && (
              <button
                onClick={() => {
                  setSelectedTier('free');
                  setIsExtraCreditsSelected(false);
                }}
                className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                  selectedTier === 'free'
                    ? 'border-blue-500 bg-blue-600/30 scale-105 shadow-2xl'
                    : 'border-white/30 bg-black/80 hover:bg-black/90'
                }`}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg z-20">
                  {I18N.free[language].toUpperCase()}
                </div>

                <div className="mb-3 mt-2">
                  <h3 className="text-lg font-bold text-white mb-1">{I18N.planNames.free[language]}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-blue-400">{I18N.free[language]}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xl font-bold text-blue-400">
                    12 {I18N.credits[language]}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm text-white/80">
                  {I18N.features.free[language].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {selectedTier === 'free' && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-blue-500 pointer-events-none shadow-xl shadow-blue-500/50" />
                )}
              </button>
            )}

            {/* Planes de pago desde IAP - Filtrados según tier actual */}
            {availablePlans.map((product) => {
              const isSelected = selectedTier === product.tier;
              const features = I18N.features[product.tier as keyof typeof I18N.features]?.[language] || [];

              return (
                <button
                  key={product.product_id}
                  onClick={() => {
                    setSelectedTier(product.tier);
                    setIsExtraCreditsSelected(false);
                  }}
                  className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600/30 scale-105 shadow-2xl'
                      : 'border-white/30 bg-black/80 hover:bg-black/90'
                  }`}
                >
                  {product.tier === 'standard' && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg z-20">
                      {I18N.popular[language]}
                    </div>
                  )}

                  <div className="mb-3 mt-2">
                    <h3 className="text-lg font-bold text-white mb-1">{I18N.planNames[product.tier as keyof typeof I18N.planNames]?.[language] || product.name}</h3>
                    <div className="flex items-baseline gap-1">
                      {loadingPrices ? (
                        <span className="text-2xl font-bold text-white/50">{I18N.loadingPrices[language]}</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold text-white">
                            ${product.price}
                          </span>
                          <span className="text-white/70 text-sm">{I18N.perMonth[language]}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xl font-bold text-blue-400">
                      {product.credits} {I18N.credits[language]}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-sm text-white/80">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isSelected && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-blue-500 pointer-events-none shadow-xl shadow-blue-500/50" />
                  )}
                </button>
              );
            })}

            {/* Opción de Créditos Extra - Solo para usuarios Premium */}
            {currentTier === 'premium' && (
              <button
                onClick={() => {
                  setIsExtraCreditsSelected(true);
                  setSelectedTier('premium'); // Mantener tier para no interferir
                }}
                className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                  isExtraCreditsSelected
                    ? 'border-purple-500 bg-purple-600/30 scale-105 shadow-2xl'
                    : 'border-purple-500 bg-gradient-to-br from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40'
                }`}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg z-20">
                  <Crown className="w-4 h-4 inline mr-1" />
                  {I18N.extraCredits.title[language].toUpperCase()}
                </div>

                <div className="mb-3 mt-2">
                  <h3 className="text-lg font-bold text-white mb-1">{I18N.extraCredits.title[language]}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">${extraCreditsProduct?.price || '29.99'}</span>
                    <span className="text-white/70 text-sm">{I18N.extraCredits.oneTime[language]}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xl font-bold text-purple-400">
                    {extraCreditsProduct?.credits || 900} {I18N.credits[language]}
                  </p>
                  <p className="text-sm text-purple-300">{I18N.extraCredits.noExpiration[language]}</p>
                </div>

                <div className="space-y-1.5 text-sm text-white/80">
                  {[`${extraCreditsProduct?.credits || 900} ${I18N.extraCredits.creditsLabel[language]}`, ...I18N.extraCredits.features[language]].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {isExtraCreditsSelected && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-purple-500 pointer-events-none shadow-xl shadow-purple-500/50" />
                )}
              </button>
            )}
          </div>

          {/* Info de costos */}
          <div className="mb-4 p-3 bg-black/90 backdrop-blur-md rounded-xl border border-white/30">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              {I18N.creditsCost[language]}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="text-center bg-white/10 rounded-lg p-2">
                <p className="text-white/70 mb-1 text-xs">{I18N.modes.chatOnly[language]}</p>
                <p className="font-bold text-white">1 {I18N.credits[language]}</p>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-2">
                <p className="text-white/70 mb-1 text-xs">{I18N.modes.chatVoice[language]}</p>
                <p className="font-bold text-white">2 {I18N.credits[language]}</p>
              </div>
              <div className="text-center bg-blue-500/20 rounded-lg p-2">
                <p className="text-white/70 mb-1 text-xs">{I18N.modes.jesus[language]}</p>
                <p className="font-bold text-blue-400">4 {I18N.credits[language]}</p>
              </div>
              <div className="text-center bg-blue-500/20 rounded-lg p-2">
                <p className="text-white/70 mb-1 text-xs">{I18N.modes.jesusChat[language]}</p>
                <p className="font-bold text-blue-400">4 {I18N.credits[language]}</p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            {/* Botón principal: Continuar o Comprar */}
            <button
              onClick={async () => {
                try {
                  if (selectedTier === 'free') {
                    onSelectPlan(selectedTier);
                  } else if (isExtraCreditsSelected) {
                    setPurchasing(true);
                    try {
                      const result = await BillingService.purchaseExtraCredits(deviceId);
                      if (result.success) {
                        setPurchaseSuccess(true);
                        console.log('[PlanSelection] ✅ Compra de créditos extra exitosa, verificando last_mode...');

                        // Recargar datos de suscripción
                        const newData = await BillingService.refreshSubscriptionData(deviceId);
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Verificar el modo guardado para navegar correctamente
                        const savedMode = StorageService.getLastMode() || 'chat';
                        console.log('[PlanSelection] 🎯 Modo guardado:', savedMode);

                        // Llamar al onCancel que manejará la navegación según el modo
                        if (onCancel) {
                          onCancel();
                        }
                      }
                    } catch (error: any) {
                      // Error comprando créditos extra
                    } finally {
                      setPurchasing(false);
                    }
                  } else {
                    handlePurchase(selectedTier);
                  }
                } catch (error: any) {
                  // Error general en compra
                }
              }}
              disabled={purchasing}
              className={`w-full flex items-center justify-center gap-2 ${
                isExtraCreditsSelected
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : selectedTier === 'premium'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  : selectedTier === 'standard'
                  ? 'bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
              } text-white font-bold py-4 px-8 rounded-xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {purchasing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {I18N.processing[language]}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {selectedTier === 'free' ? I18N.continue[language] :
                   isExtraCreditsSelected ? (language === 'es' ? `Comprar Créditos Extra - $${extraCreditsProduct?.price || '29.99'}` :
                                             language === 'pt' ? `Comprar Créditos Extras - $${extraCreditsProduct?.price || '29.99'}` :
                                             language === 'it' ? `Acquista Crediti Extra - $${extraCreditsProduct?.price || '29.99'}` :
                                             language === 'de' ? `Extra Credits kaufen - $${extraCreditsProduct?.price || '29.99'}` :
                                             language === 'fr' ? `Acheter Crédits Supplémentaires - $${extraCreditsProduct?.price || '29.99'}` :
                                             `Buy Extra Credits - $${extraCreditsProduct?.price || '29.99'}`) :
                   (() => {
                     const product = iapProducts.find(p => p.tier === selectedTier);
                     if (!product) return I18N.continue[language];
                     const planName = I18N.planNames[product.tier as keyof typeof I18N.planNames]?.[language] || product.name;
                     const buyText = language === 'es' ? 'Comprar Plan' :
                                   language === 'pt' ? 'Comprar Plano' :
                                   language === 'it' ? 'Acquista Piano' :
                                   language === 'de' ? 'Plan kaufen' :
                                   language === 'fr' ? 'Acheter Plan' :
                                   'Buy Plan';
                     return `${buyText} ${planName} - $${product.price}`;
                   })()
                  }
                </>
              )}
            </button>

            {/* Botón Volver/Continuar - mostrar si NO es plan FREE O si hay créditos extra seleccionados */}
            {(selectedTier !== 'free' || isExtraCreditsSelected) && onCancel && (
              <button
                onClick={onCancel}
                disabled={purchasing}
                className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseSuccess ? I18N.continue[language] : I18N.cancel[language]}
              </button>
            )}
          </div>
        </div>

        {/* Debug Panel - DebugLogger */}
        {showDebug && (
          <div className="fixed inset-0 bg-black/95 z-[10000] overflow-auto p-4">
            <div className="flex justify-between mb-4">
              <h2 className="text-white text-xl font-bold">Debug Logs</h2>
              <div className="flex gap-2">
                <button onClick={() => DebugLogger.clear()} className="bg-red-600 text-white px-3 py-1 rounded">Limpiar</button>
                <button onClick={() => setShowDebug(false)} className="bg-gray-600 text-white px-3 py-1 rounded">Cerrar</button>
              </div>
            </div>
            <div className="space-y-2">
              {debugLogsList.map((log, i) => (
                <div key={i} className="bg-gray-800 p-2 rounded text-sm">
                  <span className="text-green-400">[{log.time}]</span>
                  <span className="text-yellow-400 ml-2">{log.step}</span>
                  {log.data && <pre className="text-gray-300 mt-1 text-xs overflow-auto">{log.data}</pre>}
                </div>
              ))}
              {debugLogsList.length === 0 && <p className="text-gray-500">No hay logs. Intenta hacer una compra.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}