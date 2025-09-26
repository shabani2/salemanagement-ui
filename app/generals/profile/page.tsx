/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/stores/store';
import { updateUser } from '@/stores/slices/users/userSlice';
import type { User as BaseUser } from '@/Models/UserType';
import { resolveFinalImagePath } from '@/lib/utils/baseUrl';
import UpdateUserDialog from '@/components/ui/userComponent/updateUserDialog';
import ChangePasswordDialog from '@/components/ui/userComponent/changePasswordDialog';

// ----------------------------- Type Definitions -----------------------------
type UserWithDetails = BaseUser & {
  region?: string;
  pointVente?: { nom?: string };
};

type User = UserWithDetails;

// ----------------------------- Helpers -----------------------------
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

// ----------------------------- Component -----------------------------
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);
  const menu = useRef<Menu>(null);

  const [dialogType, setDialogType] = useState<'edit' | 'password' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialiser l'utilisateur depuis localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user-agricap') || 'null');
        if (storedUser) {
          setSelectedUser(storedUser);
        }
      } catch {
        setSelectedUser(null);
      }
    }
  }, []);

  // Avatar
  const currentAvatarUrl = useMemo(() => {
    return resolveFinalImagePath(selectedUser?.image, '1');
  }, [selectedUser]);

  const openEditDialog = useCallback(() => {
    setDialogType('edit');
  }, []);

  const handleUpdate = useCallback(
    async (fd: FormData) => {
      if (!selectedUser) return;
      setLoading(true);

      try {
        const result = await dispatch(updateUser(fd));

        if (updateUser.fulfilled?.match?.(result)) {
          const updatedUser = result.payload as User;

          setSelectedUser(updatedUser);
          try {
            localStorage.setItem('user-agricap', JSON.stringify(updatedUser));
          } catch (e) {
            console.error('Erreur de persistance locale', e);
          }

          toast.current?.show({
            severity: 'success',
            summary: 'Succès',
            detail: 'Profil mis à jour.',
            life: 2500,
          });

          setDialogType(null);
        } else {
          // @ts-ignore
          throw new Error(result.payload || 'Mise à jour non aboutie');
        }
      } catch (error) {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          // @ts-ignore
          detail: `Échec de la mise à jour du profil: ${error.message || error}`,
          life: 3500,
        });
      } finally {
        setLoading(false);
      }
    },
    [dispatch, selectedUser]
  );

  const menuItems = useMemo(
    () => [
      { label: 'Modifier Profil', icon: 'pi pi-pencil', command: openEditDialog },
      {
        label: 'Changer Mot de passe',
        icon: 'pi pi-lock',
        command: () => setDialogType('password'),
      },
    ],
    [openEditDialog]
  );

  if (!selectedUser) {
    return (
      <p className="text-center text-gray-600 p-8">
        Utilisateur non trouvé. Veuillez vous reconnecter.
      </p>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Toast ref={toast} />

      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Profil' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-white border-0 p-0"
        />
      </div>

      <Card className="w-full h-full shadow-xl rounded-xl overflow-hidden p-0">
        {/* Header Avatar */}
        <div className="relative bg-gradient-to-br from-green-700 to-green-500 h-40 md:h-56 lg:h-72 flex justify-center items-center">
          <div className="absolute -bottom-16 md:-bottom-20 z-10">
            <img
              src={currentAvatarUrl}
              alt="Avatar"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl object-cover"
            />
          </div>
        </div>

        <div className="pt-24 md:pt-28 px-5 pb-8 text-center bg-gray-50">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            {`${selectedUser?.prenom ?? ''} ${selectedUser?.nom ?? ''}`.trim() || '—'}
          </h2>
          <p className="text-sm font-medium text-green-600 mt-1 mb-6 uppercase">
            {selectedUser.role}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-left max-w-4xl mx-auto">
            <ProfileDetailItem icon="pi-envelope" label="Email" value={selectedUser?.email} />
            <ProfileDetailItem icon="pi-phone" label="Téléphone" value={selectedUser?.telephone} />
            <ProfileDetailItem icon="pi-map-marker" label="Adresse" value={selectedUser?.adresse} />
            <ProfileDetailItem icon="pi-user-edit" label="Rôle" value={selectedUser?.role} />

            {isNonEmptyString(selectedUser?.region) && (
              <ProfileDetailItem icon="pi-globe" label="Région" value={selectedUser.region} />
            )}

            {selectedUser?.pointVente?.nom && (
              <ProfileDetailItem
                icon="pi-building"
                label="Point de Vente"
                value={selectedUser.pointVente.nom}
              />
            )}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Button
              label="Modifier Profil"
              icon="pi pi-pencil"
              className="p-button-primary !bg-green-700 text-white hover:!bg-green-800"
              onClick={openEditDialog}
            />
            <Button
              label="Changer Mot de passe"
              icon="pi pi-lock"
              className="p-button-secondary !bg-indigo-600 text-white hover:!bg-indigo-700"
              onClick={() => setDialogType('password')}
            />

            <Menu model={menuItems} popup ref={menu} />
            <Button
              icon="pi pi-ellipsis-v"
              className="p-button-text p-button-sm md:hidden"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => menu.current?.toggle(e)}
              aria-haspopup
              aria-controls="popup_menu"
            />
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      {dialogType === 'edit' && selectedUser && (
        <UpdateUserDialog
          user={selectedUser}
          visible={true}
          onHide={() => setDialogType(null)}
          onUpdate={handleUpdate}
          loading={loading}
        />
      )}
      {dialogType === 'password' && selectedUser && (
        <ChangePasswordDialog
          visible={true}
          onHide={() => setDialogType(null)}
          userId={selectedUser._id ?? ''}
          toast={toast}
        />
      )}
    </div>
  );
};

// ----------------------------- Subcomponent -----------------------------
const ProfileDetailItem: React.FC<{ icon: string; label: string; value?: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
    <i className={`pi ${icon} text-xl text-green-600`} />
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{value || 'Non renseigné'}</p>
    </div>
  </div>
);

export default Page;
