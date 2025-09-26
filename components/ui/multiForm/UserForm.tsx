/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { User } from '@/Models/UserType';

import { AppDispatch } from '@/stores/store';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { createUser } from '@/stores/slices/users/userSlice';

// Liste des rôles disponibles
const roles = [
  { label: 'Super Administrateur', value: 'SuperAdmin' },
  { label: 'Administrateur', value: 'Admin' },
  { label: 'Vendeur', value: 'Vendeur' },
  { label: 'Client', value: 'Client' },
];

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

// ----------------------------------------------------------------------
// Champ mot de passe avec œil pour afficher/masquer
// ----------------------------------------------------------------------
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

const UserForm: React.FC<{ onNext: (user: User) => void }> = ({ onNext }) => {
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [user, setUser] = useState<User>(
    // @ts-expect-error --explication
    {
      _id: '',
      id: '',
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      role: 'Vendeur',
      password: '',
      image: null,
    }
  );

  const dispatch = useDispatch<AppDispatch>();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleRoleChange = (value: string) => {
    // @ts-expect-error --explication
    setUser({ ...user, role: value });
    setErrors((prev) => ({ ...prev, role: '' }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      setImageLoading(true); // Début chargement image

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setImageLoading(false); // Fin chargement
      };
      reader.readAsDataURL(file);
      //@ts-expect-error --explication
      setUser({ ...user, image: file });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    const newErrors: { [key: string]: string } = {};
    const requiredFields: (keyof User)[] = [
      'nom',
      'prenom',
      'email',
      'telephone',
      'adresse',
      'password',
      'role',
    ];

    requiredFields.forEach((field) => {
      const value = user[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        newErrors[field] = 'Ce champ est requis';
      }
    });

    if (user.email && !/^\S+@\S+\.\S+$/.test(user.email)) {
      newErrors.email = 'Email invalide';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formData = new FormData();
    for (const key in user) {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        const value = user[key as keyof typeof user];
        if (key !== '_id' && key !== 'id') {
          // @ts-expect-error --explication
          if (value instanceof File || (typeof value === 'string' && value.trim())) {
            formData.append(key, value);
          }
        }
      }
    }

    setLoading(true);
    try {
      // @ts-expect-error --explication
      const result = await dispatch(createUser(formData));
      if (createUser.fulfilled.match(result)) {
        onNext(result.payload as User);
      } else {
        const errorDetail =
          //@ts-expect-error --explication
          result.payload?.message || "Échec de la création de l'utilisateur.";
        setErrors({ api: errorDetail });
      }
    } catch (err) {
      console.error(err);
      setErrors({ api: 'Une erreur inattendue est survenue.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex justify-center ">
      <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-xl shadow-2xl border border-gray-100">
        <h1 className="text-3xl font-extrabold text-center mb-8 text-gray-800">
          Création de Compte Utilisateur
        </h1>

        {errors.api && (
          <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
            {errors.api}
          </div>
        )}

        {/* Aperçu de l'image avec chargement */}
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
                <i className="pi pi-user text-5xl"></i>
              </span>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <i className="pi pi-camera text-white text-3xl"></i>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Nom et Prénom */}
          <InputWithError
            name="nom"
            placeholder="Nom *"
            value={user.nom}
            onChange={handleChange}
            error={errors.nom}
            icon="pi-user"
          />
          <InputWithError
            name="prenom"
            placeholder="Prénom *"
            value={user.prenom}
            onChange={handleChange}
            error={errors.prenom}
            icon="pi-user"
          />

          {/* Email et Téléphone */}
          <InputWithError
            name="email"
            type="email"
            placeholder="Email *"
            value={user.email}
            onChange={handleChange}
            error={errors.email}
            icon="pi-envelope"
          />
          <InputWithError
            name="telephone"
            placeholder="Téléphone *"
            value={user.telephone}
            onChange={handleChange}
            error={errors.telephone}
            icon="pi-phone"
          />

          {/* Adresse et Rôle */}
          <InputWithError
            name="adresse"
            placeholder="Adresse *"
            value={user.adresse}
            onChange={handleChange}
            error={errors.adresse}
            icon="pi-map-marker"
          />
          <div className="p-inputgroup flex-column">
            <span className="p-inputgroup-addon bg-gray-50 border-r-0 border-gray-300">
              <i className="pi pi-briefcase text-gray-600" />
            </span>
            <Dropdown
              value={user.role}
              options={roles}
              onChange={(e) => handleRoleChange(e.value)}
              placeholder="Sélectionner un Rôle *"
              className={`w-full ${errors.role ? 'p-invalid' : ''}`}
            />
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
          </div>

          {/* Mot de passe avec œil (toggle visibilité) */}
          <div className="sm:col-span-2">
            <InputPasswordWithToggle
              name="password"
              placeholder="Mot de passe *"
              //@ts-expect-error --explication
              value={user.password}
              onChange={handleChange}
              error={errors.password}
              icon="pi-lock"
            />
          </div>
        </div>

        <div className="mt-8">
          <Button
            label="Créer le Compte et Continuer"
            icon="pi pi-arrow-right"
            iconPos="right"
            onClick={handleSubmit}
            loading={loading}
            className="w-full p-button-success p-button-lg !bg-green-600 hover:!bg-green-700 transition duration-200"
          />
        </div>
      </div>
    </div>
  );
};

export default UserForm;
