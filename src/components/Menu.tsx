import React, { useEffect, useRef, useState } from "react";
import { MoreVertical, MessageSquare, Sparkles, X, LogOut, CreditCard, Clock, Mail, Trash2, XCircle, TrendingUp, AlertCircle, Info } from "lucide-react";
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { Language } from "../App";
import type { SubscriptionStatus } from "../services/types";
import { StorageService } from "../services/StorageService";
import { AuthService } from "../services/AuthService";
import SubscriptionPanel from "./SubscriptionPanel";
import ContactForm from "./ContactForm";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import DeleteDataForm from './DeleteDataForm';

const I18N = {
  menu: {
    title: { 
      es: "Configuración", 
      en: "Settings", 
      pt: "Configurações", 
      it: "Impostazioni", 
      de: "Einstellungen", 
      fr: "Paramètres" 
    },
    modes: {
      chat: {
        es: "Solo Chat",
        en: "Chat Only",
        pt: "Apenas Chat",
        it: "Solo Chat",
        de: "Nur Chat",
        fr: "Chat Seulement"
      },
      chatAudio: {
        es: "Chat + Voz",
        en: "Chat + Voice",
        pt: "Chat + Voz",
        it: "Chat + Voce",
        de: "Chat + Stimme",
        fr: "Chat + Voix"
      },
      video: {
        es: "Jesús",
        en: "Jesus",
        pt: "Jesus",
        it: "Gesù",
        de: "Jesus",
        fr: "Jésus"
      },
      videoChat: {
        es: "Jesús + Chat",
        en: "Jesus + Chat",
        pt: "Jesus + Chat",
        it: "Gesù + Chat",
        de: "Jesus + Chat",
        fr: "Jésus + Chat"
      }
    },
    current: {
      es: "Modo actual",
      en: "Current mode",
      pt: "Modo atual",
      it: "Modalità attuale",
      de: "Aktueller Modus",
      fr: "Mode actuel"
    },
    subscription: {
      es: "Suscripción",
      en: "Subscription",
      pt: "Assinatura",
      it: "Abbonamento",
      de: "Abonnement",
      fr: "Abonnement"
    },
    credits: {
      es: "Créditos restantes",
      en: "Credits remaining",
      pt: "Créditos restantes",
      it: "Crediti rimanenti",
      de: "Verbleibende Credits",
      fr: "Crédits restants"
    },
    extraCredits: {
      es: "Créditos extras",
      en: "Extra credits",
      pt: "Créditos extras",
      it: "Crediti extra",
      de: "Zusätzliche Credits",
      fr: "Crédits supplémentaires"
    },
    logout: {
      es: "Cerrar sesión",
      en: "Logout",
      pt: "Sair",
      it: "Esci",
      de: "Abmelden",
      fr: "Déconnexion"
    },
    contact: {
      es: "Contacto",
      en: "Contact",
      pt: "Contato",
      it: "Contatto",
      de: "Kontakt",
      fr: "Contact"
    },
    manageSubscription: {
      es: "Gestionar suscripción",
      en: "Manage subscription",
      pt: "Gerenciar assinatura",
      it: "Gestisci abbonamento",
      de: "Abonnement verwalten",
      fr: "Gérer l'abonnement"
    },
    deleteData: {
      es: "Solicitar Eliminación de Datos",
      en: "Request Data Deletion",
      pt: "Solicitar Exclusão de Dados",
      it: "Richiedi Cancellazione Dati",
      de: "Datenlöschung Beantragen",
      fr: "Demander la Suppression des Données"
    },
    deviceId: {
      es: "ID",
      en: "ID",
      pt: "ID",
      it: "ID",
      de: "ID",
      fr: "ID"
    },
    cancelSubscription: {
      es: "Cancelar suscripción",
      en: "Cancel subscription",
      pt: "Cancelar assinatura",
      it: "Annulla abbonamento",
      de: "Abonnement kündigen",
      fr: "Annuler l'abonnement"
    },
    upgradePlan: {
      es: "Mejorar plan",
      en: "Upgrade plan",
      pt: "Melhorar plano",
      it: "Migliora piano",
      de: "Plan verbessern",
      fr: "Améliorer le forfait"
    },
    cancelSubscriptionMessage: {
      es: "Para cancelar tu suscripción, contáctanos:",
      en: "To cancel your subscription, contact us:",
      pt: "Para cancelar sua assinatura, entre em contato:",
      it: "Per annullare il tuo abbonamento, contattaci:",
      de: "Um dein Abonnement zu kündigen, kontaktiere uns:",
      fr: "Pour annuler votre abonnement, contactez-nous:"
    },
    about: {
      es: "Acerca de",
      en: "About",
      pt: "Sobre",
      it: "Informazioni",
      de: "Über",
      fr: "À propos"
    },
    version: {
      es: "Versión",
      en: "Version",
      pt: "Versão",
      it: "Versione",
      de: "Version",
      fr: "Version"
    },
    terms: {
      es: "Términos de Uso",
      en: "Terms of Use",
      pt: "Termos de Uso",
      it: "Termini di Utilizzo",
      de: "Nutzungsbedingungen",
      fr: "Conditions d'Utilisation"
    },
    privacy: {
      es: "Política de Privacidad",
      en: "Privacy Policy",
      pt: "Política de Privacidade",
      it: "Informativa sulla Privacy",
      de: "Datenschutzrichtlinie",
      fr: "Politique de Confidentialité"
    }
  }
};

