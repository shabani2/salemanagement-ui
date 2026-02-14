/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '@/stores/slices/auth/authSlice';
import { RootState } from '@/stores/store';
import { filterRoutesByRole } from '@/lib/roleFilter';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { selectCurrentOrganisation } from '@/stores/slices/organisation/organisationSlice';
import { useTenantOrganisation } from '@/hooks/useTenantOrganisation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const authUser = useSelector((state: RootState) => selectAuthUser(state));
  const org = useSelector((state: RootState) => selectCurrentOrganisation(state));

  const menuItems = useMemo(() => {
    return authUser?.role ? filterRoutesByRole(authUser.role) : [];
  }, [authUser?.role]);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };
  const { organisation, loading, error, tenantId, tenantSlug, refresh } =
    useTenantOrganisation();
  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 !bg-green-900 text-white flex flex-col transition-transform z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-64'
      }`}
    >
      <div className="flex justify-between items-center p-3">
        <span className="text-lg font-bold">{organisation?.nom ?? 'not defined'}</span>

        {org?.logo && org.logo.trim() !== '' && (
          <img
            src={`http://localhost:8000/${org.logo.replace('../', '')}`}
            width={64}
            height={64}
            className="rounded-full cursor-pointer"
            alt="Organisation"
          />
        )}

        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="h-[5px] bg-green-700" />

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
        

          {menuItems.map(({ path, title, icon }) => (
            <li key={path}>
              <Link
                href={path}
                prefetch
                className={`flex items-center px-4 py-2 rounded w-full text-left transition cursor-pointer ${
                  isActive(path)
                    ? '!bg-green-700 text-gray-100'
                    : 'hover:!bg-green-400 hover:text-white'
                }`}
              >
                <i className={`pi mr-2 ${icon} text-lg`} />
                {title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="p-4 text-center text-sm border-t border-gray-700">
        &copy; {new Date().getFullYear()} {organisation?.nom}
      </footer>
    </aside>
  );
}
