'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'lara-light-blue' | 'lara-dark-blue';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('lara-light-blue');

  useEffect(() => {
    const stored = localStorage.getItem('app-theme') as Theme;
    setTheme(stored || 'lara-light-blue');
  }, []);

  useEffect(() => {
    const id = 'prime-theme-css';
    let link = document.getElementById(id) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    link.href = `https://unpkg.com/primereact/resources/themes/${theme}/theme.css`;
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'lara-light-blue' ? 'lara-dark-blue' : 'lara-light-blue'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
