'use client';

import { User } from '@/Models/UserType';
import { Button } from 'primereact/button';
import { useState } from 'react';

const UserForm: React.FC<{ onNext: (user: User) => void }> = ({ onNext }) => {
  const [user, setUser] = useState<User>({
    _id: '',
    id: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    role: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {};
    Object.entries(user).forEach(([key, value]) => {
      if (key !== '_id' && key !== 'id' && !value.trim()) {
        newErrors[key] = 'Ce champ est requis';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext(user);
  };

  return (
    <div className="h-8/10 flex items-center justify-center bg-gray-50 px-4">
      <div className="w-3/5 bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-700">
          Création du compte principal
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <input
              name="nom"
              placeholder="Nom *"
              value={user.nom}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
          </div>
          <div>
            <input
              name="prenom"
              placeholder="Prénom *"
              value={user.prenom}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.prenom && <p className="text-red-500 text-sm mt-1">{errors.prenom}</p>}
          </div>
          <div>
            <input
              name="email"
              placeholder="Email *"
              value={user.email}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          <div>
            <input
              name="telephone"
              placeholder="Téléphone *"
              value={user.telephone}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.telephone && <p className="text-red-500 text-sm mt-1">{errors.telephone}</p>}
          </div>
          <div>
            <input
              name="adresse"
              placeholder="Adresse *"
              value={user.adresse}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.adresse && <p className="text-red-500 text-sm mt-1">{errors.adresse}</p>}
          </div>
          <div>
            <input
              name="role"
              placeholder="Rôle *"
              value={user?.role}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors?.role && <p className="text-red-500 text-sm mt-1">{errors?.role}</p>}
          </div>
          <div className="sm:col-span-2">
            <input
              name="password"
              type="password"
              placeholder="Mot de passe *"
              value={user.password}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
        </div>
        <div className="mt-6 text-center">
          <Button label="Suivant" onClick={handleSubmit} className="w-full !bg-green-700" />
        </div>
      </div>
    </div>
  );
};

export default UserForm;
