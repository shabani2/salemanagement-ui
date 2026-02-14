// ======================================================================
// 3) app/components/Navbar.tsx  — sécuriser handleLogout
// ======================================================================
'use client';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
import { afterLogoutCleanup, removeAxiosAuthHeader } from '@/lib/apiConfig';

interface NavbarProps {
  onMenuClick: () => void;
  isOpen: boolean;
  onNavigate: (path: string) => void;
}

export function Navbar({ onMenuClick, isOpen, onNavigate }: NavbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      // ignore & proceed
    } finally {
      // ✅ Double sécurité locale
      afterLogoutCleanup();
      removeAxiosAuthHeader();
      setUser(null);
      onNavigate('/login');
      setIsLoggingOut(false);
    }
  };

  const getHeaderTitle = () => {
    if (!user?.role) return 'Tableau de Bord';
    const roleId = isUserRole(user.role);
    switch (roleId) {
      case 1: return 'Dépôt Central';
      case 2: return isRegion(user.region) ? user.region.nom : 'Région';
      case 3:
      case 4:
      case 5: return isPointVente(user.pointVente) ? user.pointVente.nom : 'Point de Vente';
      default: return 'Tableau de Bord';
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('user-agricap');
    if (!raw) { setUser(null); return; }
    try {
      const parsed: User = JSON.parse(raw);
      if (!user || parsed?.id !== user?.id) setUser(parsed);
    } catch { setUser(null); }
  }, [pathname]);

  const imagePath = useMemo(() => resolveFinalImagePath(user?.image, '1'), [user?.image]);

  return (
    <nav
      className="fixed top-0 !bg-green-700 text-gray-100 shadow flex justify-between items-center p-4 z-50 transition-all duration-300"
      style={{ left: isOpen ? '16rem' : '0', width: isOpen ? 'calc(100% - 16rem)' : '100%' }}
    >
      <div className="flex justify-start">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="mr-2 outline-none cursor-pointer">
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
            <h3 className="mr-2 text-[1.5rem] font-bold">{user ? `${user.nom} ${user.prenom}` : ''}</h3>
            <img src={imagePath} width={32} height={32} className="rounded-full cursor-pointer" alt="User" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate('/generals/profile')} className="cursor-pointer">
              <i className="pi pi-user text-blue-600 mr-2" /> Profil
            </DropdownMenuItem>
            {user?.role === 'SuperAdmin' && (
              <DropdownMenuItem onClick={() => onNavigate('/superAdmin/abonnements')} className="cursor-pointer">
                <i className="pi pi-users text-green-600 mr-2" /> Abonnements
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" disabled={isLoggingOut}>
              <i className="pi pi-sign-out text-red-600 mr-2" /> {isLoggingOut ? 'Déconnexion…' : 'Déconnexion'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
