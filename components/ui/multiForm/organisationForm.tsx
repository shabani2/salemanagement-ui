// file: src/components/onboarding/OrganisationForm.tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/stores/store';
import { Organisation, addOrganisation } from '@/stores/slices/organisation/organisationSlice';
import type { User } from '@/Models/UserType';
import { Toast } from 'primereact/toast';
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';
import { Button } from 'primereact/button';

type Props = {
  onNext: (org: Organisation) => void;
  user?: User; // why: si dispo, on passe son _id comme superAdmin
};

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const OrganisationForm: React.FC<Props> = ({ onNext, user }) => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);
  const [uploadKey, setUploadKey] = useState(0);

  const [formData, setFormData] = useState<{
    _id?: string;
    nom: string;
    rccm?: string;
    contact: string;
    siegeSocial?: string;
    devise: string;
    pays: string;
    emailEntreprise: string;
    idNat: string;
    numeroImpot: string;
    // superAdmin?: string;
    logo: File | null;
  }>({
    nom: '',
    rccm: '',
    contact: '',
    siegeSocial: '',
    devise: '',
    pays: '',
    emailEntreprise: '',
    idNat: '',
    numeroImpot: '',
    // superAdmin: user?._id, // why: si user fourni
    logo: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSlug, setAutoSlug] = useState(true); // why: génère idNat depuis nom tant que l’utilisateur ne touche pas idNat

  const previewUrl = useMemo(
    () => (formData.logo ? URL.createObjectURL(formData.logo) : ''),
    [formData.logo]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'nom' && autoSlug && !prev.idNat.trim()) next.idNat = slugify(value);
      setErrors((prevErr) => ({ ...prevErr, [name]: '' }));
      return next;
    });
  };

  const handleIdNatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = slugify(e.target.value);
    setAutoSlug(false);
    setFormData((p) => ({ ...p, idNat: val }));
    setErrors((prevErr) => ({ ...prevErr, idNat: '' }));
  };

  const handleFileSelect = (e: FileUploadSelectEvent) => {
    const file = e.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFormData((prev) => ({ ...prev, logo: file as File }));
      setUploadKey((k) => k + 1);
    }
  };

  const validate = () => {
    const req = ['nom', 'idNat', 'pays', 'emailEntreprise'] as const;
    const nextErr: Record<string, string> = {};
    req.forEach((k) => {
      const v = (formData as any)[k];
      if (!v || (typeof v === 'string' && !v.trim())) nextErr[k] = 'Ce champ est requis';
    });
    // superAdmin requis côté backend si votre schéma l’exige encore
   
    setErrors(nextErr);
    return Object.keys(nextErr).length === 0;
  };

  const persistTenant = (orgId?: string) => {
    if (!orgId) return;
    try {
      localStorage.setItem('organisationId', orgId);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs manquants',
        detail: 'Veuillez compléter les champs requis.',
        life: 3000,
      });
      // continue quand même ? sinon return;
      return;
    }

    const data = new FormData();
    // map champs attendus par l’API
    ([
      'nom',
      'idNat',
      'contact',
      'numeroImpot',
      'devise',
      'superAdmin',
      'pays',
      'emailEntreprise',
      'rccm',
      'siegeSocial',
    ] as const).forEach((key) => {
      const v = (formData as any)[key];
      if (v != null && String(v).length > 0) data.append(key, String(v));
    });

    if (formData.logo) data.append('logo', formData.logo);

    const action = await dispatch(addOrganisation(data));
    if (addOrganisation.fulfilled.match(action)) {
      const org = action.payload as Organisation;
      persistTenant(org._id);
      toast.current?.show({
        severity: 'success',
        summary: 'Organisation créée',
        detail: org.nom,
        life: 2000,
      });
      onNext(org);
    } else {
      // @ts-expect-error - toolkit reject payload
      const msg: string =
        action.payload ||
        "Erreur lors de la création de l'organisation";
      toast.current?.show({
        severity: 'error',
        summary: 'Échec',
        detail: msg,
        life: 4000,
      });
      // gestion 409 slug déjà pris (message côté backend: "Ce slug (idNat) est déjà utilisé")
      if (/slug|idnat|utilis/i.test(msg)) {
        setErrors((e) => ({ ...e, idNat: 'Ce slug est déjà utilisé' }));
      }
    }
  };

  return (
    <div className="h-8/10 flex items-center justify-center bg-gray-50 px-4">
      <Toast ref={toast} />
      <div className="w-3/5 bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-700">
          Informations sur l&apos;organisation
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Nom */}
          <div>
            <input
              name="nom"
              placeholder="Nom *"
              value={formData.nom}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
          </div>

          {/* Slug idNat */}
          <div>
            <input
              name="idNat"
              placeholder="Slug (idNat) *"
              value={formData.idNat}
              onChange={handleIdNatChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.idNat && <p className="text-red-500 text-sm mt-1">{errors.idNat}</p>}
            <div className="mt-1 text-xs text-gray-500">
              Utilisé pour le sous-domaine et l’identification du tenant.
            </div>
          </div>

          {/* Contact */}
          <div>
            <input
              name="contact"
              placeholder="Contact *"
              value={formData.contact}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
          </div>

          {/* Numéro d'impôt */}
          <div>
            <input
              name="numeroImpot"
              placeholder="Numéro d'impôt *"
              value={formData.numeroImpot}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.numeroImpot && (
              <p className="text-red-500 text-sm mt-1">{errors.numeroImpot}</p>
            )}
          </div>

          {/* Devise */}
          <div>
            <input
              name="devise"
              placeholder="Devise *"
              value={formData.devise}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.devise && <p className="text-red-500 text-sm mt-1">{errors.devise}</p>}
          </div>

          {/* Pays */}
          <div>
            <input
              name="pays"
              placeholder="Pays *"
              value={formData.pays}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.pays && <p className="text-red-500 text-sm mt-1">{errors.pays}</p>}
          </div>

          {/* Email Entreprise */}
          <div className="sm:col-span-2">
            <input
              name="emailEntreprise"
              placeholder="Email de l’entreprise *"
              value={formData.emailEntreprise}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.emailEntreprise && (
              <p className="text-red-500 text-sm mt-1">{errors.emailEntreprise}</p>
            )}
          </div>

          {/* (Optionnels) RCCM / Siège social */}
          <div>
            <input
              name="rccm"
              placeholder="RCCM"
              value={formData.rccm}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <input
              name="siegeSocial"
              placeholder="Siège social"
              value={formData.siegeSocial}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
          </div>

          {/* SuperAdmin (pré-rempli si user existe) */}
          {/* <div className="sm:col-span-2">
            <input
              name="superAdmin"
              placeholder="ID SuperAdmin (optionnel si backend le permet)"
              value={formData.superAdmin || ''}
              onChange={handleChange}
              className="p-inputtext p-component w-full border rounded-md px-3 py-2"
            />
            {errors.superAdmin && (
              <p className="text-red-500 text-sm mt-1">{errors.superAdmin}</p>
            )}
          </div> */}

          {/* Logo */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <FileUpload
                key={uploadKey}
                mode="basic"
                accept="image/*"
                maxFileSize={5 * 1024 * 1024}
                chooseLabel="Choisir un logo"
                customUpload
                uploadHandler={() => {}}
                onSelect={handleFileSelect}
              />
              {formData.logo ? (
                <img
                  src={previewUrl}
                  alt="Aperçu logo"
                  className="h-16 w-16 object-contain border rounded"
                />
              ) : (
                <span className="text-sm text-gray-500">Aucun logo sélectionné</span>
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
