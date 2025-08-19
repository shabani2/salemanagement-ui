/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { FileUpload } from 'primereact/fileupload';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/stores/store';
import { updateUser } from '@/stores/slices/users/userSlice';
import type { User as BaseUser } from '@/Models/UserType';

type UserWithRegion = BaseUser & {
  region?: string;
  pointVente?: { nom?: string };
};

type User = UserWithRegion;
import { API_URL } from '@/lib/apiConfig';

/* ----------------------------- Helpers robustes ---------------------------- */
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const safeUrlJoin = (base?: string, path?: string) =>
  isNonEmptyString(base) && isNonEmptyString(path)
    ? `${base}/${path.replace('../', '').replace(/^\/+/, '')}`
    : '';
const isFile = (v: unknown): v is File => typeof File !== 'undefined' && v instanceof File;

/* -------------------------------- Component -------------------------------- */
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);
  const menu = useRef<Menu>(null);

  const [dialogType, setDialogType] = useState<'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // lecture user côté client (safe)
  const storedUser: User | null =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem('user-agricap') || 'null');
          } catch {
            return null;
          }
        })()
      : null;

  useEffect(() => {
    if (storedUser) {
      setSelectedUser(storedUser);
    }
  }, [storedUser]);

  // à l'ouverture du dialog, cloner l’utilisateur courant
  useEffect(() => {
    if (dialogType === 'edit' && selectedUser) {
      setEditedUser({ ...selectedUser });
      setAvatarFile(null);
    }
  }, [dialogType, selectedUser]);

  const menuItems = useMemo(
    () => [
      { label: 'Modifier', icon: 'pi pi-pencil', command: () => setDialogType('edit') },
      // { label: 'Supprimer', icon: 'pi pi-trash' }, // (optionnel)
    ],
    []
  );

  const currentAvatarUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    if (isNonEmptyString(selectedUser?.image)) return safeUrlJoin(API_URL(), selectedUser!.image!);
    return '';
  }, [avatarFile, selectedUser]);

  const handleUpdate = useCallback(async () => {
    if (!editedUser) return;
    setLoading(true);
    try {
      // Construire payload: FormData si avatarFile, sinon JSON
      let payload: Record<string, unknown> = { ...editedUser };
      if (avatarFile && isFile(avatarFile)) {
        const fd = new FormData();
        Object.entries(editedUser).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          // éviter d’écraser "image" si on a un File; on l’ajoute séparément
          if (k !== 'image') fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        });
        fd.append('image', avatarFile);
        // @ts-ignore (RTK has matchers)
        payload = fd;
      }

      // @ts-ignore
      const result = await dispatch(updateUser(payload));
      // @ts-ignore (RTK has matchers)
      if (updateUser.fulfilled?.match?.(result) || result?.meta?.requestStatus === 'fulfilled') {
        const updated = avatarFile
          ? { ...editedUser, image: selectedUser?.image ?? '' } // backend retournera probablement le chemin, mais on mettra à jour après re-fetch
          : editedUser;

        // MàJ locale (idéalement re-fetch depuis backend)
        setSelectedUser(updated);
        try {
          // merge & persist localStorage
          const next: User = { ...(selectedUser as User), ...(editedUser as User) };
          localStorage.setItem('user-agricap', JSON.stringify(next));
        } catch {}
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Profil mis à jour.',
          life: 2500,
        });
        setDialogType(null);
      } else {
        throw new Error('Mise à jour non aboutie');
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: `Échec de la mise à jour du profil.: ${error}`,
        life: 3500,
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch, editedUser, avatarFile, selectedUser]);

  if (!selectedUser) {
    return <p className="text-center text-gray-600">Utilisateur non trouvé.</p>;
  }

  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion du profil' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Profil</h2>
      </div>

      <Card className="w-full h-full shadow-lg rounded-none overflow-hidden p-0">
        <div className="relative bg-gradient-to-r from-indigo-700 to-purple-600 h-40 md:h-56 lg:h-72 flex justify-center items-center">
          <div className="absolute -bottom-20 md:-bottom-24 z-10">
            {isNonEmptyString(currentAvatarUrl) ? (
              <img
                src={currentAvatarUrl}
                alt="Avatar"
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl bg-gray-300 flex items-center justify-center">
                <span>Pas d&apos;image</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-28 md:pt-32 px-5 pb-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">
            {`${selectedUser?.prenom ?? ''} ${selectedUser?.nom ?? ''}`.trim() || '—'}
          </h2>
          {isNonEmptyString(selectedUser?.region) && <p>🌍 {selectedUser.region}</p>}
          {selectedUser?.pointVente && <p>🏬 {selectedUser.pointVente?.nom}</p>}

          <div className="mt-4 text-gray-600 text-sm md:text-base">
            {isNonEmptyString(selectedUser?.email) && <p>📧 {selectedUser!.email}</p>}
            {isNonEmptyString(selectedUser?.telephone) && <p>📞 {selectedUser!.telephone}</p>}
            {isNonEmptyString(selectedUser?.adresse) && <p>📍 {selectedUser!.adresse}</p>}
            {isNonEmptyString(selectedUser?.region) && <p>🌍 {selectedUser.region}</p>}
            {(selectedUser as User)?.pointVente && (
              <p>🏬 {(selectedUser as User).pointVente?.nom}</p>
            )}
          </div>

          <div className="hidden md:flex mt-6 justify-center gap-3">
            <Button
              label="Modifier"
              icon="pi pi-pencil"
              className="p-button-rounded p-button-primary p-button-sm !bg-green-700 text-white hover:!bg-green-800"
              onClick={() => setDialogType('edit')}
            />
          </div>

          <div className="flex md:hidden justify-center mt-6">
            <Menu model={menuItems} popup ref={menu} />
            <Button
              icon="pi pi-ellipsis-v"
              className="p-button-text p-button-sm !bg-green-700 text-white hover:!bg-green-800"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => menu.current?.toggle(e)}
              aria-haspopup
              aria-controls="popup_menu"
            />
          </div>
        </div>
      </Card>

      {/* Dialog Edition */}
      <Dialog
        visible={dialogType === 'edit'}
        header="Modifier l’utilisateur"
        onHide={() => setDialogType(null)}
        style={{ width: '50vw', height: '70vh', maxWidth: 800 }}
        modal
      >
        <div className="flex flex-col h-full">
          <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
            <div className="flex space-x-4">
              {(
                [
                  { name: 'nom', placeholder: 'Nom', icon: 'pi-user' },
                  { name: 'prenom', placeholder: 'Prénom', icon: 'pi-user' },
                ] as const
              ).map(({ name, placeholder, icon }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    name={name}
                    placeholder={placeholder}
                    //@ts-ignore
                    value={(editedUser as Partial<User>)?.[name as keyof User] ?? ''}
                    onChange={(e) =>
                      setEditedUser((p) => (p ? { ...p, [name]: e.target.value } : p))
                    }
                    className="w-full pr-10"
                  />
                  <i className={`pi ${icon} absolute right-2 text-gray-500 text-lg`} />
                </div>
              ))}
            </div>

            <div className="flex space-x-4">
              {(
                [
                  { name: 'telephone', placeholder: 'Téléphone', icon: 'pi-phone' },
                  { name: 'email', placeholder: 'Email', icon: 'pi-envelope' },
                ] as const
              ).map(({ name, placeholder, icon }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type={name === 'email' ? 'email' : 'text'}
                    name={name}
                    placeholder={placeholder}
                    value={(editedUser as User)?.[name] ?? ''}
                    onChange={(e) =>
                      setEditedUser((p) => (p ? { ...p, [name]: e.target.value } : p))
                    }
                    className="w-full pr-10"
                  />
                  <i className={`pi ${icon} absolute right-2 text-gray-500 text-lg`} />
                </div>
              ))}
            </div>

            <div className="relative flex items-center">
              <InputText
                type="text"
                name="adresse"
                placeholder="Adresse"
                value={editedUser?.adresse ?? ''}
                onChange={(e) => setEditedUser((p) => (p ? { ...p, adresse: e.target.value } : p))}
                className="w-full pr-10"
              />
              <i className="pi pi-map-marker absolute right-2 text-gray-500 text-lg" />
            </div>

            <FileUpload
              mode="basic"
              accept="image/*"
              maxFileSize={1_000_000}
              chooseLabel="Choisir une image"
              onSelect={(e) => {
                const f = e.files?.[0];
                if (f && isFile(f)) setAvatarFile(f);
              }}
              className="w-full mt-2"
              chooseOptions={{
                className: 'bg-green-700 text-white hover:bg-green-800 border-none',
              }}
            />
          </div>

          <div className="p-2 border-t flex justify-end bg-white">
            <Button
              label="Mettre à jour"
              className="!bg-green-700 text-white"
              onClick={handleUpdate}
              loading={loading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Page;
