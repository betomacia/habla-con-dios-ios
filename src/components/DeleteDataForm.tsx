import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, History, UserX } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import type { Language } from '../App';
import { AuthService } from '../services/AuthService';

interface DeleteDataFormProps {
  language: Language;
  deviceId: string;
  onClose: () => void;
  hasActiveSubscription?: boolean;
  onLogout?: () => void;
}

const I18N = {
  title: {
    es: 'Eliminar Datos',
    en: 'Delete Data',
    pt: 'Excluir Dados',
    it: 'Elimina Dati',
    de: 'Daten Löschen',
    fr: 'Supprimer les Données',
  },
  subtitle: {
    es: '¿Qué deseas eliminar?',
    en: 'What do you want to delete?',
    pt: 'O que você deseja excluir?',
    it: 'Cosa vuoi eliminare?',
    de: 'Was möchtest du löschen?',
    fr: 'Que voulez-vous supprimer?',
  },
  conversationsOption: {
    es: 'Borrar conversaciones',
    en: 'Delete conversations',
    pt: 'Excluir conversas',
    it: 'Elimina conversazioni',
    de: 'Gespräche löschen',
    fr: 'Supprimer les conversations',
  },
  conversationsDesc: {
    es: 'Se borrarán todas tus conversaciones. Tu cuenta y suscripción se mantendrán.',
    en: 'All your conversations will be deleted. Your account and subscription will remain.',
    pt: 'Todas as suas conversas serão excluídas. Sua conta e assinatura permanecerão.',
    it: 'Tutte le tue conversazioni saranno eliminate. Il tuo account e abbonamento rimarranno.',
    de: 'Alle deine Gespräche werden gelöscht. Dein Konto und Abonnement bleiben erhalten.',
    fr: 'Toutes vos conversations seront supprimées. Votre compte et abonnement resteront.',
  },
  personalDataOption: {
    es: 'Borrar datos personales',
    en: 'Delete personal data',
    pt: 'Excluir dados pessoais',
    it: 'Elimina dati personali',
    de: 'Persönliche Daten löschen',
    fr: 'Supprimer les données personnelles',
  },
  personalDataDesc: {
    es: 'Se eliminarán tu nombre, género, idioma, historial de conversaciones y toda la información asociada a tu cuenta.',
    en: 'Your name, gender, language, conversation history and all information associated with your account will be deleted.',
    pt: 'Seu nome, gênero, idioma, histórico de conversas e todas as informações associadas à sua conta serão excluídos.',
    it: 'Il tuo nome, genere, lingua, cronologia conversazioni e tutte le informazioni associate al tuo account saranno eliminati.',
    de: 'Dein Name, Geschlecht, Sprache, Gesprächsverlauf und alle mit deinem Konto verbundenen Informationen werden gelöscht.',
    fr: 'Votre nom, sexe, langue, historique des conversations et toutes les informations associées à votre compte seront supprimés.',
  },
  confirmDeleteConversations: {
    es: '¿Estás seguro de que quieres borrar todas tus conversaciones? Esta acción no se puede deshacer.',
    en: 'Are you sure you want to delete all your conversations? This action cannot be undone.',
    pt: 'Tem certeza de que deseja excluir todas as suas conversas? Esta ação não pode ser desfeita.',
    it: 'Sei sicuro di voler eliminare tutte le tue conversazioni? Questa azione non può essere annullata.',
    de: 'Bist du sicher, dass du alle deine Gespräche löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.',
    fr: 'Êtes-vous sûr de vouloir supprimer toutes vos conversations? Cette action ne peut pas être annulée.',
  },
  confirmDeletePersonalData: {
    es: '¿Estás seguro de que quieres borrar todos tus datos personales? Se eliminarán tu nombre, género, idioma, historial de conversaciones y toda la información asociada a tu cuenta. Esta acción no se puede deshacer.',
    en: 'Are you sure you want to delete all your personal data? Your name, gender, language, conversation history and all information associated with your account will be deleted. This action cannot be undone.',
    pt: 'Tem certeza de que deseja excluir todos os seus dados pessoais? Seu nome, gênero, idioma, histórico de conversas e todas as informações associadas à sua conta serão excluídos. Esta ação não pode ser desfeita.',
    it: 'Sei sicuro di voler eliminare tutti i tuoi dati personali? Il tuo nome, genere, lingua, cronologia conversazioni e tutte le informazioni associate al tuo account saranno eliminati. Questa azione non può essere annullata.',
    de: 'Bist du sicher, dass du alle deine persönlichen Daten löschen möchtest? Dein Name, Geschlecht, Sprache, Gesprächsverlauf und alle mit deinem Konto verbundenen Informationen werden gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
    fr: 'Êtes-vous sûr de vouloir supprimer toutes vos données personnelles? Votre nom, sexe, langue, historique des conversations et toutes les informations associées à votre compte seront supprimés. Cette action ne peut pas être annulée.',
  },
  confirmButton: {
    es: 'Sí, eliminar',
    en: 'Yes, delete',
    pt: 'Sim, excluir',
    it: 'Sì, elimina',
    de: 'Ja, löschen',
    fr: 'Oui, supprimer',
  },
  cancel: {
    es: 'Cancelar',
    en: 'Cancel',
    pt: 'Cancelar',
    it: 'Annulla',
    de: 'Abbrechen',
    fr: 'Annuler',
  },
  processing: {
    es: 'Eliminando...',
    en: 'Deleting...',
    pt: 'Excluindo...',
    it: 'Eliminando...',
    de: 'Löschen...',
    fr: 'Suppression...',
  },
  successConversations: {
    es: 'Conversaciones eliminadas correctamente',
    en: 'Conversations deleted successfully',
    pt: 'Conversas excluídas com sucesso',
    it: 'Conversazioni eliminate con successo',
    de: 'Gespräche erfolgreich gelöscht',
    fr: 'Conversations supprimées avec succès',
  },
  successPersonalData: {
    es: 'Datos personales eliminados correctamente',
    en: 'Personal data deleted successfully',
    pt: 'Dados pessoais excluídos com sucesso',
    it: 'Dati personali eliminati con successo',
    de: 'Persönliche Daten erfolgreich gelöscht',
    fr: 'Données personnelles supprimées avec succès',
  },
  error: {
    es: 'Error al eliminar. Intenta de nuevo.',
    en: 'Error deleting. Please try again.',
    pt: 'Erro ao excluir. Tente novamente.',
    it: 'Errore durante l\'eliminazione. Riprova.',
    de: 'Fehler beim Löschen. Bitte erneut versuchen.',
    fr: 'Erreur lors de la suppression. Veuillez réessayer.',
  },
  subscriptionWarning: {
    es: 'Para borrar tus datos personales, primero debes cancelar tu suscripción',
    en: 'To delete your personal data, you must first cancel your subscription',
    pt: 'Para excluir seus dados pessoais, primeiro você deve cancelar sua assinatura',
    it: 'Per eliminare i tuoi dati personali, devi prima annullare il tuo abbonamento',
    de: 'Um deine persönlichen Daten zu löschen, musst du zuerst dein Abonnement kündigen',
    fr: 'Pour supprimer vos données personnelles, vous devez d\'abord annuler votre abonnement',
  },
  goToGooglePlay: {
    es: 'Ir a Google Play',
    en: 'Go to Google Play',
    pt: 'Ir para Google Play',
    it: 'Vai a Google Play',
    de: 'Zu Google Play',
    fr: 'Aller à Google Play',
  },
};

