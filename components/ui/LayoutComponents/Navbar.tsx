// file: app/components/Navbar.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdowns/dropdown-menu';
import { Menu } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import { logoutUser } from '@/stores/slices/auth/authSlice';
import { usePathname } from 'next/navigation';
import { User, isRegion, isPointVente } from '../../../Models/UserType';
import { isUserRole } from '@/lib/utils';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { resolveFinalImagePath } from '@/lib/utils/baseUrl';

interface NavbarProps {
  onMenuClick: () => void;
  isOpen: boolean;
  onNavigate: (path: string) => void;
}

export function Navbar({ onMenuClick, isOpen, onNavigate }: NavbarProps) {
  const dispatch = useDispatch<AppDispatch>();

  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      localStorage.removeItem('user-agricap');
      setUser(null);
      onNavigate('/login');
    });
  };

  const getHeaderTitle = () => {
    if (user && !user?.role) return 'Tableau de Bord';
    const roleId = user && isUserRole(user?.role);
    switch (roleId) {
      case 1:
        return 'Dépôt Central';
      case 2:
        return user && isRegion(user.region) ? user.region.nom : 'Région';
      case 3:
      case 4:
      case 5:
        return user && isPointVente(user.pointVente) ? user.pointVente.nom : 'Point de Vente';
      default:
        return 'Tableau de Bord';
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('user-agricap');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (!user || parsed?.id !== user?.id) {
          setUser(parsed);
        }
      } catch (e) {
        console.error('Erreur parsing:', e);
      }
    } else {
      setUser(null);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - typage imprécis de la lib externe
  }, [pathname]); // 🔥 relit user sur changement de route

  const imagePath: string = resolveFinalImagePath(user?.image, '1');
  return (
    <nav
      className={`fixed top-0 !bg-green-700 text-gray-100 shadow flex justify-between items-center p-4 z-50 transition-all duration-300`}
      style={{
        left: isOpen ? '16rem' : '0',
        width: isOpen ? 'calc(100% - 16rem)' : '100%',
      }}
    >
      <div className="flex justify-start">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mr-2 outline-none cursor-pointer"
        >
          <Menu className="w-6 h-6 cursor-pointer" />
        </Button>
        <h1 className="text-xl font-semibold">{getHeaderTitle()}</h1>
      </div>

      <div className="flex items-center">
        <div className="hidden md:flex items-center mr-4">
          <ThemeSwitcher />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none flex flex-row items-center">
            <h3 className="mr-2 text-[1.5rem] font-bold">
              {user ? `${user.nom} ${user.prenom}` : ''}
            </h3>
           
              <img
                src={imagePath}
                width={32}
                height={32}
                className="rounded-full cursor-pointer"
                alt="User"
              />
            
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onNavigate('/generals/profile')}
              className="cursor-pointer"
            >
              <i className="pi pi-user text-blue-600 mr-2" />
              Profil
            </DropdownMenuItem>
            {user && user?.role === 'SuperAdmin' && (
              <DropdownMenuItem
                onClick={() => onNavigate('/superAdmin/abonnements')}
                className="cursor-pointer"
              >
                <i className="pi pi-users text-green-600 mr-2" />
                Abonnements
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <i className="pi pi-sign-out text-red-600 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
