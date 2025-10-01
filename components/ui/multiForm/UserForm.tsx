// file: src/components/onboarding/UserForm.tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/stores/store';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { createUser } from '@/stores/slices/users/userSlice';
import type { User } from '@/Models/UserType';
import type { Organisation } from '@/stores/slices/organisation/organisationSlice';
import { updateOrganisation } from '@/stores/slices/organisation/organisationSlice';

const ROLE_OPTIONS = [{ label: 'Super Administrateur', value: 'SuperAdmin' }];

interface InputWithErrorProps {
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  icon: string;
}
const InputWithError: React.FC<InputWithErrorProps> = ({
  name,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
  icon,
}) => (
  <div className="p-inputgroup flex-column">
    <span className="p-inputgroup-addon bg-gray-50 border-r-0 border-gray-300">
      <i className={`pi ${icon} text-gray-600`} />
    </span>
    <InputText
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full ${error ? 'p-invalid' : ''}`}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

interface InputPasswordWithToggleProps {
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon: string;
}
const InputPasswordWithToggle: React.FC<InputPasswordWithToggleProps> = ({
  name,
  placeholder,
  value,
  onChange,
  error,
  icon,
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="p-inputgroup flex-column">
      <span className="p-inputgroup-addon bg-gray-50 border-r-0 border-gray-300">
        <i className={`pi ${icon} text-gray-600`} />
      </span>
      <InputText
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full ${error ? 'p-invalid' : ''}`}
      />
      <span
        className="p-inputgroup-addon bg-gray-50 border-l-0 border-gray-300 cursor-pointer select-none"
        onClick={() => setVisible((v) => !v)}
        role="button"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        title={visible ? 'Masquer' : 'Afficher'}
      >
        <i className={`pi ${visible ? 'pi-eye-slash' : 'pi-eye'} text-gray-600`} />
      </span>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

type Props = {
  onNext: (user: User) => void;
  organisation?: Organisation; // why: si fournie, on set superAdmin après création
  onBack?: () => void;
};

const UserForm: React.FC<Props> = ({ onNext, organisation, onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @ts-expect-error – compat externe
  const [user, setUser] = useState<User>({
    _id: '',
    id: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    role: 'SuperAdmin', // why: onboarding initial
    password: '',
    image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
   
    setUser({ ...user, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleRoleChange = (value: string) => {
    // @ts-expect-error – TS index
    setUser({ ...user, role: value });
    setErrors((prev) => ({ ...prev, role: '' }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setImageLoading(false);
      };
      reader.readAsDataURL(file);
      // @ts-expect-error – TS index
      setUser({ ...user, image: file });
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const validate = (): boolean => {
    const required: (keyof User)[] = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'password', 'role'];
    const next: Record<string, string> = {};
    required.forEach((k) => {
      const v = user[k];
      if (!v || (typeof v === 'string' && !v.trim())) next[k] = 'Ce champ est requis';
    });
    if (user.email && !/^\S+@\S+\.\S+$/.test(user.email)) next.email = 'Email invalide';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const formData = new FormData();
    Object.keys(user).forEach((key) => {
      if (key === '_id' || key === 'id') return;
      const value = (user as any)[key];
      if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'string' && value.trim()) {
        formData.append(key, value);
      }
    });

    setLoading(true);
    try {
      //@ts-ignore
      const result = await dispatch(createUser(formData));
      if (createUser.fulfilled.match(result)) {
        const created = result.payload as User;

        // Linker l'org comme superAdmin si fournie
        if (organisation?._id) {
          await dispatch(
            updateOrganisation({
              id: organisation._id,
              data: { superAdmin: (created as any)._id },
            })
          );
        }

        onNext(created);
      } else {
        // @ts-expect-error – reject payload typing
        const errorDetail = result.payload?.message || "Échec de la création de l'utilisateur.";
        setErrors({ api: errorDetail });
      }
    } catch (err) {
      setErrors({ api: 'Une erreur inattendue est survenue.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex justify-center">
      <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-xl shadow-2xl border border-gray-100">
        <h1 className="text-3xl font-extrabold text-center mb-2 text-gray-800">
          Création de Compte Utilisateur
        </h1>
        {organisation && (
          <p className="text-center text-sm text-gray-500 mb-6">
            Organisation: <span className="font-medium">{organisation.nom}</span> (slug: {organisation.idNat})
          </p>
        )}

        {errors.api && (
          <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
            {errors.api}
          </div>
        )}

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div
            className="relative w-36 h-36 rounded-full bg-gray-100 border-4 border-dashed border-gray-300 cursor-pointer flex items-center justify-center overflow-hidden transition duration-300 hover:border-green-500"
            onClick={triggerFileInput}
          >
            {imageLoading ? (
              <div className="w-full h-full flex items-center justify-center animate-pulse">
                <i className="pi pi-spin pi-spinner text-2xl text-gray-600" />
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-500">
                <i className="pi pi-user text-5xl" />
              </span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <i className="pi pi-camera text-white text-3xl" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InputWithError name="nom" placeholder="Nom *" value={user.nom} onChange={handleChange} error={errors.nom} icon="pi-user" />
          <InputWithError name="prenom" placeholder="Prénom *" value={user.prenom} onChange={handleChange} error={errors.prenom} icon="pi-user" />

          <InputWithError name="email" type="email" placeholder="Email *" value={user.email} onChange={handleChange} error={errors.email} icon="pi-envelope" />
          <InputWithError name="telephone" placeholder="Téléphone *" value={user.telephone} onChange={handleChange} error={errors.telephone} icon="pi-phone" />

          <InputWithError name="adresse" placeholder="Adresse *" value={user.adresse} onChange={handleChange} error={errors.adresse} icon="pi-map-marker" />

          <div className="p-inputgroup flex-column">
            <span className="p-inputgroup-addon bg-gray-50 border-r-0 border-gray-300">
              <i className="pi pi-briefcase text-gray-600" />
            </span>
            <Dropdown
              value={user.role}
              options={ROLE_OPTIONS}
              onChange={(e) => handleRoleChange(e.value)}
              placeholder="Sélectionner un Rôle *"
              className={`w-full ${errors.role ? 'p-invalid' : ''}`}
            />
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
          </div>

          <div className="sm:col-span-2">
            <InputPasswordWithToggle
              name="password"
              placeholder="Mot de passe *"
              // @ts-expect-error – TS index
              value={user.password}
              onChange={handleChange}
              error={errors.password}
              icon="pi-lock"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          {onBack && (
            <Button
              type="button"
              label="Retour"
              onClick={onBack}
              className="w-1/3 p-button-outlined !border-gray-300 !text-gray-700"
            />
          )}
          <Button
            label="Créer le Compte et Continuer"
            icon="pi pi-arrow-right"
            iconPos="right"
            onClick={handleSubmit}
            loading={loading}
            className="flex-1 p-button-success p-button-lg !bg-green-600 hover:!bg-green-700 transition duration-200"
          />
        </div>
      </div>
    </div>
  );
};

export default UserForm;
