// file: src/components/users/UpdateUserDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import { User } from '@/Models/UserType'; // Assurez-vous d'importer le bon type User
import { cleanImagePath, getApiBaseUrlString } from '@/lib/utils/baseUrl';

interface UpdateUserDialogProps {
  user: User;
  visible: boolean;
  onHide: () => void;
  onUpdate: (formData: FormData) => Promise<void>;
  loading: boolean;
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isFile = (v: unknown): v is File => typeof File !== 'undefined' && v instanceof File;

const UpdateUserDialog: React.FC<UpdateUserDialogProps> = ({
  user,
  visible,
  onHide,
  onUpdate,
  loading,
}) => {
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    setEditedUser({
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      email: user.email,
      adresse: user.adresse,
    });
    setAvatarFile(null);
  }, [user, visible]);

  const previewUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    const apiBase = getApiBaseUrlString();
    if (isNonEmptyString(user?.image)) {
      return `${apiBase}/${cleanImagePath(user.image)}`;
    }
    return 'https://via.placeholder.com/150?text=Avatar';
  }, [avatarFile, user]);

  const handleSubmit = () => {
    const fd = new FormData();
    const payload = { ...editedUser, _id: user._id };

    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        fd.append(k, String(v));
      }
    });

    if (isFile(avatarFile)) {
      fd.append('image', avatarFile);
    }

    onUpdate(fd);
  };

  const handleChange = (name: keyof typeof editedUser, value: string) => {
    setEditedUser((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog
      visible={visible}
      header="Modifier le Profil"
      onHide={onHide}
      style={{ width: '40vw', maxWidth: 650 }}
      modal
      footer={
        <div className="p-2 border-t flex justify-end bg-white">
          <Button
            label="Mettre à jour"
            className="!bg-green-700 text-white"
            onClick={handleSubmit}
            loading={loading}
          />
        </div>
      }
    >
      <div className="px-4 py-2 space-y-4">
        {/* Preview & Upload */}
        <div className="flex items-center space-x-6 pb-2 border-b">
          <img
            src={previewUrl}
            alt="Avatar Preview"
            className="w-20 h-20 object-cover rounded-full shadow-md"
          />
          <FileUpload
            mode="basic"
            name="image"
            accept="image/*"
            maxFileSize={1_000_000}
            chooseLabel="Changer l'Avatar"
            onSelect={(e: FileUploadSelectEvent) => {
              const f = e.files?.[0];
              if (f && isFile(f)) setAvatarFile(f);
            }}
            onClear={() => setAvatarFile(null)}
            className="p-0"
            chooseOptions={{ className: 'p-button-sm !bg-green-600' }}
          />
        </div>

        {/* Nom & Prénom */}
        <div className="flex space-x-4">
          {(['nom', 'prenom'] as const).map((name) => (
            <div key={name} className="relative w-1/2">
              <InputText
                type="text"
                placeholder={name === 'nom' ? 'Nom' : 'Prénom'}
                value={editedUser[name] ?? ''}
                onChange={(e) => handleChange(name, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* Téléphone & Email */}
        <div className="flex space-x-4">
          {(['telephone', 'email'] as const).map((name) => (
            <div key={name} className="relative w-1/2">
              <InputText
                type={name === 'email' ? 'email' : 'text'}
                placeholder={name === 'email' ? 'Email' : 'Téléphone'}
                value={editedUser[name] ?? ''}
                onChange={(e) => handleChange(name, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>

        {/* Adresse */}
        <InputText
          type="text"
          placeholder="Adresse"
          value={editedUser.adresse ?? ''}
          onChange={(e) => handleChange('adresse', e.target.value)}
          className="w-full"
        />
      </div>
    </Dialog>
  );
};

export default UpdateUserDialog;
