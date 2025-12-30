import { useState } from 'react';
import { UserCircle, Check } from 'lucide-react';

interface UserFormProps {
  language: string;
  onSubmit: (name: string, gender: string) => void;
  loading?: boolean;
}

export default function UserForm({ language, onSubmit, loading = false }: UserFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');

  const translations: Record<string, any> = {
    es: {
      title: 'Información Personal',
      subtitle: 'Completa tus datos para continuar',
      nameLabel: 'Nombre',
      namePlaceholder: 'Ingresa tu nombre',
      genderLabel: 'Sexo',
      male: 'Masculino',
      female: 'Femenino',
      submit: 'Aceptar y activar audio',
      submitting: 'Conectando...',
    },
    en: {
      title: 'Personal Information',
      subtitle: 'Complete your details to continue',
      nameLabel: 'Name',
      namePlaceholder: 'Enter your name',
      genderLabel: 'Gender',
      male: 'Male',
      female: 'Female',
      submit: 'Accept and enable audio',
      submitting: 'Connecting...',
    },
    fr: {
      title: 'Informations Personnelles',
      subtitle: 'Complétez vos informations pour continuer',
      nameLabel: 'Nom',
      namePlaceholder: 'Entrez votre nom',
      genderLabel: 'Sexe',
      male: 'Masculin',
      female: 'Féminin',
      submit: 'Accepter et activer l\'audio',
      submitting: 'Connexion...',
    },
    de: {
      title: 'Persönliche Informationen',
      subtitle: 'Vervollständigen Sie Ihre Daten, um fortzufahren',
      nameLabel: 'Name',
      namePlaceholder: 'Geben Sie Ihren Namen ein',
      genderLabel: 'Geschlecht',
      male: 'Männlich',
      female: 'Weiblich',
      submit: 'Akzeptieren und Audio aktivieren',
      submitting: 'Verbinden...',
    },
    pt: {
      title: 'Informação Pessoal',
      subtitle: 'Complete seus dados para continuar',
      nameLabel: 'Nome',
      namePlaceholder: 'Digite seu nome',
      genderLabel: 'Sexo',
      male: 'Masculino',
      female: 'Feminino',
      submit: 'Aceitar e ativar áudio',
      submitting: 'Conectando...',
    },
    it: {
      title: 'Informazioni Personali',
      subtitle: 'Completa i tuoi dati per continuare',
      nameLabel: 'Nome',
      namePlaceholder: 'Inserisci il tuo nome',
      genderLabel: 'Sesso',
      male: 'Maschile',
      female: 'Femminile',
      submit: 'Accetta e attiva audio',
      submitting: 'Connessione...',
    },
    ca: {
      title: 'Informació Personal',
      subtitle: 'Completa les teves dades per continuar',
      nameLabel: 'Nom',
      namePlaceholder: 'Introdueix el teu nom',
      genderLabel: 'Sexe',
      male: 'Masculí',
      female: 'Femení',
      submit: 'Acceptar i activar àudio',
      submitting: 'Connectant...',
    },
  };

  const t = translations[language] || translations['en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !gender || loading) return;
    
    // Activar audio del dispositivo
    try {
      const audio = new Audio();
      audio.muted = true;
      await audio.play().catch(() => {});
      audio.pause();
    } catch {}
    
    await onSubmit(name.trim(), gender);
  };

  return (
    <div className="w-full">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-full mb-3">
            <UserCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{t.title}</h1>
          <p className="text-sm text-gray-600">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t.nameLabel}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              disabled={loading}
              required
              className="w-full px-4 py-5 text-4xl font-semibold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.genderLabel}
            </label>
            <div className="space-y-2.5">
              {[
                { value: 'male', label: t.male },
                { value: 'female', label: t.female },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3.5 border-2 rounded-xl cursor-pointer transition-all active:scale-95 ${
                    gender === option.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-300 active:border-emerald-300 bg-gray-50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={gender === option.value}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={loading}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                    required
                  />
                  <span className="ml-3 text-base text-gray-700 font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !gender}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 active:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-150 shadow-lg active:shadow-md active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed text-base"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t.submit}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}