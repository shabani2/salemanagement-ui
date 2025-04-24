/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import React from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
//import Image from "next/image";
import { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
//import { Avatar } from 'primereact/avatar';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { updateUser } from '@/stores/slices/users/userSlice';
import { User, UserModel } from '@/Models/UserType';
import { UserRoleModel } from '@/lib/utils';
import { FileUpload } from 'primereact/fileupload';
//import { Menu } from 'lucide-react';
// import { Toast } from 'primereact/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import { Menu } from 'primereact/menu';

const page = () => {
  const menu = useRef(null);
  const menuItems = [
    {
      label: 'Modifier',
      icon: 'pi pi-pencil',
      command: () => setDialogType('edit'),
    },
    {
      label: 'Supprimer',
      icon: 'pi pi-trash',
    },
  ];
  const [loading, setLoading] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  console.log('hello user => ', user);
  const handleUpdate = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      //await apiClient.delete(`/users/${selectedUser._id}`);
      dispatch(updateUser(selectedUser));

      setDialogType(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur", error);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (user) {
      setSelectedUser(user);
    }
  }, []);
  console.log('selected user : ', selectedUser);
  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion du profil' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Profil</h2>
      </div>

      <Card className="w-full h-full shadow-lg rounded-none overflow-hidden p-0 ">
        <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 h-40 md:h-56 lg:h-72 flex justify-center items-center">
          <div className="absolute -bottom-20 md:-bottom-24 z-10">
            <img
              src={`http://localhost:8000/${user.image.replace('../', '')}`}
              alt="Avatar"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl object-cover"
            />
          </div>
        </div>
        <div className="pt-28 md:pt-32 px-5 pb-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">{`${user.prenom} ${user.nom}`}</h2>
          <p className="text-sm md:text-base text-gray-500">{user.role}</p>
          <div className="mt-4 text-gray-700 text-sm md:text-base">
            <p>📧 {user.email}</p>
            <p>📞 {user.telephone}</p>
            <p>📍 {user.adresse}</p>
            {user.region && <p>🌍 {user.region}</p>}
            {user.pointVente && <p>🏬 {user.pointVente}</p>}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex mt-6 justify-center gap-3">
            <Button
              label="Modifier"
              icon="pi pi-pencil"
              className="p-button-rounded p-button-primary p-button-sm"
              onClick={() => setDialogType('edit')}
            />
          </div>

          {/* Mobile menu */}
          <div className="flex md:hidden justify-center mt-6">
            <Menu model={menuItems} popup ref={menu} />
            <Button
              icon="pi pi-ellipsis-v"
              className="p-button-text p-button-sm"
              //@ts-ignore
              onClick={(e) => menu.current.toggle(e)}
              aria-haspopup
              aria-controls="popup_menu"
            />
          </div>
        </div>
      </Card>
      {/* dialog of update */}
      <Dialog
        visible={dialogType === 'edit'}
        header="Modifier l’utilisateur"
        onHide={() => setDialogType(null)}
        style={{ width: '50vw', height: '70vh' }}
        modal
      >
        <div className="flex flex-col h-full">
          {/* Scrollable fields */}
          <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
            {/* Nom et Prénom */}
            <div className="flex space-x-4">
              {[
                { name: 'nom', placeholder: 'Nom' },
                { name: 'prenom', placeholder: 'Prénom' },
              ].map(({ name, placeholder }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={selectedUser && (selectedUser[name as keyof UserModel] as string)}
                    onChange={(e) =>
                      setSelectedUser(
                        selectedUser && {
                          ...selectedUser,
                          [name]: e.target.value,
                        }
                      )
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i className="pi pi-user absolute right-2 text-gray-500 text-lg flex items-center" />
                </div>
              ))}
            </div>

            {/* Téléphone et Email */}
            <div className="flex space-x-4">
              {[
                {
                  name: 'telephone',
                  placeholder: 'Téléphone',
                  icon: 'pi-phone',
                },
                { name: 'email', placeholder: 'Email', icon: 'pi-envelope' },
              ].map(({ name, placeholder, icon }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={selectedUser && (selectedUser[name as keyof UserModel] as string)}
                    onChange={(e) =>
                      setSelectedUser(
                        selectedUser && {
                          ...selectedUser,
                          [name]: e.target.value,
                        }
                      )
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i
                    className={`pi ${icon} absolute right-2 text-gray-500 text-lg flex items-center`}
                  />
                </div>
              ))}
            </div>

            {/* Adresse */}
            <div className="relative flex items-center">
              <InputText
                type="text"
                placeholder="Adresse"
                value={selectedUser?.adresse}
                onChange={(e) =>
                  setSelectedUser(
                    selectedUser && {
                      ...selectedUser,
                      adresse: e.target.value,
                    }
                  )
                }
                required
                className="w-full pr-10"
              />
              <i className="pi pi-map-marker absolute right-2 text-gray-500 text-lg flex items-center" />
            </div>

            {/* Rôle */}
            <div className="mb-2">
              <Dropdown
                value={selectedUser?.role}
                options={UserRoleModel.map((role: string) => ({
                  label: role,
                  value: role,
                }))}
                placeholder="Sélectionner un rôle"
                onChange={(e) =>
                  setSelectedUser(selectedUser && { ...selectedUser, role: e.value })
                }
                className="w-full mb-3"
              />
            </div>

            {/* Upload d'image */}
            <FileUpload
              mode="basic"
              accept="image/*"
              maxFileSize={1000000}
              chooseLabel="Choisir une image"
              onSelect={(e) => {
                const file = e.files[0];
                if (file) {
                  const fileUrl = URL.createObjectURL(file); // Génère une URL temporaire
                  setSelectedUser(selectedUser && { ...selectedUser, image: fileUrl });
                }
              }}
              className="w-full mt-2"
            />
          </div>

          {/* Fixed Update Button */}
          <div className="p-2 border-t flex justify-end bg-white">
            <Button
              label="Mettre à jour"
              className="bg-blue-500 text-white"
              onClick={handleUpdate}
              loading={loading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default page;
