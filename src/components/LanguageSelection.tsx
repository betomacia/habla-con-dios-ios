interface Props {
  onSelect: (language: string) => void;
}

const languages = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
];

export default function LanguageSelection({ onSelect }: Props) {
  return (
    <div className="w-full h-full flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="space-y-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className="w-full flex items-center justify-center gap-4 py-5 px-6 bg-white/25 backdrop-blur-lg hover:bg-white/35 rounded-2xl transition-all active:scale-95 border border-white/30 hover:border-white/50 shadow-lg"
            >
              <span className="text-5xl drop-shadow-md">{lang.flag}</span>
              <span className="text-2xl font-bold text-white drop-shadow-md">
                {lang.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}