import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { FileUpload } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import React from 'react';
import { isPointVente, isRegion } from '@/Models/UserType';
import { getRoleOptionsByUser } from '@/lib/utils';

interface NewUser {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  password?: string;
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
            {['nom', 'prenom'].map((name) => (
              <div key={name} className="relative w-1/2 flex items-center">
                <InputText
                  type="text"
                  placeholder={name === 'nom' ? 'Nom' : 'Prénom'}
                  value={
                    typeof newUser[name as keyof NewUser] === 'string'
                      ? (newUser[name as keyof NewUser] as string)
                      : ''
                  }
                  onChange={(e) => setNewUser({ ...newUser, [name]: e.target.value })}
                  disabled={readOnly}
                  required
                  className="w-full pr-10"
                />
                <i className="pi pi-user absolute right-2  text-gray-5000 text-lg" />
                {errors[name] && <small className="text-red-700">{errors[name]}</small>}
              </div>
            ))}
          </div>

          {/* Téléphone & Email */}
          <div className="flex space-x-4">
            {[
              { name: 'telephone', placeholder: 'Téléphone', icon: 'pi-phone' },
              { name: 'email', placeholder: 'Email', icon: 'pi-envelope' },
            ].map(({ name, placeholder, icon }) => (
              <div key={name} className="relative w-1/2 flex items-center">
                <InputText
                  type="text"
                  placeholder={placeholder}
                  value={
                    typeof newUser[name as keyof NewUser] === 'string'
                      ? (newUser[name as keyof NewUser] as string)
                      : ''
                  }
                  onChange={(e) => setNewUser({ ...newUser, [name]: e.target.value })}
                  disabled={readOnly}
                  required
                  className="w-full pr-10"
                />
                <i className={`pi ${icon} absolute right-2  text-gray-5000 text-lg`} />
                {errors[name] && <small className="text-red-700">{errors[name]}</small>}
              </div>
            ))}
          </div>

          {/* Adresse & Mot de passe */}
          {[
            { name: 'adresse', placeholder: 'Adresse', icon: 'pi-map-marker' },
            { name: 'password', placeholder: 'Mot de passe', icon: 'pi-key', type: 'password' },
          ].map(({ name, placeholder, icon, type }) => (
            <div key={name} className="relative flex items-center">
              <InputText
                type={type || 'text'}
                placeholder={placeholder}
                value={
                  typeof newUser[name as keyof NewUser] === 'string'
                    ? (newUser[name as keyof NewUser] as string)
                    : ''
                }
                onChange={(e) => setNewUser({ ...newUser, [name]: e.target.value })}
                disabled={readOnly || (dialogType === 'edit' && name === 'password')}
                required
                className="w-full pr-10"
              />
              <i className={`pi ${icon} absolute right-2  text-gray-5000 text-lg`} />
              {errors[name] && <small className="text-red-700">{errors[name]}</small>}
            </div>
          ))}

          {/* Rôle */}
          <Dropdown
            value={newUser?.role}
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
          {/* Upload + Preview */}
          {!readOnly && (
            <div className="flex items-center space-x-4">
              <FileUpload
                mode="basic"
                accept="image/*"
                maxFileSize={1000000}
                chooseLabel="Choisir une image"
                onSelect={(e) => setNewUser({ ...newUser, image: e.files[0] })}
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
              severity={undefined}
            />
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default UserDialog;
