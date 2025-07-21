'use client';
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useDispatch } from 'react-redux';
import {
  addOrganisation,
  fetchOrganisations,
  Organisation,
  updateOrganisation,
} from '@/stores/slices/organisation/organisationSlice';
import { AppDispatch } from '@/stores/store';
import { Toast } from 'primereact/toast';
import { User } from '@/Models/UserType';

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [org, setOrg] = useState<Organisation[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const toast = useRef(null);
  const [uploadKey, setUploadKey] = useState(0);

  const [formData, setFormData] = useState({
    nom: '',
    rccm: '',
    contact: '',
    siegeSocial: '',
    devise: '',
    pays: '',
    idNat: 'non affecté',
    numeroImpot: 'non affecté',
    superAdmin: user?._id || '',
    emailEntreprise: '',
    logo: null as File | string | null,
  });

  useEffect(() => {
    dispatch(fetchOrganisations()).then((data) => {
      if (data) {
        setOrg(data.payload);
      }
    });
  }, [dispatch]);

  useEffect(() => {
    if (user?._id) {
      setFormData((prev) => ({
        ...prev,
        superAdmin: user._id,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (org.length > 0) {
      const current = org[0];
      console.log('Organisation actuelle : ', current);
      setFormData({
        nom: current.nom || '',
        rccm: current.rccm || '',
        contact: current.contact || '',
        siegeSocial: current.siegeSocial || '',
        devise: current.devise || '',
        pays: current.pays || '',
        emailEntreprise: current.emailEntreprise || '',
        logo: current.logo || null,
        superAdmin: current.superAdmin || '',
        idNat: current.idNat || 'non affecté',
        numeroImpot: current.numeroImpot || 'non affecté',
      });
    }
  }, [org]);

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

  const handleSubmit = async () => {
    const rawData = {
      ...formData,
      superAdmin: (formData.superAdmin as any)?._id || formData.superAdmin,
    };

    const data = new FormData();
    Object.entries(rawData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        data.append(key, value);
      }
    });

    // const data = new FormData();
    // Object.entries(formData).forEach(([key, value]) => {
    //   if (value) data.append(key, value);
    // });
    // const updatedData = {
    //   ...data,
    //   superAdmin: data.superAdmin?._id, // on extrait l’_id de l’objet superadmin
    // };
    try {
      if (org[0]?._id) {
        //console.log('console pour data : ',data)
        await dispatch(
          updateOrganisation({
            // @ts-ignore
            id: org[0]._id,
            // @ts-ignore
            data,
          })
        ).unwrap();
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
    <div className="p-3 space-y-6">
      <Toast ref={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Organisation' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
        />
        <h2 className="text-2xl font-bold text-gray-5000">Organisation</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6 p-3">
            {['nom', 'rccm', 'contact', 'siegeSocial', 'idNat', 'numeroImpot'].map((field) => (
              <span className="p-float-label p-3" key={field}>
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

          <div className="space-y-6 p-3">
            {['devise', 'pays', 'emailEntreprise'].map((field) => (
              <span className="p-float-label p-3" key={field}>
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
                className="w-full max-w-xs [&>.p-button]:!bg-green-700 [&>.p-button]:hover:bg-green-800 [&>.p-button]:text-white"
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
              ) : org[0]?.logo ? (
                <img
                  src={`http://localhost:8000/${org[0].logo.replace('../', '')}`}
                  alt="Image actuelle"
                  className="h-16 w-16 object-contain border rounded"
                />
              ) : (
                <span className="text-sm text-gray-5000">Aucune image</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end p-3">
          <Button
            label={org.length > 0 ? 'Mettre à jour' : 'Créer'}
            icon={org.length > 0 ? 'pi pi-refresh' : 'pi pi-plus'}
            className="w-full sm:w-auto !bg-green-700"
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
