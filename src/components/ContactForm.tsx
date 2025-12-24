import React, { useState } from 'react';
import { X, Send, Mail, User, MessageSquare, Check, Loader2 } from 'lucide-react';
import type { Language } from '../App';

const CONTACT_EMAILS: Record<Language, string> = {
  es: "jesusespanol@movilive.com",
  en: "jesusingles@movilive.com",
  pt: "jesusportugues@movilive.com",
  it: "jesusitaliano@movilive.com",
  de: "jesusaleman@movilive.com",
  fr: "jesusfrances@movilive.com",
};

const I18N = {
  title: {
    es: 'Contáctanos',
    en: 'Contact Us',
    pt: 'Fale Conosco',
    it: 'Contattaci',
    de: 'Kontaktiere uns',
    fr: 'Contactez-nous',
  },
  subtitle: {
    es: 'Envíanos tus preguntas, sugerencias o reporta un problema',
    en: 'Send us your questions, suggestions or report an issue',
    pt: 'Envie-nos suas perguntas, sugestões ou reporte um problema',
    it: 'Inviaci le tue domande, suggerimenti o segnala un problema',
    de: 'Sende uns deine Fragen, Vorschläge oder melde ein Problem',
    fr: 'Envoyez-nous vos questions, suggestions ou signalez un problème',
  },
  namePlaceholder: {
    es: 'Tu nombre completo',
    en: 'Your full name',
    pt: 'Seu nome completo',
    it: 'Il tuo nome completo',
    de: 'Dein vollständiger Name',
    fr: 'Votre nom complet',
  },
  emailPlaceholder: {
    es: 'Tu correo electrónico',
    en: 'Your email',
    pt: 'Seu e-mail',
    it: 'La tua email',
    de: 'Deine E-Mail',
    fr: 'Votre e-mail',
  },
  messagePlaceholder: {
    es: 'Escribe tu mensaje aquí...',
    en: 'Write your message here...',
    pt: 'Escreva sua mensagem aqui...',
    it: 'Scrivi il tuo messaggio qui...',
    de: 'Schreibe deine Nachricht hier...',
    fr: 'Écrivez votre message ici...',
  },
  send: {
    es: 'Enviar',
    en: 'Send',
    pt: 'Enviar',
    it: 'Invia',
    de: 'Senden',
    fr: 'Envoyer',
  },
  sending: {
    es: 'Enviando...',
    en: 'Sending...',
    pt: 'Enviando...',
    it: 'Invio...',
    de: 'Senden...',
    fr: 'Envoi...',
  },
  successTitle: {
    es: '¡Mensaje Enviado!',
    en: 'Message Sent!',
    pt: 'Mensagem Enviada!',
    it: 'Messaggio Inviato!',
    de: 'Nachricht Gesendet!',
    fr: 'Message Envoyé!',
  },
  successMessage: {
    es: 'Gracias por contactarnos. Te responderemos pronto.',
    en: 'Thank you for contacting us. We will respond soon.',
    pt: 'Obrigado por entrar em contato. Responderemos em breve.',
    it: 'Grazie per averci contattato. Risponderemo presto.',
    de: 'Danke für deine Nachricht. Wir antworten bald.',
    fr: 'Merci de nous avoir contactés. Nous répondrons bientôt.',
  },
  errorTitle: {
    es: 'Error al Enviar',
    en: 'Error Sending',
    pt: 'Erro ao Enviar',
    it: 'Errore di Invio',
    de: 'Fehler beim Senden',
    fr: 'Erreur d\'Envoi',
  },
  errorMessage: {
    es: 'No se pudo enviar tu mensaje. Intenta de nuevo.',
    en: 'Could not send your message. Please try again.',
    pt: 'Não foi possível enviar sua mensagem. Tente novamente.',
    it: 'Impossibile inviare il messaggio. Riprova.',
    de: 'Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.',
    fr: 'Impossible d\'envoyer votre message. Réessayez.',
  },
  close: {
    es: 'Cerrar',
    en: 'Close',
    pt: 'Fechar',
    it: 'Chiudi',
    de: 'Schließen',
    fr: 'Fermer',
  },
};

interface ContactFormProps {
  language: Language;
  backendUrl: string;
  deviceId?: string;
  onClose: () => void;
}

export default function ContactForm({ language, backendUrl, deviceId, onClose }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const response = await fetch('https://hablacondios.movilive.es/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: 'Contacto desde la app',
          message: deviceId ? `${message.trim()}\n\n---\nDevice ID: ${deviceId}` : message.trim(),
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ContactForm] Error response:', errorData);
        throw new Error('Failed to send');
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');

      // Cerrar después de 3 segundos
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (err) {
      console.error('[ContactForm] Error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">{I18N.title[language]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {I18N.successTitle[language]}
              </h3>
              <p className="text-white/70">
                {I18N.successMessage[language]}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {I18N.errorTitle[language]}
              </h3>
              <p className="text-white/70 mb-4">
                {I18N.errorMessage[language]}
              </p>
              <button
                onClick={() => setError(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                {I18N.close[language]}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-white/70 mb-4">
                {I18N.subtitle[language]}
              </p>

              {/* Nombre */}
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={I18N.namePlaceholder[language]}
                    disabled={loading}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={I18N.emailPlaceholder[language]}
                    disabled={loading}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Mensaje */}
              <div>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={I18N.messagePlaceholder[language]}
                    disabled={loading}
                    required
                    rows={5}
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Botón enviar */}
              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {I18N.sending[language]}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {I18N.send[language]}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}