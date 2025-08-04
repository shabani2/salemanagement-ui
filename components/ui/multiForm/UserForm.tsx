/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { User } from '@/Models/UserType';
import { registerUser } from '@/stores/slices/auth/authSlice';
import { AppDispatch } from '@/stores/store';
import { Button } from 'primereact/button';
import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';

const UserForm: React.FC<{ onNext: (user: User) => void }> = ({ onNext }) => {
  const [user, setUser] = useState<User>({
    _id: '',
    id: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    role: 'SuperAdmin',
    password: '',
    //@ts-ignore
    image: null,
  });

  const dispatch = useDispatch<AppDispatch>();

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Créer l'URL de prévisualisation
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Mettre à jour l'état de l'utilisateur
      //@ts-ignore
      setUser({ ...user, image: file });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    const newErrors: { [key: string]: string } = {};

    // Validation des champs requis
    const requiredFields: (keyof User)[] = [
      'nom',
      'prenom',
      'email',
      'telephone',
      'adresse',
      'password',
    ];

    requiredFields.forEach((field) => {
      // @ts-ignore
      if (!user[field]?.trim()) {
        newErrors[field] = 'Ce champ est requis';
      }
    });

    // Validation spécifique pour l'email
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

        if (value instanceof File || typeof value === 'string') {
          formData.append(key, value);
        }
      }
    }

    // dispatch(registerUser(user));
    const result = await dispatch(registerUser(formData));

    onNext(result.payload);
  };

  return (
    <div className="h-8/10 flex items-center justify-center bg-gray-50 px-4">
      <div className="w-3/5 bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-700">
          Création du compte principal
        </h1>

        {/* Aperçu de l'image */}
        <div className="flex justify-center mb-6">
          <div
            className="relative w-32 h-32 rounded-full bg-gray-200 border-2 border-dashed border-gray-300 cursor-pointer flex items-center justify-center overflow-hidden"
            onClick={triggerFileInput}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-500">
                <i className="pi pi-user text-4xl"></i>
              </span>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <i className="pi pi-camera text-white text-2xl"></i>
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
          <div>
            <input
              name="nom"
              placeholder="Nom *"
              value={user.nom}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            />
            {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
          </div>
          <div>
            <input
              name="prenom"
              placeholder="Prénom *"
              value={user.prenom}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            />
            {errors.prenom && <p className="text-red-500 text-sm mt-1">{errors.prenom}</p>}
          </div>

          {/* Email et Téléphone */}
          <div>
            <input
              name="email"
              placeholder="Email *"
              value={user.email}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          <div>
            <input
              name="telephone"
              placeholder="Téléphone *"
              value={user.telephone}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            />
            {errors.telephone && <p className="text-red-500 text-sm mt-1">{errors.telephone}</p>}
          </div>

          {/* Adresse et Rôle (lecture seule) */}
          <div>
            <input
              name="adresse"
              placeholder="Adresse *"
              value={user.adresse}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            />
            {errors.adresse && <p className="text-red-500 text-sm mt-1">{errors.adresse}</p>}
          </div>
          <div>
            <input
              name="role"
              placeholder="Rôle"
              value={user.role}
              readOnly
              className="w-full border rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
            />
          </div>

          {/* Mot de passe */}
          <div className="sm:col-span-2">
            <input
              name="password"
              type="password"
              placeholder="Mot de passe *"
              value={user.password}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
        </div>
        <div className="mt-6 text-center">
          <Button
            label="Suivant"
            onClick={handleSubmit}
            className="w-full !bg-green-700 !text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default UserForm;
