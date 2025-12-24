// ============================================
// SUBSCRIPTIONPANEL.TSX - PANEL DE SUSCRIPCIÓN
// ============================================

import React, { useState, useEffect } from 'react';

// Estilos para ocultar scrollbar
const hideScrollbarStyle = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

// Agregar estilos al head si no existen
if (typeof document !== 'undefined' && !document.getElementById('hide-scrollbar-style')) {
  const style = document.createElement('style');
  style.id = 'hide-scrollbar-style';
  style.textContent = hideScrollbarStyle;
  document.head.appendChild(style);
}
import {
  CreditCard,
  Crown,
  X,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import type { Language, SubscriptionStatus } from '../services/types';
import { SubscriptionService, SUBSCRIPTION_PLANS } from '../services/SubscriptionService';
import { StorageService } from '../services/StorageService';

interface SubscriptionPanelProps {
  language: Language;
  deviceId: string;
  backendUrl: string;
  lastMode?: 'chat' | 'chat-audio' | 'video-chat';
  onClose: () => void;
  onRestoreMode?: (mode: 'chat' | 'chat-audio' | 'video-chat') => void;
  onShowInsufficientCredits?: () => void;
}

const TEXTS = {
  es: {
    title: "Mi Suscripción",
    currentPlan: "Plan Actual",
    creditsRemaining: "Mensajes restantes",
    expiresOn: "Expira el",
    upgradePlan: "Mejorar Plan",
    cancelSubscription: "Cancelar Suscripción",
    confirmCancel: "¿Estás seguro que deseas cancelar tu suscripción?",
    cancelSuccess: "Suscripción cancelada exitosamente",
    cancelError: "Error al cancelar la suscripción",
    manageBilling: "Gestionar en",
    googlePlay: "Google Play",
    appStore: "App Store",
    features: "Características",
    perMonth: "/mes",
    loading: "Cargando...",
    freeNote: "Actualiza a Básico o Premium para desbloquear audio, video y más mensajes.",
    back: "Volver",
    planNames: {
      free: "Gratis",
      basic: "Básico",
      standard: "Estándar",
      premium: "Premium"
    }
  },
  en: {
    title: "My Subscription",
    currentPlan: "Current Plan",
    creditsRemaining: "Messages remaining",
    expiresOn: "Expires on",
    upgradePlan: "Upgrade Plan",
    cancelSubscription: "Cancel Subscription",
    confirmCancel: "Are you sure you want to cancel your subscription?",
    cancelSuccess: "Subscription cancelled successfully",
    cancelError: "Error cancelling subscription",
    manageBilling: "Manage in",
    googlePlay: "Google Play",
    appStore: "App Store",
    features: "Features",
    perMonth: "/month",
    loading: "Loading...",
    freeNote: "Upgrade to Basic or Premium to unlock audio, video and more messages.",
    back: "Back",
    planNames: {
      free: "Free",
      basic: "Basic",
      standard: "Standard",
      premium: "Premium"
    }
  },
  pt: {
    title: "Minha Assinatura",
    currentPlan: "Plano Atual",
    creditsRemaining: "Mensagens restantes",
    expiresOn: "Expira em",
    upgradePlan: "Melhorar Plano",
    cancelSubscription: "Cancelar Assinatura",
    confirmCancel: "Tem certeza que deseja cancelar sua assinatura?",
    cancelSuccess: "Assinatura cancelada com sucesso",
    cancelError: "Erro ao cancelar assinatura",
    manageBilling: "Gerenciar em",
    googlePlay: "Google Play",
    appStore: "App Store",
    features: "Características",
    perMonth: "/mês",
    loading: "Carregando...",
    freeNote: "Atualize para Básico ou Premium para desbloquear áudio, vídeo e mais mensagens.",
    back: "Voltar",
    planNames: {
      free: "Grátis",
      basic: "Básico",
      standard: "Padrão",
      premium: "Premium"
    }
  },
  it: {
    title: "Il Mio Abbonamento",
    currentPlan: "Piano Attuale",
    creditsRemaining: "Messaggi rimanenti",
    expiresOn: "Scade il",
    upgradePlan: "Aggiorna Piano",
    cancelSubscription: "Annulla Abbonamento",
    confirmCancel: "Sei sicuro di voler annullare l'abbonamento?",
    cancelSuccess: "Abbonamento annullato con successo",
    cancelError: "Errore nell'annullamento",
    manageBilling: "Gestisci in",
    googlePlay: "Google Play",
    appStore: "App Store",
    features: "Caratteristiche",
    perMonth: "/mese",
    loading: "Caricamento...",
    freeNote: "Aggiorna a Base o Premium per sbloccare audio, video e più messaggi.",
    back: "Indietro",
    planNames: {
      free: "Gratis",
      basic: "Base",
      standard: "Standard",
      premium: "Premium"
    }
  },
  de: {
    title: "Mein Abonnement",
    currentPlan: "Aktueller Plan",
    creditsRemaining: "Verbleibende Nachrichten",
    expiresOn: "Läuft ab am",
    upgradePlan: "Plan upgraden",
    cancelSubscription: "Abo kündigen",
    confirmCancel: "Möchten Sie Ihr Abonnement wirklich kündigen?",
    cancelSuccess: "Abonnement erfolgreich gekündigt",
    cancelError: "Fehler beim Kündigen",
    manageBilling: "Verwalten in",
    googlePlay: "Google Play",
    appStore: "App Store",
    features: "Funktionen",
    perMonth: "/Monat",
    loading: "Laden...",
    freeNote: "Upgraden Sie auf Basis oder Premium für Audio, Video und mehr Nachrichten.",
    back: "Zurück",
    planNames: {
      free: "Kostenlos",
      basic: "Basis",
      standard: "Standard",
      premium: "Premium"
    }
  },
  fr: {
    title: "Mon Abonnement",
    currentPlan: "Plan Actuel",
    creditsRemaining: "Messages restants",
    expiresOn: "Expire le",
    upgradePlan: "Améliorer le Plan",
    cancelSubscription: "Annuler l'Abonnement",
    confirmCancel: "Êtes-vous sûr de vouloir annuler votre abonnement?",
    cancelSuccess: "Abonnement annulé avec succès",
    cancelError: "Erreur lors de l'annulation",
    manageBilling: "Gérer dans",
    googlePlay: "Google Play",
    appStore: "App Store",
    features: "Fonctionnalités",
    perMonth: "/mois",
    loading: "Chargement...",
    freeNote: "Passez à Basique ou Premium pour débloquer l'audio, la vidéo et plus de messages.",
    back: "Retour",
    planNames: {
      free: "Gratuit",
      basic: "Basique",
      standard: "Standard",
      premium: "Premium"
    }
  },
};

export default function SubscriptionPanel({
  language,
  deviceId,
  backendUrl,
  lastMode,
  onClose,
  onRestoreMode,
  onShowInsufficientCredits
}: SubscriptionPanelProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState('');
  
  const t = TEXTS[language] || TEXTS.es;
  const service = new SubscriptionService(backendUrl);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);

    // Obtener datos del usuario desde StorageService
    const userData = StorageService.getUserData();

    console.log('[SubscriptionPanel] 👤 Datos de usuario:', userData);

    // Si no hay datos de usuario, usar solo valores locales
    if (!userData) {
      console.log('[SubscriptionPanel] ⚠️ Sin datos de usuario, usando valores locales');
      const localSub = StorageService.getSubscription();
      setStatus(localSub);
      setLoading(false);
      return;
    }

    const sub = await service.getSubscriptionStatus(
      deviceId,
      userData.name,
      userData.gender,
      userData.language
    );
    setStatus(sub);
    setLoading(false);
  }

  function handleCancelClick() {
    setShowCancelModal(true);
  }

  function handleBack() {
    // Verificar si tiene créditos
    if (!status || status.creditsRemaining < 1.0) {
      // No tiene créditos suficientes, mostrar modal de créditos insuficientes
      if (onShowInsufficientCredits) {
        onShowInsufficientCredits();
      }
    } else {
      // Tiene créditos, volver a la aplicación y restaurar último modo
      if (onRestoreMode && lastMode) {
        console.log('[SubscriptionPanel] Restaurando último modo:', lastMode);
        onRestoreMode(lastMode);
      } else {
        onClose();
      }
    }
  }

  async function confirmCancel() {
    setCancelling(true);
    setCancelError('');

    const success = await service.cancelSubscription(deviceId);

    if (success) {
      setCancelSuccess(true);
      setTimeout(async () => {
        await loadStatus();
        setShowCancelModal(false);
        setCancelSuccess(false);
        setCancelling(false);
      }, 2000);
    } else {
      setCancelError(t.cancelError);
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-gray-600 mt-4">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const currentPlan = SUBSCRIPTION_PLANS[status.tier];
  const isPremium = status.tier === 'premium';
  const isFree = status.tier === 'free';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel centrado con el mismo tamaño que Menu */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl py-4 sm:py-6 w-[90vw] max-w-[380px] max-h-[90vh] z-50 animate-in fade-in zoom-in-95 duration-200 border border-gray-200 overflow-y-auto hide-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        } as React.CSSProperties & { msOverflowStyle?: string }}
      >

        {/* Header con botón cerrar */}
        <div className="px-6 mb-4 flex justify-end">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 space-y-6">
          {/* Plan actual */}
          <div className={`rounded-2xl p-6 ${
            isPremium ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
            isFree ? 'bg-gray-100' : 'bg-blue-50'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {isPremium ? (
                <Crown className="w-8 h-8 text-white" />
              ) : (
                <CreditCard className="w-8 h-8 text-gray-700" />
              )}
              <div>
                <p className={`text-sm ${isPremium ? 'text-white/80' : 'text-gray-600'}`}>
                  {t.currentPlan}
                </p>
                <h3 className={`text-2xl font-bold ${isPremium ? 'text-white' : 'text-gray-900'}`}>
                  {t.planNames[status.tier as keyof typeof t.planNames] || currentPlan.name}
                </h3>
              </div>
            </div>

            {/* Créditos */}
            <div className={`rounded-xl p-4 mb-4 ${
              isPremium ? 'bg-white/20' : 'bg-white'
            }`}>
              <p className={`text-sm mb-1 ${isPremium ? 'text-white/80' : 'text-gray-600'}`}>
                {t.creditsRemaining}
              </p>
              <p className={`text-3xl font-bold ${isPremium ? 'text-white' : 'text-gray-900'}`}>
                {service.formatCredits(status.creditsRemaining)}
              </p>
            </div>

            {/* Expiración */}
            {status.expiresAt && (
              <p className={`text-sm ${isPremium ? 'text-white/80' : 'text-gray-600'}`}>
                {t.expiresOn}: {service.formatExpiration(status.expiresAt, language)}
              </p>
            )}
          </div>


          {/* Botones de acción */}
          <div className="space-y-3">
            {!isPremium && (
              <button
                onClick={() => setShowUpgrade(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                {t.upgradePlan}
              </button>
            )}

            {/* Botón Volver */}
            <button
              onClick={handleBack}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-4 rounded-xl hover:bg-gray-300 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              {t.back}
            </button>
          </div>

          {/* Aviso free */}
          {isFree && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">{t.freeNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de upgrade - simplificado por ahora */}
      {showUpgrade && (
        <UpgradeModal
          language={language}
          lastMode={lastMode}
          onClose={() => setShowUpgrade(false)}
          onRestoreMode={onRestoreMode}
        />
      )}

      {/* Modal de confirmación de cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            {!cancelSuccess ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-600" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                  {t.confirmCancel}
                </h2>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-yellow-900 text-center">
                    {language === 'es' && 'Perderás acceso inmediato a todos los créditos restantes y funciones premium.'}
                    {language === 'en' && 'You will immediately lose access to all remaining credits and premium features.'}
                    {language === 'pt' && 'Você perderá acesso imediato a todos os créditos restantes e recursos premium.'}
                    {language === 'it' && 'Perderai immediatamente l\'accesso a tutti i crediti rimanenti e alle funzionalità premium.'}
                    {language === 'de' && 'Sie verlieren sofort den Zugriff auf alle verbleibenden Credits und Premium-Funktionen.'}
                    {language === 'fr' && 'Vous perdrez immédiatement l\'accès à tous les crédits restants et aux fonctionnalités premium.'}
                  </p>
                </div>

                {cancelError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-red-900 text-center">{cancelError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelling}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-all disabled:opacity-50"
                  >
                    {language === 'es' && 'No, conservar'}
                    {language === 'en' && 'No, keep it'}
                    {language === 'pt' && 'Não, manter'}
                    {language === 'it' && 'No, mantieni'}
                    {language === 'de' && 'Nein, behalten'}
                    {language === 'fr' && 'Non, garder'}
                  </button>

                  <button
                    onClick={confirmCancel}
                    disabled={cancelling}
                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>
                          {language === 'es' && 'Cancelando...'}
                          {language === 'en' && 'Cancelling...'}
                          {language === 'pt' && 'Cancelando...'}
                          {language === 'it' && 'Annullamento...'}
                          {language === 'de' && 'Stornieren...'}
                          {language === 'fr' && 'Annulation...'}
                        </span>
                      </>
                    ) : (
                      <>
                        {language === 'es' && 'Sí, cancelar'}
                        {language === 'en' && 'Yes, cancel'}
                        {language === 'pt' && 'Sim, cancelar'}
                        {language === 'it' && 'Sì, annulla'}
                        {language === 'de' && 'Ja, stornieren'}
                        {language === 'fr' && 'Oui, annuler'}
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                  {t.cancelSuccess}
                </h2>

                <p className="text-gray-600 text-center">
                  {language === 'es' && 'Tu suscripción ha sido cancelada exitosamente.'}
                  {language === 'en' && 'Your subscription has been successfully cancelled.'}
                  {language === 'pt' && 'Sua assinatura foi cancelada com sucesso.'}
                  {language === 'it' && 'Il tuo abbonamento è stato annullato con successo.'}
                  {language === 'de' && 'Ihr Abonnement wurde erfolgreich gekündigt.'}
                  {language === 'fr' && 'Votre abonnement a été annulé avec succès.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Modal de upgrade simplificado
function UpgradeModal({
  language,
  lastMode,
  onClose,
  onRestoreMode
}: {
  language: Language;
  lastMode?: 'chat' | 'chat-audio' | 'video-chat';
  onClose: () => void;
  onRestoreMode?: (mode: 'chat' | 'chat-audio' | 'video-chat') => void;
}) {
  const plans = [SUBSCRIPTION_PLANS.basic, SUBSCRIPTION_PLANS.premium];

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar p-6"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        } as React.CSSProperties & { msOverflowStyle?: string }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Mejorar Plan</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div 
              key={plan.id}
              className={`border-2 rounded-2xl p-6 ${
                plan.id === 'premium' 
                  ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {plan.id === 'premium' && <Crown className="w-6 h-6 text-yellow-600" />}
                <h4 className="text-xl font-bold">{plan.name}</h4>
              </div>
              
              <p className="text-3xl font-bold mb-1">
                ${plan.price}
                <span className="text-base text-gray-600">/mes</span>
              </p>
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  console.log('[SubscriptionPanel] Upgrade desde modal:', plan.name);
                  onClose();
                  // Restaurar último modo después de seleccionar plan
                  if (onRestoreMode && lastMode) {
                    console.log('[SubscriptionPanel] Restaurando último modo después de seleccionar plan:', lastMode);
                    setTimeout(() => {
                      onRestoreMode(lastMode);
                    }, 100);
                  }
                }}
                className={`w-full py-3 rounded-xl font-semibold transition ${
                  plan.id === 'premium'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-lg'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Seleccionar {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}