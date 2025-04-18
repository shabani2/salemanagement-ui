import ReduxProvider from '@/components/ui/ReduxProvider';
import './globals.css';
import BaseLayout from '@/components/ui/LayoutComponents/BaseLayout';
import ProtectedRoute from '@/components/ui/auth/ProtectedRoute';
import 'primereact/resources/themes/lara-light-indigo/theme.css'; // ou un autre thème
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

export const metadata = {
  title: 'Agricap',
  description: 'Une application Next.js avec Sidebar et Navbar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="flex h-screen">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body className="w-full">
        <ReduxProvider>
          <ProtectedRoute>
            <BaseLayout>{children}</BaseLayout>
          </ProtectedRoute>
        </ReduxProvider>
      </body>
    </html>
  );
}
