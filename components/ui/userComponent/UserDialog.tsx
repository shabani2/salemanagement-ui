import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { FileUpload } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import React from 'react';
import { isPointVente, isRegion, User, UserModel } from '@/Models/UserType';
import { getRoleOptionsByUser, UserRoleModel } from '@/lib/utils';

interface UserDialogProps {
  dialogType: 'create' | 'edit' | 'detail' | null;
  setDialogType: (type: 'create' | 'edit' | 'detail' | null) => void;
  newUser: any;
  setNewUser: (user: any) => void;
  errors: Record<string, string>;
  regions: any[];
  pointsVente: any[];
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

  const showRegionField = newUser.role === 'AdminRegion';
  const showPointVenteField =
    newUser.role === 'AdminPointVente' || newUser.role === 'Vendeur' || newUser.role === 'Gerant';
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const allowedOptions = getRoleOptionsByUser(user.role);

  if (user.role === 'Gerant' || user.role === 'Vendeur') return null;

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
      style={{ width: '50vw', height: '70vh' }}
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
                  value={newUser[name] || ''}
                  onChange={(e) => setNewUser({ ...newUser, [name]: e.target.value })}
                  disabled={readOnly}
                  required
                  className="w-full pr-10"
                />
                <i className="pi pi-user absolute right-2 text-gray-500 text-lg" />
                {errors[name] && <small className="text-red-500">{errors[name]}</small>}
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
                  value={newUser[name] || ''}
                  onChange={(e) => setNewUser({ ...newUser, [name]: e.target.value })}
                  disabled={readOnly}
                  required
                  className="w-full pr-10"
                />
                <i className={`pi ${icon} absolute right-2 text-gray-500 text-lg`} />
                {errors[name] && <small className="text-red-500">{errors[name]}</small>}
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
                value={newUser[name] || ''}
                onChange={(e) => setNewUser({ ...newUser, [name]: e.target.value })}
                disabled={readOnly || (dialogType === 'edit' && name === 'password')}
                required
                className="w-full pr-10"
              />
              <i className={`pi ${icon} absolute right-2 text-gray-500 text-lg`} />
              {errors[name] && <small className="text-red-500">{errors[name]}</small>}
            </div>
          ))}

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
              className="bg-green-500 text-white"
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
