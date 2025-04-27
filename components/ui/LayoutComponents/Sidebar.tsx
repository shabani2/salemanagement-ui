/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { adminPVRoutes, adminZoneRoutes, superAdminRoutes, vendeurRoutes } from '@/lib/route';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/stores/slices/auth/authSlice';
import { ClipLoader } from 'react-spinners';
import { RootState } from '@/stores/store';


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const authUser = useSelector((state: RootState) => selectAuthUser(state));
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authUser?.role) {
      switch (authUser.role.toLowerCase()) {
        case 'vendeur':
          setMenuItems(vendeurRoutes);
          break;
        case 'adminpv':
          setMenuItems(adminPVRoutes);
          break;
        case 'adminzone':
          setMenuItems(adminZoneRoutes);
          break;
        case 'superadmin':
          setMenuItems(superAdminRoutes);
          break;
        default:
          setMenuItems([]);
      }
    }
  }, [authUser]);

  const handleNavigation = async (path: string) => {
    setLoading(true);
    await router.push(path);
    setLoading(false);
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-green-500 text-white flex flex-col transition-transform ${
        isOpen ? 'translate-x-0' : '-translate-x-64'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <span className="text-lg font-bold">AgriCap</span>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Loader de navigation */}
      {loading && (
        <div className="flex justify-center items-center py-4">
          <ClipLoader color="bg-green-900" size={55} />
        </div>
      )}

      {/* Menu Dynamique */}
      <nav className="flex-1 p-4">
        <ul className="space-y-3">
          {menuItems.map(({ path, title, icon }) => (
            <li key={path} className="mb-0 ">
              <button
                onClick={() => handleNavigation(path)}
                className={`flex cursor-pointer items-center px-4 py-2 rounded w-full text-left ${
                  pathname === path ? 'bg-green-900 text-gray-100' : 'hover:bg-green-500'
                }`}
              >
                <i className={`pi mr-2 ${icon} text-lg`} />
                {title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <footer className="p-4 text-center text-sm border-t border-gray-700">
        &copy; {new Date().getFullYear()} AgriCap
      </footer>
    </aside>
  );
}
