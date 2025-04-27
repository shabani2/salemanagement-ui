/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/stores/slices/auth/authSlice';

interface LayoutProps {
  children: ReactNode;
}

export default function BaseLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const noLayoutPages = ['/login'];
  const user = useSelector(selectAuthUser);

  if (noLayoutPages.includes(pathname)) {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 w-full">
      <Navbar isOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <main className="flex-1 overflow-auto p-6 mt-16">{children}</main>
          <footer className="h-[72px] w-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center border-t">
            <Footer />
          </footer>
        </div>
      </div>
    </div>
  );
}