type ViewState = 'menu' | 'confirm-conversations' | 'confirm-personal-data';

export default function DeleteDataForm({
  language,
  deviceId,
  onClose,
  hasActiveSubscription = false,
  onLogout
}: DeleteDataFormProps) {
  const [view, setView] = useState<ViewState>('menu');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(false);

  const handleDeleteConversations = async () => {
    setLoading(true);
    setError(false);

    try {
      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`https://backend.movilive.es/api/conversations/delete?deviceId=${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess(true);
        setSuccessMessage(I18N.successConversations[language]);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error('[DeleteDataForm] Error deleting conversations:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersonalData = async () => {
    setLoading(true);
    setError(false);

    try {
      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`https://backend.movilive.es/api/user/delete?deviceId=${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess(true);
        setSuccessMessage(I18N.successPersonalData[language]);

        localStorage.clear();

        setTimeout(() => {
          if (onLogout) {
            onLogout();
          }
          window.location.reload();
        }, 2000);
      } else {
        setError(true);
      }
    } catch (e) {
      console.error('[DeleteDataForm] Error deleting personal data:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const openGooglePlaySubscriptions = async () => {
    try {
      await Browser.open({
        url: 'https://play.google.com/store/account/subscriptions'
      });
    } catch (error) {
      console.error('Error opening Google Play:', error);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/10">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-white text-lg">{successMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'menu') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/10 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{I18N.title[language]}</h2>
            <p className="text-white/70">{I18N.subtitle[language]}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setView('confirm-conversations')}
              className="w-full p-4 rounded-xl border-2 border-white/20 bg-white/5 hover:bg-white/10 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <History className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-white">{I18N.conversationsOption[language]}</span>
              </div>
              <p className="text-sm text-white/60">{I18N.conversationsDesc[language]}</p>
            </button>

            {hasActiveSubscription ? (
              <div className="w-full p-4 rounded-xl border-2 border-white/20 bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <UserX className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-gray-400">{I18N.personalDataOption[language]}</span>
                </div>
                <p className="text-sm text-yellow-400 mb-3">{I18N.subscriptionWarning[language]}</p>
                <button
                  onClick={openGooglePlaySubscriptions}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
                >
                  {I18N.goToGooglePlay[language]}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('confirm-personal-data')}
                className="w-full p-4 rounded-xl border-2 border-white/20 bg-white/5 hover:bg-white/10 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <UserX className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-white">{I18N.personalDataOption[language]}</span>
                </div>
                <p className="text-sm text-white/60">{I18N.personalDataDesc[language]}</p>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'confirm-conversations') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/10 relative">
          <button
            onClick={() => setView('menu')}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">{I18N.conversationsOption[language]}</h2>
            <p className="text-white/80 text-sm">{I18N.confirmDeleteConversations[language]}</p>
          </div>

          {error && (
            <p className="text-center text-red-400 text-sm mb-4">{I18N.error[language]}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setView('menu')}
              disabled={loading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {I18N.cancel[language]}
            </button>
            <button
              onClick={handleDeleteConversations}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {loading ? I18N.processing[language] : I18N.confirmButton[language]}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'confirm-personal-data') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/10 relative">
          <button
            onClick={() => setView('menu')}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">{I18N.personalDataOption[language]}</h2>
            <p className="text-white/80 text-sm">{I18N.confirmDeletePersonalData[language]}</p>
          </div>

          {error && (
            <p className="text-center text-red-400 text-sm mb-4">{I18N.error[language]}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setView('menu')}
              disabled={loading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {I18N.cancel[language]}
            </button>
            <button
              onClick={handleDeletePersonalData}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {loading ? I18N.processing[language] : I18N.confirmButton[language]}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
