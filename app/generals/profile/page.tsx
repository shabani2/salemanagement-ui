/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
//import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { FileUpload } from 'primereact/fileupload';
import { Menu } from 'primereact/menu';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import { updateUser } from '@/stores/slices/users/userSlice';
import { User } from '@/Models/UserType';
//import { UserRoleModel } from '@/lib/utils';

const Page = () => {
  const menu = useRef(null);
  const dispatch = useDispatch<AppDispatch>();

  const menuItems = [
    { label: 'Modifier', icon: 'pi pi-pencil', command: () => setDialogType('edit') },
    { label: 'Supprimer', icon: 'pi pi-trash' },
  ];

  const [loading, setLoading] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);

  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user-agricap') || 'null')
      : null;

  // useEffect(() => {
  //   if (user) {
  //     setSelectedUser(user);
  //   }
  // }, [user]);

  useEffect(() => {
    if (dialogType === 'edit') {
      setEditedUser(user);
    }
  }, [dialogType, selectedUser, user]);

  const handleUpdate = async () => {
    if (!editedUser) return;
    setLoading(true);
    try {
      dispatch(updateUser(editedUser));
      setSelectedUser(editedUser);
      setDialogType(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'utilisateur", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <p className="text-center text-gray-600">Utilisateur non trouvé.</p>;
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion du profil' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-5000">Profil</h2>
      </div>

      <Card className="w-full h-full shadow-lg rounded-none overflow-hidden p-0">
        <div className="relative bg-gradient-to-r from-indigo-700 to-purple-600 h-40 md:h-56 lg:h-72 flex justify-center items-center">
          <div className="absolute -bottom-20 md:-bottom-24 z-10">
            {user.image ? (
              <img
                src={`http://localhost:8000/${user.image.replace('../', '')}`}
                alt="Avatar"
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl object-cover"
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
            {`${user.prenom || ''} ${user.nom || ''}`}
          </h2>
          <p className="text-sm md:text-base text-gray-5000">{user?.role || 'Rôle inconnu'}</p>

          <div className="mt-4 text-gray-5000 text-sm md:text-base">
            {user.email && <p>📧 {user.email}</p>}
            {user.telephone && <p>📞 {user.telephone}</p>}
            {user.adresse && <p>📍 {user.adresse}</p>}
            {user.region && <p>🌍 {user.region}</p>}
            {user?.pointVente && <p>🏬 {user?.pointVente.nom}</p>}
          </div>

          <div className="hidden md:flex mt-6 justify-center gap-3">
            <Button
              label="Modifier"
              icon="pi pi-pencil"
              className="p-button-rounded p-button-primary p-button-sm !bg-green-700 text-white hover:!bg-green-800"
              onClick={() => setDialogType('edit')}
              severity={undefined}
            />
          </div>

          <div className="flex md:hidden justify-center mt-6">
            <Menu model={menuItems} popup ref={menu} />
            <Button
              icon="pi pi-ellipsis-v"
              className="p-button-text p-button-sm !bg-green-700 text-white hover:!bg-green-800"
              //@ts-ignore
              onClick={(e) => menu.current?.toggle(e)}
              aria-haspopup
              aria-controls="popup_menu"
              severity={undefined}
            />
          </div>
        </div>
      </Card>

      <Dialog
        visible={dialogType === 'edit'}
        header="Modifier l’utilisateur"
        onHide={() => setDialogType(null)}
        style={{ width: '50vw', height: '70vh' }}
        modal
      >
        <div className="flex flex-col h-full">
          <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
            <div className="flex space-x-4">
              {(
                [
                  { name: 'nom', placeholder: 'Nom' },
                  { name: 'prenom', placeholder: 'Prénom' },
                ] as const
              ).map(({ name, placeholder }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    name={name}
                    placeholder={placeholder}
                    value={editedUser?.[name] ?? ''}
                    onChange={(e) =>
                      setEditedUser((prev) => ({ ...prev!, [name]: e.target.value }))
                    }
                    className="w-full pr-10"
                  />
                  <i className="pi pi-user absolute right-2 text-gray-5000 text-lg" />
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
                    type="text"
                    name={name}
                    placeholder={placeholder}
                    value={editedUser?.[name] ?? ''}
                    onChange={(e) =>
                      setEditedUser((prev) => ({ ...prev!, [name]: e.target.value }))
                    }
                    className="w-full pr-10"
                  />
                  <i className={`pi ${icon} absolute right-2 text-gray-5000 text-lg`} />
                </div>
              ))}
            </div>

            <div className="relative flex items-center">
              <InputText
                type="text"
                name="adresse"
                placeholder="Adresse"
                value={editedUser?.adresse ?? ''}
                onChange={(e) => setEditedUser((prev) => ({ ...prev!, adresse: e.target.value }))}
                className="w-full pr-10"
              />
              <i className="pi pi-map-marker absolute right-2 text-gray-5000 text-lg" />
            </div>

            <FileUpload
              mode="basic"
              accept="image/*"
              maxFileSize={1000000}
              chooseLabel="Choisir une image"
              onSelect={(e) => {
                const file = e.files[0];
                if (file) {
                  const fileUrl = URL.createObjectURL(file);
                  setEditedUser((prev) => ({ ...prev!, image: fileUrl }));
                }
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
              severity={undefined}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Page;