type ConversationMode = "chat" | "chat-audio" | "video" | "video-chat";

// Costos de créditos por modo (por pregunta)
const MODE_COSTS: Record<ConversationMode, number> = {
  "chat": 1,
  "chat-audio": 2,
  "video": 4,
  "video-chat": 4
};

interface MenuProps {
  lang: Language;
  chatEnabled: boolean;
  audioEnabled: boolean;
  jesusEnabled: boolean;
  subscription: SubscriptionStatus;
  deviceId: string;
  backendUrl: string;
  isPlaying?: boolean;
  lastMode?: ConversationMode;
  onToggleChat: () => void;
  onToggleAudio: () => void;
  onToggleJesus: () => void;
  onLogout: () => void;
  onModeChange?: (mode: ConversationMode) => void;
  onInsufficientCredits?: () => void;
  onUpgradePlan?: () => void;
  onContactOpen?: () => void;
  onContactClose?: () => void;
}

export default function Menu({
  lang,
  chatEnabled,
  audioEnabled,
  jesusEnabled,
  subscription,
  deviceId,
  backendUrl,
  isPlaying = false,
  lastMode,
  onToggleChat,
  onToggleAudio,
  onToggleJesus,
  onLogout,
  onModeChange,
  onInsufficientCredits,
  onUpgradePlan,
  onContactOpen,
  onContactClose,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showCancelSubscription, setShowCancelSubscription] = useState(false);
  const [showDeleteData, setShowDeleteData] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [creditsError, setCreditsError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Log cuando cambia el estado open
  useEffect(() => {
    console.log('[Menu] 📊 Estado "open" cambió a:', open);
  }, [open]);

  // Determinar modo actual basado en estados
  const getCurrentMode = (): ConversationMode => {
    if (jesusEnabled) return "video-chat"; // Siempre video-chat cuando Jesús está activo (chatEnabled solo controla UI)
    if (audioEnabled && chatEnabled) return "chat-audio";
    return "chat";
  };

  const currentMode = getCurrentMode();

  // Cargar versión de la aplicación al montar
  useEffect(() => {
    const loadAppVersion = async () => {
      try {
        const info = await CapacitorApp.getInfo();
        setAppVersion(`${info.version} (${info.build})`);
      } catch (error) {
        console.error('Error obteniendo versión:', error);
        setAppVersion('1.0.0');
      }
    };
    loadAppVersion();
  }, []);

  // Actualizar créditos cuando cambia la prop subscription (actualización en tiempo real)
  useEffect(() => {
    console.log('[Menu] Subscription prop changed:', subscription);
    setCurrentCredits(subscription.creditsRemaining);
    setTotalCredits(subscription.creditsTotal);
  }, [subscription]);

  // Actualizar créditos cuando se abre el menú (fetch adicional para sincronizar)
  useEffect(() => {
    const fetchCredits = async () => {
      if (!open) return;

      setCreditsError(false);
      console.log('[Menu] Fetching credits for deviceId:', deviceId);

      try {
        // Obtener datos de usuario desde StorageService
        const userData = StorageService.getUserData();

        console.log('[Menu] 👤 Datos de usuario:', userData);

        // Si no hay datos de usuario, no llamar al backend
        if (!userData) {
          console.log('[Menu] ⚠️ Sin datos de usuario, no se actualiza desde backend');
          return;
        }

        // Construir URL con todos los parámetros
        const params = new URLSearchParams({ deviceId });
        params.append('user_name', userData.name);
        params.append('gender', userData.gender);
        params.append('language', userData.language);

        const token = await AuthService.getToken(deviceId);
        const url = `https://backend.movilive.es/api/subscription/status?${params.toString()}`;
        console.log('[Menu] URL:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('[Menu] Response status:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('[Menu] Response data:', data);

          const remaining = data.credits_remaining ?? 0;
          const total = data.credits_total ?? 0;

          setCurrentCredits(remaining);
          setTotalCredits(total);
          console.log('[Menu] Créditos actualizados:', remaining, 'de', total);
        } else {
          console.error('[Menu] Error en respuesta al obtener créditos, status:', response.status);
          setCreditsError(true);
          setCurrentCredits(0);
          setTotalCredits(0);
        }
      } catch (error) {
        console.error('[Menu] Error al obtener créditos:', error);
        setCreditsError(true);
        setCurrentCredits(0);
        setTotalCredits(0);
      }
    };

    fetchCredits();
  }, [open, deviceId]);

  // Mapear modo a clave de traducción
  const getModeTranslationKey = (mode: ConversationMode): keyof typeof I18N.menu.modes => {
    const modeMap: Record<ConversationMode, keyof typeof I18N.menu.modes> = {
      "chat": "chat",
      "chat-audio": "chatAudio",
      "video": "video",
      "video-chat": "videoChat"
    };
    return modeMap[mode];
  };

  // Aplicar modo seleccionado
  const applyMode = (mode: ConversationMode) => {
    console.log(`[Menu] 🎛️ Intentando cambiar a modo: ${mode}`);

    // Usar currentCredits del estado local si está disponible, si no usar subscription.creditsRemaining
    const creditsToCheck = currentCredits !== null ? currentCredits : subscription.creditsRemaining;
    const modeCost = MODE_COSTS[mode];

    console.log(`[Menu] 💳 Verificación de créditos:`, {
      creditsToCheck,
      tipo: typeof creditsToCheck,
      modeCost,
      creditosRequeridos: modeCost,
      tienesSuficientes: creditsToCheck >= modeCost,
      subscription: subscription.creditsRemaining
    });

    // Si creditsToCheck es undefined, null, o menor/igual a 0, bloquear
    if (creditsToCheck === undefined || creditsToCheck === null || creditsToCheck <= 0) {
      console.log(`[Menu] ❌ Sin créditos válidos (${creditsToCheck}) - mostrando modal`);
      setOpen(false);
      if (onInsufficientCredits) {
        onInsufficientCredits();
      }
      return;
    }

    // Verificar si tiene suficientes créditos para este modo
    if (creditsToCheck < modeCost) {
      console.log(`[Menu] ❌ Créditos insuficientes: tienes ${creditsToCheck}, necesitas ${modeCost} - mostrando modal`);
      setOpen(false);
      if (onInsufficientCredits) {
        onInsufficientCredits();
      }
      return;
    }

    console.log(`[Menu] ✅ Créditos suficientes (${creditsToCheck} >= ${modeCost}) - aplicando modo: ${mode}`);

    // Llamar directamente a onModeChange con el modo seleccionado
    // Esto evita el problema de estados intermedios al llamar toggles individuales
    if (onModeChange) {
      onModeChange(mode);
    }

    setOpen(false);
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAbout) {
          setShowAbout(false);
        } else if (showContact) {
          setShowContact(false);
        } else if (showSubscription) {
          setShowSubscription(false);
        } else if (open) {
          setOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, showSubscription, showContact, showAbout]);

  // Formatear tier para mostrar
  const formatTier = (tier: string) => {
    switch (tier) {
      case 'free': return 'Free';
      case 'basic': return 'Basic';
      case 'premium': return 'Premium';
      default: return tier;
    }
  };

  // Abrir enlaces externos
  const openTerms = async () => {
    try {
      await Browser.open({
        url: `https://backend.movilive.es/terms?lang=${lang}`
      });
    } catch (error) {
      console.error('Error abriendo términos:', error);
    }
  };

  const openPrivacy = async () => {
    try {
      await Browser.open({
        url: `https://backend.movilive.es/privacy?lang=${lang}`
      });
    } catch (error) {
      console.error('Error abriendo privacidad:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón de menú */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[Menu] 🔘 Botón de menú presionado, estado actual:', open);
          const nextOpen = !open;
          console.log('[Menu] 🔄 Cambiando estado a:', nextOpen);
          setOpen(nextOpen);
        }}
        className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 active:bg-white/30 transition-all border border-white/20"
        aria-label="Menu"
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <MoreVertical className="w-5 h-5 text-white drop-shadow-lg" />
      </button>

      {/* Panel de suscripciones */}
      {showSubscription && (
        <SubscriptionPanel
          language={lang}
          deviceId={deviceId}
          backendUrl={backendUrl}
          lastMode={lastMode}
          onClose={() => setShowSubscription(false)}
          onRestoreMode={(mode) => {
            setShowSubscription(false);
            if (onModeChange && mode) {
              onModeChange(mode);
            }
          }}
          onShowInsufficientCredits={() => {
            setShowSubscription(false);
            onInsufficientCredits?.();
          }}
        />
      )}

      {/* Overlay del menú */}
      {open && (
        <>
          {console.log('[Menu] 🎨 Renderizando overlay y panel del menú')}
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            onClick={() => {
              console.log('[Menu] 🔙 Click en backdrop, cerrando menú');
              setOpen(false);
            }}
          />

          {/* Panel del menú */}
          <div className="fixed inset-4 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-2xl py-4 sm:py-6 sm:w-auto sm:max-w-[380px] sm:h-auto sm:max-h-[90vh] overflow-y-auto z-[70] animate-in fade-in zoom-in-95 duration-200 border border-gray-200">

            {/* Header con botón cerrar */}
            <div className="px-4 sm:px-6 mb-3 sm:mb-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenedor sin scroll */}
            <div className="px-4 sm:px-6">

              {/* Sección de Suscripción y Plan */}
              <div className="mb-4 sm:mb-5 space-y-2 sm:space-y-3">
                {/* Mostrar plan actual */}
                <div className="bg-sky-50 rounded-xl p-3 sm:p-4 border-2 border-sky-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700">
                      {I18N.menu.subscription[lang]}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-sky-600">
                      {formatTier(subscription.tier)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-700">
                      <CreditCard className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
                      <span className="text-xs sm:text-sm font-semibold">
                        {creditsError ? '--' : `${currentCredits ?? 0}/${totalCredits ?? 0}`} créditos plan
                      </span>
                    </div>
                    {subscription.tier === 'premium' && subscription.totalPurchasedCredits !== undefined && subscription.totalPurchasedCredits > 0 && (
                      <div className="flex items-center gap-2 text-amber-700">
                        <CreditCard className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600" />
                        <span className="text-xs sm:text-sm font-semibold">
                          {I18N.menu.extraCredits[lang]}: {subscription.totalPurchasedCredits}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón mejorar plan */}
                <button
                  onClick={() => {
                    setOpen(false);
                    if (onUpgradePlan) {
                      onUpgradePlan();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-blue-600 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 border-blue-600"
                >
                  <TrendingUp className="w-4 h-4" />
                  {I18N.menu.upgradePlan[lang]}
                </button>
              </div>

              {/* Indicador de modo actual */}
              <div className="mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-3 bg-sky-50 border-l-3 border-sky-500 rounded">
                <p className="text-[10px] sm:text-xs text-sky-700 font-semibold uppercase tracking-wider">
                  {I18N.menu.current[lang]}
                </p>
                <p className="text-xs sm:text-sm text-gray-900 font-medium mt-1">
                  {I18N.menu.modes[getModeTranslationKey(currentMode)][lang]}
                </p>
              </div>

              {/* Opciones de modo */}
              <div className="space-y-2 mb-4 sm:mb-5">

                {/* SOLO CHAT */}
                <button
                  onClick={() => !isPlaying && applyMode("chat")}
                  disabled={isPlaying}
                  className={`w-full flex items-center px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all ${
                    currentMode === "chat"
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                      : isPlaying
                      ? "bg-gray-200 text-gray-400 border-2 border-gray-300 cursor-not-allowed opacity-50"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-300"
                  }`}
                >
                  <MessageSquare className={`w-4 sm:w-5 h-4 sm:h-5 mr-2 sm:mr-3 ${currentMode === "chat" ? "text-white" : "text-gray-500"}`} />
                  <span className="text-xs sm:text-sm font-medium">
                    {I18N.menu.modes.chat[lang]}
                  </span>
                </button>

                {/* CHAT + AUDIO */}
                <button
                  onClick={() => !isPlaying && applyMode("chat-audio")}
                  disabled={isPlaying}
                  className={`w-full flex items-center px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all ${
                    currentMode === "chat-audio"
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                      : isPlaying
                      ? "bg-gray-200 text-gray-400 border-2 border-gray-300 cursor-not-allowed opacity-50"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-300"
                  }`}
                >
                  <div className="flex items-center mr-2 sm:mr-3">
                    <MessageSquare className={`w-4 sm:w-5 h-4 sm:h-5 ${currentMode === "chat-audio" ? "text-white" : "text-gray-500"}`} />
                    <Sparkles className={`w-3 sm:w-4 h-3 sm:h-4 ml-1 ${currentMode === "chat-audio" ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">
                    {I18N.menu.modes.chatAudio[lang]}
                  </span>
                </button>

                {/* SOLO VIDEO (Jesús) */}
                <button
                  onClick={() => !isPlaying && applyMode("video")}
                  disabled={isPlaying}
                  className={`w-full flex items-center px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all ${
                    jesusEnabled && !chatEnabled
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                      : isPlaying
                      ? "bg-gray-200 text-gray-400 border-2 border-gray-300 cursor-not-allowed opacity-50"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-300"
                  }`}
                >
                  <Sparkles className={`w-4 sm:w-5 h-4 sm:h-5 mr-2 sm:mr-3 ${jesusEnabled && !chatEnabled ? "text-white" : "text-gray-500"}`} />
                  <span className="text-xs sm:text-sm font-medium">
                    {I18N.menu.modes.video[lang]}
                  </span>
                </button>

                {/* VIDEO + CHAT (Jesús + Chat) */}
                <button
                  onClick={() => !isPlaying && applyMode("video-chat")}
                  disabled={isPlaying}
                  className={`w-full flex items-center px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all ${
                    jesusEnabled && chatEnabled
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                      : isPlaying
                      ? "bg-gray-200 text-gray-400 border-2 border-gray-300 cursor-not-allowed opacity-50"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-gray-300"
                  }`}
                >
                  <div className="flex items-center mr-2 sm:mr-3">
                    <Sparkles className={`w-4 sm:w-5 h-4 sm:h-5 ${jesusEnabled && chatEnabled ? "text-white" : "text-gray-500"}`} />
                    <MessageSquare className={`w-4 sm:w-5 h-4 sm:h-5 ml-1 ${jesusEnabled && chatEnabled ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">
                    {I18N.menu.modes.videoChat[lang]}
                  </span>
                </button>

              </div>

              {/* Contacto y Acerca de */}
              <div className="mb-2 sm:mb-3 pt-3 sm:pt-4 border-t-2 border-gray-300 space-y-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    if (onContactOpen) onContactOpen();
                    setShowContact(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all border-2 border-gray-300"
                >
                  <Mail className="w-4 h-4" />
                  {I18N.menu.contact[lang]}
                </button>

                <button
                  onClick={() => {
                    setOpen(false);
                    setShowAbout(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all border-2 border-gray-300"
                >
                  <Info className="w-4 h-4" />
                  {I18N.menu.about[lang]}
                </button>
              </div>

              {/* Sección de opciones críticas */}
              <div className="space-y-2 sm:space-y-3 pb-2 sm:pb-[10px]">
                {/* Cerrar sesión */}
                <button
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-700 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 border-red-700"
                >
                  <LogOut className="w-4 h-4" />
                  {I18N.menu.logout[lang]}
                </button>

                {/* Solicitar Eliminación de Datos */}
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowDeleteData(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-700 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 border-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  {I18N.menu.deleteData[lang]}
                </button>

                {/* Cancelar suscripción */}
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowCancelSubscription(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-700 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 border-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  {I18N.menu.cancelSubscription[lang]}
                </button>
              </div>


            </div>

          </div>
        </>
      )}

      {/* Formulario de contacto */}
      {showContact && (
        <ContactForm
          language={lang}
          backendUrl={backendUrl}
          deviceId={deviceId}
          onClose={() => {
            setShowContact(false);
            if (onContactClose) onContactClose();
          }}
        />
      )}

      {/* Modal Cancelar Suscripción */}
      {showCancelSubscription && (
        <CancelSubscriptionModal
          language={lang}
          deviceId={deviceId}
          onClose={() => setShowCancelSubscription(false)}
          onSuccess={() => {
            setShowCancelSubscription(false);
          }}
        />
      )}

      {/* Modal Acerca de */}
      {showAbout && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowAbout(false)}
          />
          <div className="fixed inset-4 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:w-auto sm:max-w-md z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAbout(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Habla con Dios</h2>

              <p className="text-sm text-gray-600">
                {I18N.menu.version[lang]}: {appVersion}
              </p>

              <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={openTerms}
                  className="text-blue-600 hover:text-blue-700 underline text-sm font-medium transition"
                >
                  {I18N.menu.terms[lang]}
                </button>

                <button
                  onClick={openPrivacy}
                  className="text-blue-600 hover:text-blue-700 underline text-sm font-medium transition"
                >
                  {I18N.menu.privacy[lang]}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showDeleteData && (
        <DeleteDataForm
          language={lang}
          deviceId={deviceId}
          onClose={() => setShowDeleteData(false)}
          hasActiveSubscription={subscription.tier !== 'free' && subscription.tier !== undefined}
        />
      )}
    </div>
  );
}