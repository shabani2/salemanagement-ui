'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import ProtectedRoute from '@/components/ui/auth/ProtectedRoute';
import BaseLayout from './BaseLayout';

export default function LayoutRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login/';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <BaseLayout>{children}</BaseLayout>
    </ProtectedRoute>
  );
}
