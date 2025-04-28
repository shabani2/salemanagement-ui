'use client';

import { useState, ReactNode, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/stores/slices/auth/authSlice';
import { ClipLoader } from 'react-spinners';

interface LayoutProps {
  children: ReactNode;
}

export default function BaseLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const noLayoutPages = ['/login'];
  const user = useSelector(selectAuthUser);

  useEffect(() => {
    if (loading) {
      setLoading(false);
    }
  }, [pathname]); // 🔥 ECOUTER PATHNAME pour désactiver le loader

  if (noLayoutPages.includes(pathname)) {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 w-full">
      <Navbar isOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} setLoading={setLoading} />
        <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <main className="flex-1 overflow-auto p-6 mt-16">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <ClipLoader color="#22c55e" size={60} />
              </div>
            ) : (
              children
            )}
          </main>
          <footer className="h-[72px] w-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center border-t">
            <Footer />
          </footer>
        </div>
      </div>
    </div>
  );
}
