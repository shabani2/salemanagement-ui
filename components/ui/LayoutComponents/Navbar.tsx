"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import Image from "next/image";
import avatar1 from "@/assets/images/globals/avatar1.jpg";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/stores/store";
import { logoutUser } from "@/stores/slices/auth/authSlice";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onMenuClick: () => void;
  isOpen: boolean;
}

export function Navbar({ onMenuClick, isOpen }: NavbarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  // const user = localStorage.getItem('user-agricap');
  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user-agricap") || "{}")
      : null;
  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      router.push("/login");
    });
  };
  return (
    <nav
      className={`fixed top-0 bg-white shadow flex justify-between items-center p-4 z-50 transition-all duration-300`}
      style={{
        left: isOpen ? "16rem" : "0", // Décalage vers la droite au lieu de rétrécir
        width: isOpen ? "calc(100% - 16rem)" : "100%", // Largeur ajustée en fonction de `isOpen`
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
        <h1 className="text-xl font-semibold">Tableau de Bord</h1>
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none flex flex-row">
          <h3 className="mr-2">{user && `${user.nom} ${user.prenom}`}</h3>
          <Image
            src={avatar1}
            width={32}
            height={32}
            className="rounded-full cursor-pointer"
            alt="User"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push("/generals/profile ")}>
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem>Paramètres</DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
