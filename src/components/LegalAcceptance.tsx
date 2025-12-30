import React, { useState } from 'react';
import { Check, ChevronLeft, ExternalLink } from 'lucide-react';
import type { Language } from '../App';

const BACKEND_URL = 'https://hablacondios.movilive.es';

const BACKGROUNDS: Record<string, string> = {
  es: "/FESPANOL.jpeg",
  en: "/FINGLES.jpeg",
  pt: "/FPORTUGUES.jpeg",
  it: "/FITALIAN.jpeg",
  de: "/FALEMAN.jpeg",
  fr: "/FFRANCES.jpeg",
};

const I18N = {
  terms: {
    title: {
      es: 'Términos y Condiciones',
      en: 'Terms and Conditions',
      pt: 'Termos e Condições',
      it: 'Termini e Condizioni',
      de: 'Geschäftsbedingungen',
      fr: 'Termes et Conditions',
    },
    description: {
      es: 'Por favor, lee nuestros términos y condiciones antes de continuar.',
      en: 'Please read our terms and conditions before continuing.',
      pt: 'Por favor, leia nossos termos e condições antes de continuar.',
      it: 'Si prega di leggere i nostri termini e condizioni prima di continuare.',
      de: 'Bitte lesen Sie unsere Geschäftsbedingungen, bevor Sie fortfahren.',
      fr: 'Veuillez lire nos termes et conditions avant de continuer.',
    },
    viewDocument: {
      es: 'Ver términos completos',
      en: 'View full terms',
      pt: 'Ver termos completos',
      it: 'Visualizza termini completi',
      de: 'Vollständige Bedingungen anzeigen',
      fr: 'Voir les conditions complètes',
    },
    accept: {
      es: 'Acepto los términos y condiciones',
      en: 'I accept the terms and conditions',
      pt: 'Aceito os termos e condições',
      it: 'Accetto i termini e le condizioni',
      de: 'Ich akzeptiere die Geschäftsbedingungen',
      fr: "J'accepte les termes et conditions",
    },
    button: {
      es: 'Continuar',
      en: 'Continue',
      pt: 'Continuar',
      it: 'Continua',
      de: 'Weiter',
      fr: 'Continuer',
    },
  },
  privacy: {
    title: {
      es: 'Política de Privacidad',
      en: 'Privacy Policy',
      pt: 'Política de Privacidade',
      it: 'Informativa sulla Privacy',
      de: 'Datenschutzrichtlinie',
      fr: 'Politique de Confidentialité',
    },
    description: {
      es: 'Por favor, lee nuestra política de privacidad antes de continuar.',
      en: 'Please read our privacy policy before continuing.',
      pt: 'Por favor, leia nossa política de privacidade antes de continuar.',
      it: "Si prega di leggere la nostra informativa sulla privacy prima di continuare.",
      de: 'Bitte lesen Sie unsere Datenschutzrichtlinie, bevor Sie fortfahren.',
      fr: 'Veuillez lire notre politique de confidentialité avant de continuer.',
    },
    viewDocument: {
      es: 'Ver política completa',
      en: 'View full policy',
      pt: 'Ver política completa',
      it: 'Visualizza informativa completa',
      de: 'Vollständige Richtlinie anzeigen',
      fr: 'Voir la politique complète',
    },
    accept: {
      es: 'Acepto la política de privacidad',
      en: 'I accept the privacy policy',
      pt: 'Aceito a política de privacidade',
      it: "Accetto l'informativa sulla privacy",
      de: 'Ich akzeptiere die Datenschutzrichtlinie',
      fr: 'J\'accepte la politique de confidentialité',
    },
    button: {
      es: 'Continuar',
      en: 'Continue',
      pt: 'Continuar',
      it: 'Continua',
      de: 'Weiter',
      fr: 'Continuer',
    },
  },
  back: {
    es: 'Volver',
    en: 'Back',
    pt: 'Voltar',
    it: 'Indietro',
    de: 'Zurück',
    fr: 'Retour',
  },
};

interface LegalAcceptanceProps {
  language: Language;
  type: 'terms' | 'privacy';
  onAccept: () => void;
  onBack?: () => void;
}

export default function LegalAcceptance({
  language,
  type,
  onAccept,
  onBack
}: LegalAcceptanceProps) {
  const [accepted, setAccepted] = useState(false);

  const t = I18N[type];

  const handleAccept = () => {
    if (accepted) {
      console.log(`[LegalAcceptance] ✅ Aceptando ${type}`);
      onAccept();
    }
  };

  const openDocument = () => {
    const endpoint = type === 'terms' ? 'terms' : 'privacy';
    const url = `${BACKEND_URL}/${endpoint}?lang=${language}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const bg = BACKGROUNDS[language] || BACKGROUNDS.es;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 -z-10 bg-black/20" />

      <div className="h-full flex flex-col items-center justify-center px-6 py-8 pt-32">
        <div className="w-full max-w-md bg-black/70 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label={I18N.back[language]}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <h1 className="text-2xl font-bold text-white drop-shadow">
                {t.title[language]}
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            <p className="text-white/90 leading-relaxed">
              {t.description[language]}
            </p>

            <button
              onClick={openDocument}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all"
            >
              <ExternalLink className="w-5 h-5" />
              {t.viewDocument[language]}
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/20 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-6 h-6 border-2 border-white/40 rounded-md bg-white/10 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                  {accepted && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
              <span className="text-white/90 group-hover:text-white transition-colors">
                {t.accept[language]}
              </span>
            </label>

            <button
              onClick={handleAccept}
              disabled={!accepted}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3.5 px-6 rounded-xl shadow-lg disabled:bg-white/40 disabled:text-black/50 active:scale-95 transition-all"
            >
              <Check className="w-5 h-5" />
              {t.button[language]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}