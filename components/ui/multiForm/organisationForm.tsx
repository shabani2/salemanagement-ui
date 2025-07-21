/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState } from 'react';
import { FileUpload } from 'primereact/fileupload';
import { Button } from 'primereact/button';
import { FileUploadSelectEvent } from 'primereact/fileupload';
import { Organisation } from '@/stores/slices/organisation/organisationSlice';

const OrganisationForm: React.FC<{ onNext: (org: Organisation) => void }> = ({ onNext }) => {
  const [formData, setFormData] = useState({
    _id: '',
    nom: '',
    rccm: '',
    contact: '',
    siegeSocial: '',
    devise: '',
    pays: '',
    emailEntreprise: '',
    logo: undefined,
    superAdmin: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [uploadKey, setUploadKey] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };
  const handleFileSelect = (e: FileUploadSelectEvent) => {
    const file = e.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        //@ts-ignore
        setFormData((prev) => ({ ...prev, logo: reader.result as string }));
        setUploadKey((prev) => prev + 1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {};
    console.log('handle organisation');
    Object.entries(formData).forEach(([key, value]) => {
      if (
        key !== 'logo' &&
        key !== 'superAdmin' &&
        (!value || (typeof value === 'string' && !value.trim()))
      ) {
        newErrors[key] = 'Ce champ est requis';
      }
    });
    console.log('form data : ', formData);
    // if (Object.keys(newErrors).length > 0) {
    //   setErrors(newErrors);
    //   return;
    // }

    console.log('form data : ', formData);
    //@ts-ignore
    onNext(formData);
  };

  return (
    <div className="h-8/10 flex items-center justify-center bg-gray-50 px-4">
      <div className="w-3/5 bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-700">
          Informations sur l&apos;organisation
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { name: 'nom', label: 'Nom' },
            { name: 'rccm', label: 'RCCM' },
            { name: 'contact', label: 'Contact' },
            { name: 'siegeSocial', label: 'Siège social' },
            { name: 'devise', label: 'Devise' },
            { name: 'pays', label: 'Pays' },
            { name: 'emailEntreprise', label: 'Email de l’entreprise' },
          ].map(({ name, label }) => (
            <div key={name}>
              <input
                name={name}
                placeholder={`${label} *`}
                //@ts-ignore
                value={formData[name as keyof Organisation] || ''}
                onChange={handleChange}
                className="p-inputtext p-component w-full border rounded-md px-3 py-2"
              />
              {errors[name] && <p className="text-red-500 text-sm mt-1">{errors[name]}</p>}
            </div>
          ))}

          <div className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <FileUpload
                key={uploadKey}
                mode="basic"
                accept="image/*"
                maxFileSize={1000000}
                chooseLabel="Choisir un logo"
                customUpload
                uploadHandler={() => {}}
                onSelect={handleFileSelect}
              />
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt="Aperçu logo"
                  className="h-16 w-16 object-contain border rounded"
                />
              ) : (
                <span className="text-sm text-gray-5000">Aucun logo sélectionné</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button label="Suivant" onClick={handleSubmit} className="w-full !bg-green-700" />
        </div>
      </div>
    </div>
  );
};

export default OrganisationForm;
