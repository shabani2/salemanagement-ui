'use client';

import { useTheme } from '@/app/providers/ThemeProvider';
import { Button } from 'primereact/button';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme.includes('dark');

  return (
    <Button
      icon={isDark ? 'pi pi-sun' : 'pi pi-moon'}
      label={isDark ? 'Clair' : 'Sombre'}
      onClick={toggleTheme}
      className="p-button-sm p-button-text p-button-rounded !text-white !border-none !focus:outline-none !ring-0 !focus:ring-0 !shadow-none !hover:shadow-none"
    />
  );
}
