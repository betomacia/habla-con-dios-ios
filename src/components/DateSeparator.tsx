import React from 'react';
import type { Language } from '../App';

const I18N = {
  today: {
    es: 'Hoy',
    en: 'Today',
    pt: 'Hoje',
    it: 'Oggi',
    de: 'Heute',
    fr: "Aujourd'hui"
  },
  yesterday: {
    es: 'Ayer',
    en: 'Yesterday',
    pt: 'Ontem',
    it: 'Ieri',
    de: 'Gestern',
    fr: 'Hier'
  },
  of: {
    es: 'de',
    en: 'of',
    pt: 'de',
    it: 'di',
    de: '',
    fr: ''
  }
};

const MONTHS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
};

interface DateSeparatorProps {
  date: Date;
  language: Language;
}

export function formatChatDate(date: Date, language: Language = 'es'): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return I18N.today[language];
  }

  if (isYesterday) {
    return I18N.yesterday[language];
  }

  const day = date.getDate();
  const month = MONTHS[language][date.getMonth()];
  const year = date.getFullYear();
  const of = I18N.of[language];

  if (language === 'de' || language === 'fr') {
    return `${day}. ${month} ${year}`;
  }

  return `${day} ${of} ${month} ${of} ${year}`;
}

export default function DateSeparator({ date, language }: DateSeparatorProps) {
  const formattedDate = formatChatDate(date, language);

  return (
    <div className="flex justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm">
        {formattedDate}
      </div>
    </div>
  );
}
