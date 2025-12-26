import React from 'react';
import type { Language } from '../App';
import type { ConversationMode, SubscriptionStatus } from '../services/types';
import { AlertCircle, CreditCard, MessageCircle, LogOut } from 'lucide-react';

const BACKGROUNDS: Record<string, string> = {
  es: "/FESPANOL.jpeg",
  en: "/FINGLES.jpeg",
  pt: "/FPORTUGUES.jpeg",
  it: "/FITALIANO.jpeg",
  de: "/FALEMAN.jpeg",
  fr: "/FFRANCES.jpeg",
};

interface InsufficientCreditsModalProps {
  language: Language;
  subscription: SubscriptionStatus;
  currentMode: ConversationMode;
  deviceId: string;
  onClose: () => void;
  onChangeMode: (mode: ConversationMode) => void;
  onRecharge: () => void;
  onContact: () => void;
  onLogout: () => void;
  allowClose?: boolean;
}

const TRANSLATIONS = {
  title: {
    es: 'Créditos Insuficientes',
    en: 'Insufficient Credits',
    pt: 'Créditos Insuficientes',
    it: 'Crediti Insufficienti',
    de: 'Unzureichende Credits',
    fr: 'Crédits Insuffisants',
  },
  message: {
    es: 'No tienes créditos suficientes para continuar.',
    en: 'You do not have enough credits to continue.',
    pt: 'Você não tem créditos suficientes para continuar.',
    it: 'Non hai crediti sufficienti per continuare.',
    de: 'Du hast nicht genug Credits, um fortzufahren.',
    fr: 'Vous n\'avez pas assez de crédits pour continuer.',
  },
  goToSubscriptions: {
    es: 'Ir a Suscripciones',
    en: 'Go to Subscriptions',
    pt: 'Ir para Assinaturas',
    it: 'Vai agli Abbonamenti',
    de: 'Zu Abonnements',
    fr: 'Aller aux Abonnements',
  },
  contact: {
    es: 'Contactar',
    en: 'Contact',
    pt: 'Contatar',
    it: 'Contattare',
    de: 'Kontakt',
    fr: 'Contacter',
  },
  logout: {
    es: 'Cerrar Sesión',
    en: 'Log Out',
    pt: 'Encerrar Sessão',
    it: 'Esci',
    de: 'Abmelden',
    fr: 'Se Déconnecter',
  },
};

export default function InsufficientCreditsModal({
  language,
  onRecharge,
  onContact,
  onLogout,
}: InsufficientCreditsModalProps) {
  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][language];
  const bg = BACKGROUNDS[language] || BACKGROUNDS.es;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 -z-10 bg-black/50" />

      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200 border border-white/30">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={40} className="text-red-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {t('title')}
          </h2>

          <p className="text-gray-600 text-center mb-8 text-lg">
            {t('message')}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onRecharge}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              <CreditCard className="w-5 h-5" />
              {t('goToSubscriptions')}
            </button>

            <button
              onClick={onContact}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all border border-gray-300"
            >
              <MessageCircle className="w-5 h-5" />
              {t('contact')}
            </button>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all border border-gray-300"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
