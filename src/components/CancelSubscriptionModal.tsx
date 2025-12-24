import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import type { Language } from '../App';

const I18N = {
  title: {
    es: 'Cancelar suscripción',
    en: 'Cancel subscription',
    pt: 'Cancelar assinatura',
    it: 'Annulla abbonamento',
    de: 'Abonnement kündigen',
    fr: 'Annuler l\'abonnement'
  },
  message: {
    es: 'Serás redirigido a la App Store para gestionar tu suscripción.',
    en: 'You will be redirected to the App Store to manage your subscription.',
    pt: 'Você será redirecionado para a App Store para gerenciar sua assinatura.',
    it: 'Verrai reindirizzato all\'App Store per gestire il tuo abbonamento.',
    de: 'Du wirst zum App Store weitergeleitet, um dein Abonnement zu verwalten.',
    fr: 'Vous serez redirigé vers l\'App Store pour gérer votre abonnement.'
  },
  goToAppStore: {
    es: 'Ir a App Store',
    en: 'Go to App Store',
    pt: 'Ir para App Store',
    it: 'Vai all\'App Store',
    de: 'Zum App Store',
    fr: 'Aller à l\'App Store'
  },
  back: {
    es: 'Volver',
    en: 'Back',
    pt: 'Voltar',
    it: 'Indietro',
    de: 'Zurück',
    fr: 'Retour'
  },
  processing: {
    es: 'Procesando...',
    en: 'Processing...',
    pt: 'Processando...',
    it: 'Elaborazione...',
    de: 'Wird verarbeitet...',
    fr: 'Traitement...'
  }
};

interface CancelSubscriptionModalProps {
  language: Language;
  deviceId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CancelSubscriptionModal({
  language,
  deviceId,
  onClose,
  onSuccess
}: CancelSubscriptionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGoToAppStore = async () => {
    setIsProcessing(true);

    // Register cancellation intent in backend
    try {
      const response = await fetch('https://backend.movilive.es/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          device_id: deviceId,
          platform: 'ios'
        })
      });

      if (response.ok) {
        console.log('[CancelSubscription] ✅ Cancellation registered in backend');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('[CancelSubscription] ❌ Failed to register cancellation:', response.status);
      }
    } catch (error) {
      console.error('[CancelSubscription] ❌ Error calling cancellation API:', error);
    }

    // Open App Store subscriptions page
    try {
      await Browser.open({
        url: 'https://apps.apple.com/account/subscriptions'
      });

      onClose();
    } catch (error) {
      console.error('[CancelSubscription] ❌ Error opening App Store:', error);
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    return (
      <>
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ExternalLink className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            {I18N.message[language]}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoToAppStore}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3.5 px-4 rounded-xl text-sm font-semibold transition-all"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {I18N.processing[language]}
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                {I18N.goToAppStore[language]}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-700 py-3.5 px-4 rounded-xl text-sm font-medium transition-all"
          >
            {I18N.back[language]}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed inset-4 sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 sm:w-auto sm:max-w-md z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {I18N.title[language]}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {renderContent()}
      </div>
    </>
  );
}