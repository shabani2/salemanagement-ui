'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import avatar1 from '@/assets/images/globals/avatar1.jpg';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { logoutUser } from '@/stores/slices/auth/authSlice';
import { AppDispatch } from '@/stores/store';

export default function UserMenuClient() {
  const [user, setUser] = useState<{ nom?: string; prenom?: string } | null>(null);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    try {
      const localUser = JSON.parse(localStorage.getItem('user-agricap') || '{}');
      setUser(localUser);
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      router.push('/login');
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none flex flex-row">
        <h3 className="mr-2">{`${user?.nom ?? ''} ${user?.prenom ?? ''}`}</h3>
        <Image src={avatar1} width={32} height={32} className="rounded-full cursor-pointer" alt="User" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push('/generals/profile')}>Profil</DropdownMenuItem>
        <DropdownMenuItem>Paramètres</DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>Déconnexion</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
