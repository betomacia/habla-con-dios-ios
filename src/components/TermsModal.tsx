// ============================================
// TERMSMODAL.TSX - ABRIR TÉRMINOS EN NAVEGADOR
// ============================================

import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { Language } from '../services/types';

const BACKEND_URL = 'https://hablacondios.movilive.es';

interface TermsModalProps {
  language: Language;
  type: 'terms' | 'privacy';
  onClose: () => void;
}

const TITLES = {
  terms: {
    es: 'Términos y Condiciones',
    en: 'Terms and Conditions',
    pt: 'Termos e Condições',
    it: 'Termini e Condizioni',
    de: 'Geschäftsbedingungen',
    fr: 'Conditions Générales'
  },
  privacy: {
    es: 'Política de Privacidad',
    en: 'Privacy Policy',
    pt: 'Política de Privacidade',
    it: 'Informativa sulla Privacy',
    de: 'Datenschutzrichtlinie',
    fr: 'Politique de Confidentialité'
  }
};

const DESCRIPTIONS = {
  terms: {
    es: 'Se abrirá una nueva pestaña con nuestros términos y condiciones completos.',
    en: 'A new tab will open with our full terms and conditions.',
    pt: 'Uma nova aba será aberta com nossos termos e condições completos.',
    it: 'Si aprirà una nuova scheda con i nostri termini e condizioni completi.',
    de: 'Es öffnet sich ein neuer Tab mit unseren vollständigen Geschäftsbedingungen.',
    fr: 'Un nouvel onglet s\'ouvrira avec nos conditions générales complètes.'
  },
  privacy: {
    es: 'Se abrirá una nueva pestaña con nuestra política de privacidad completa.',
    en: 'A new tab will open with our full privacy policy.',
    pt: 'Uma nova aba será aberta com nossa política de privacidade completa.',
    it: 'Si aprirà una nuova scheda con la nostra informativa sulla privacy completa.',
    de: 'Es öffnet sich ein neuer Tab mit unserer vollständigen Datenschutzrichtlinie.',
    fr: 'Un nouvel onglet s\'ouvrira avec notre politique de confidentialité complète.'
  }
};

const VIEW_BUTTON = {
  es: 'Ver documento',
  en: 'View document',
  pt: 'Ver documento',
  it: 'Visualizza documento',
  de: 'Dokument anzeigen',
  fr: 'Voir le document'
};

export default function TermsModal({ language, type, onClose }: TermsModalProps) {
  const openDocument = () => {
    const endpoint = type === 'terms' ? 'terms' : 'privacy';
    const url = `${BACKEND_URL}/${endpoint}?lang=${language}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {TITLES[type][language]}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            {DESCRIPTIONS[type][language]}
          </p>

          <button
            onClick={openDocument}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            {VIEW_BUTTON[language]}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-300 active:scale-95 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}