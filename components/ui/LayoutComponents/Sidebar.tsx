/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { selectAuthUser } from '@/stores/slices/auth/authSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { filterRoutesByRole } from '@/lib/roleFilter';
import {
  fetchDefaultOrganisationLogo,
  selectCurrentOrganisation,
} from '@/stores/slices/organisation/organisationSlice';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  setLoading: (loading: boolean) => void;
}

export function Sidebar({ isOpen, onClose, setLoading }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const authUser = useSelector((state: RootState) => selectAuthUser(state));
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const org = useSelector((state: RootState) => selectCurrentOrganisation(state));

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (authUser?.role) {
      setMenuItems(filterRoutesByRole(authUser.role));
    }
    dispatch(fetchDefaultOrganisationLogo());
  }, [authUser]);

  const handleNavigation = (path: string) => {
    setLoading(true);
    router.push(path);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };
  // console.log('logo', logo);
  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 !bg-green-900 text-white flex flex-col transition-transform ${
        isOpen ? 'translate-x-0' : '-translate-x-64'
      }`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <span className="text-lg font-bold">AgriCap</span>

        <img
          src={org && `http://localhost:8000/${org?.logo.replace('../', '')}`}
          width={64}
          height={64}
          className="rounded-full cursor-pointer"
          alt="User"
        />
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map(({ path, title, icon }) => (
            <li key={path}>
              <button
                onClick={() => handleNavigation(path)}
                className={`flex items-center px-4 py-2 rounded w-full text-left transition cursor-pointer ${
                  isActive(path)
                    ? '!bg-green-700 text-gray-100'
                    : 'hover:!bg-green-400 hover:text-white'
                }`}
              >
                <i className={`pi mr-2 ${icon} text-lg`} />
                {title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="p-4 text-center text-sm border-t border-gray-700">
        &copy; {new Date().getFullYear()} AgriCap
      </footer>
    </aside>
  );
}
