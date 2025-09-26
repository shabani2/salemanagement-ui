// file: src/components/users/UserDialog.tsx
import React from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import { isPointVente, isRegion } from '@/Models/UserType';
import { getRoleOptionsByUser } from '@/lib/utils';

interface NewUser {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  role: string;
  region?: string | { _id: string; nom: string };
  pointVente?: string | { _id: string; nom: string };
  image?: File | string | null;
}

interface UserDialogProps {
  dialogType: 'create' | 'edit' | 'detail' | null;
  setDialogType: (type: 'create' | 'edit' | 'detail' | null) => void;
  newUser: NewUser;
  setNewUser: (user: NewUser) => void;
  errors: Record<string, string>;
  regions: { _id: string; nom: string }[];
  pointsVente: { _id: string; nom: string }[];
  previewUrl: string | null;
  handleCreateOrUpdate: () => void;
  loadingCreateOrUpdate: boolean;
}

const normalizeEmail = (v: string) => v.toLowerCase().replace(/\s+/g, '');
const stripSpaces = (v: string) => v.replace(/\s+/g, '');
const collapseSpaces = (v: string) => v.trim().replace(/\s+/g, ' ');

const UserDialog: React.FC<UserDialogProps> = ({
  dialogType,
  setDialogType,
  newUser,
  setNewUser,
  errors,
  regions,
  pointsVente,
  previewUrl,
  handleCreateOrUpdate,
  loadingCreateOrUpdate,
}) => {
  const readOnly = dialogType === 'detail';

  const effectivePreviewUrl =
    newUser.image instanceof File
      ? previewUrl
      : typeof newUser.image === 'string'
        ? `http://localhost:8000/${newUser.image}`
        : null;

  const showRegionField = newUser?.role === 'AdminRegion';
  const showPointVenteField =
    newUser?.role === 'AdminPointVente' ||
    newUser?.role === 'Vendeur' ||
    newUser?.role === 'Logisticien';

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const allowedOptions = getRoleOptionsByUser(user?.role);

  const handleChange = (name: keyof NewUser, raw: string) => {
    let value = raw ?? '';
    if (name === 'email') value = normalizeEmail(value);
    else if (name === 'telephone') value = stripSpaces(value);
    else if (name === 'nom' || name === 'prenom' || name === 'adresse')
      value = collapseSpaces(value);
    setNewUser({ ...newUser, [name]: value } as NewUser);
  };

  const handleBlur = (name: keyof NewUser) => {
    const current = (newUser[name] as unknown as string) || '';
    handleChange(name, current); // réapplique la règle (collapsing/trim) à la sortie
  };

  if (user?.role === 'Logisticien' || user?.role === 'Vendeur') return null;

  return (
    <Dialog
      visible={!!dialogType}
      header={
        dialogType === 'create'
          ? 'Ajouter un utilisateur'
          : dialogType === 'edit'
            ? 'Modifier un utilisateur'
            : 'Détails de l’utilisateur'
      }
      onHide={() => setDialogType(null)}
      style={{ width: '35vw', height: '70vh' }}
      modal
    >
      <div className="flex flex-col h-full">
        <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
          {/* Nom & Prénom */}
          <div className="flex space-x-4">
            {(['nom', 'prenom'] as const).map((name) => (
              <div key={name} className="relative w-1/2 flex flex-col">
                <div className="relative">
                  <InputText
                    type="text"
                    placeholder={name === 'nom' ? 'Nom' : 'Prénom'}
                    value={(newUser[name] as string) || ''}
                    onChange={(e) => handleChange(name, e.target.value)}
                    onBlur={() => handleBlur(name)}
                    disabled={readOnly}
                    className="w-full pr-10"
                    required
                  />
                  <i className="pi pi-user absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
                </div>
                {errors[name] && <small className="text-red-700">{errors[name]}</small>}
              </div>
            ))}
          </div>

          {/* Téléphone & Email */}
          <div className="flex space-x-4">
            {/* Téléphone */}
            <div className="relative w-1/2 flex flex-col">
              <div className="relative">
                <InputText
                  type="text"
                  placeholder="Téléphone"
                  value={newUser.telephone || ''}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  onBlur={() => handleBlur('telephone')}
                  disabled={readOnly}
                  className="w-full pr-10"
                  required
                />
                <i className="pi pi-phone absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              </div>
              {errors.telephone && <small className="text-red-700">{errors.telephone}</small>}
            </div>

            {/* Email */}
            <div className="relative w-1/2 flex flex-col">
              <div className="relative">
                <InputText
                  type="email"
                  placeholder="Email"
                  value={newUser.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  disabled={readOnly}
                  className="w-full pr-10"
                  required
                />
                <i className="pi pi-envelope absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              </div>
              {errors.email && <small className="text-red-700">{errors.email}</small>}
            </div>
          </div>

          {/* Adresse */}
          <div className="relative flex flex-col">
            <div className="relative">
              <InputText
                type="text"
                placeholder="Adresse"
                value={newUser.adresse || ''}
                onChange={(e) => handleChange('adresse', e.target.value)}
                onBlur={() => handleBlur('adresse')}
                disabled={readOnly}
                className="w-full pr-10"
                required
              />
              <i className="pi pi-map-marker absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
            </div>
            {errors.adresse && <small className="text-red-700">{errors.adresse}</small>}
          </div>

          {/* Rôle */}
          <Dropdown
            value={newUser.role}
            options={allowedOptions}
            placeholder="Sélectionner un rôle"
            onChange={(e) => setNewUser({ ...newUser, role: e.value })}
            disabled={readOnly}
            className="w-full"
          />

          {/* Région */}
          {showRegionField && (
            <Dropdown
              value={isRegion(newUser.region) ? newUser.region._id : newUser.region}
              options={regions}
              onChange={(e) => setNewUser({ ...newUser, region: e.value })}
              optionLabel="nom"
              optionValue="_id"
              placeholder="Sélectionnez une région"
              className="w-full"
              disabled={readOnly}
            />
          )}

          {/* Point de vente */}
          {showPointVenteField && (
            <Dropdown
              value={isPointVente(newUser.pointVente) ? newUser.pointVente._id : newUser.pointVente}
              options={pointsVente}
              onChange={(e) => setNewUser({ ...newUser, pointVente: e.value })}
              optionLabel="nom"
              optionValue="_id"
              placeholder="Sélectionnez un point de vente"
              className="w-full"
              disabled={readOnly}
            />
          )}

          {/* Upload + Preview */}
          {!readOnly && (
            <div className="flex items-center space-x-4">
              <FileUpload
                mode="basic"
                accept="image/*"
                maxFileSize={1_000_000}
                chooseLabel="Choisir une image"
                onSelect={(e: FileUploadSelectEvent) => {
                  const file = (e.files && e.files[0]) as File | undefined;
                  setNewUser({ ...newUser, image: file ?? null });
                }}
                onClear={() => setNewUser({ ...newUser, image: null })}
                className="w-full"
              />
              {effectivePreviewUrl && (
                <img
                  src={effectivePreviewUrl}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded shadow"
                />
              )}
            </div>
          )}

          {readOnly && effectivePreviewUrl && (
            <div className="flex justify-center">
              <img
                src={effectivePreviewUrl}
                alt="Utilisateur"
                className="w-24 h-24 object-cover rounded shadow"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        {!readOnly && (
          <div className="p-2 border-t flex justify-end bg-white">
            <Button
              label={dialogType === 'create' ? 'Ajouter' : 'Mettre à jour'}
              className="!bg-green-700 text-white"
              onClick={handleCreateOrUpdate}
              loading={loadingCreateOrUpdate}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default UserDialog;
