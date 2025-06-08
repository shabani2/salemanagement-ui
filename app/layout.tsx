import './globals.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { ReactNode } from 'react';
import ReduxProvider from '@/components/ui/ReduxProvider';
import LayoutRouter from '@/components/ui/LayoutComponents/LayoutRouter';

export const metadata = {
  title: 'Agricap',
  description: 'Une application Next.js avec Sidebar et Navbar',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="flex h-screen !text-[11px] ;">
      <body className="w-full !text-[11px] ">
        <ReduxProvider>
          <LayoutRouter>{children}</LayoutRouter>
        </ReduxProvider>
      </body>
    </html>
  );
}
