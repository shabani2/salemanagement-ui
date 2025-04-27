/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useDispatch, useSelector } from 'react-redux';
import {
  addOrganisation,
  selectCurrentOrganisation,
  updateOrganisation,
} from '@/stores/slices/organisation/organisationSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { Toast } from 'primereact/toast';
import { User } from '@/Models/UserType';

const page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const org = useSelector((state: RootState) => selectCurrentOrganisation(state));
  // @ts-ignore
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user-agricap');
      console.log('localStorage[user-agricap] =', storedUser);

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          console.log('parsed user:', parsed);
          setUser(parsed);
        } catch (e) {
          console.error('Erreur de parsing localStorage:', e);
        }
      }
    }
  }, []);
  useEffect(() => {
    if (user?._id) {
      setFormData((prev) => ({
        ...prev,
        superAdmin: user._id,
      }));
    }
  }, [user]);

  const [formData, setFormData] = useState({
    nom: '',
    rccm: '',
    contact: '',
    siegeSocial: '',
    devise: '',
    pays: '',
    superAdmin: user?._id,
    emailEntreprise: '',
    logo: null as File | string | null,
  });

  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    if (org) {
      setFormData(
      // @ts-ignore
        {
        nom: org.nom,
        rccm: org.rccm,
        contact: org.contact,
        siegeSocial: org.siegeSocial,
        devise: org.devise,
        pays: org.pays,
        emailEntreprise: org.emailEntreprise,
        logo: org.logo || null,
      });
    }
  }, [org]);

  // const handleSubmit = async () => {
  //   const data = new FormData();
  //   Object.entries(formData).forEach(([key, value]) => {
  //     if (value) data.append(key, value);
  //   });

  //   if (org?._id) {
  //     dispatch(updateOrganisation({ id: org._id, data }));
  //   } else {
  //     dispatch(addOrganisation(data));
  //   }
  // };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileSelect = (e: any) => {
    const file = e.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFormData((prev) => ({ ...prev, logo: file }));
      setUploadKey((prev) => prev + 1);
    }
  };

  const toast = useRef(null);

  const handleSubmit = async () => {
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      if (org?._id) {
        await dispatch(updateOrganisation({
          // @ts-ignore
          id: org._id, data
        })).unwrap();
        // @ts-ignore
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Organisation mise à jour',
          life: 3000,
        });
      } else {
        await dispatch(addOrganisation(data)).unwrap();
        // @ts-ignore
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Organisation créée',
          life: 3000,
        });
      }
    } catch (error) {
      // @ts-ignore
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'opération",
        life: 3000,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Toast ref={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Organisation' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
        />
        <h2 className="text-2xl font-bold">Organisation</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {['nom', 'rccm', 'contact', 'siegeSocial'].map((field) => (
              <span className="p-float-label" key={field}>
                <InputText
                  id={field}
                  name={field}
                  value={formData[field as keyof typeof formData] as string}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <label htmlFor={field} className="capitalize">
                  {field}
                </label>
              </span>
            ))}
          </div>

          <div className="space-y-6">
            {['devise', 'pays', 'emailEntreprise'].map((field) => (
              <span className="p-float-label" key={field}>
                <InputText
                  id={field}
                  name={field}
                  value={formData[field as keyof typeof formData] as string}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <label htmlFor={field} className="capitalize">
                  {field}
                </label>
              </span>
            ))}

            <div className="flex items-center space-x-4">
              <FileUpload
                key={uploadKey}
                mode="basic"
                accept="image/*"
                maxFileSize={1000000}
                chooseLabel="Choisir une image"
                className="w-full max-w-xs"
                customUpload
                uploadHandler={() => {}}
                onSelect={handleFileSelect}
              />

              {formData.logo instanceof File ? (
                <img
                  src={URL.createObjectURL(formData.logo)}
                  alt="Aperçu sélectionné"
                  className="h-16 w-16 object-contain border rounded"
                />
              ) : org?.logo ? (
                <img
                  src={`http://localhost:8000/${org.logo.replace('../', '')}`}
                  alt="Image actuelle"
                  className="h-16 w-16 object-contain border rounded"
                />
              ) : (
                <span className="text-sm text-gray-500">Aucune image</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            label={org ? 'Mettre à jour' : 'Créer'}
            icon={org ? 'pi pi-refresh' : 'pi pi-plus'}
            className="w-full sm:w-auto"
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default page;
