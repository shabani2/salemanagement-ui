'use client';
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import {
  addOrganisation,
  fetchOrganisations,
  Organisation,
  updateOrganisation,
} from '@/stores/slices/organisation/organisationSlice';
import { User } from '@/Models/UserType';
import { API_URL } from '@/lib/apiConfig';

type OrgForm = {
  nom: string;
  rccm: string;
  contact: string;
  siegeSocial: string;
  devise: string;
  pays: string;
  idNat: string;
  numeroImpot: string;
  superAdmin: string; // stocke toujours un id
  emailEntreprise: string;
  logo: File | string | null;
};

const EMPTY_FORM: OrgForm = {
  nom: '',
  rccm: '',
  contact: '',
  siegeSocial: '',
  devise: '',
  pays: '',
  idNat: 'non affecté',
  numeroImpot: 'non affecté',
  superAdmin: '',
  emailEntreprise: '',
  logo: null,
};

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // user local (si présent)
  const user: User | null =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user-agricap') || 'null')
      : null;

  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const currentOrg = orgs?.[0] ?? null;

  const [formData, setFormData] = useState<OrgForm>(EMPTY_FORM);
  const [uploadKey, setUploadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  /* ------------------------------ helpers ------------------------------ */
  const notify = useCallback(
    (
      severity: 'success' | 'info' | 'warn' | 'error',
      summary: string,
      detail: string,
      life = 3000
    ) => toast.current?.show({ severity, summary, detail, life }),
    []
  );

  const buildFormData = (payload: OrgForm) => {
    const fd = new FormData();
    // map direct
    fd.append('nom', payload.nom ?? '');
    fd.append('rccm', payload.rccm ?? '');
    fd.append('contact', payload.contact ?? '');
    fd.append('siegeSocial', payload.siegeSocial ?? '');
    fd.append('devise', payload.devise ?? '');
    fd.append('pays', payload.pays ?? '');
    fd.append('idNat', payload.idNat ?? 'non affecté');
    fd.append('numeroImpot', payload.numeroImpot ?? 'non affecté');
    fd.append('emailEntreprise', payload.emailEntreprise ?? '');
    if (payload.superAdmin) fd.append('superAdmin', payload.superAdmin);

    if (payload.logo instanceof File) {
      fd.append('logo', payload.logo);
    } else if (typeof payload.logo === 'string' && payload.logo.trim()) {
      // côté API, si on garde l’ancienne image, inutile d’envoyer
      // on peut envoyer une clé "logo" vide ou rien du tout. Ici on n’envoie rien.
    }
    return fd;
  };

  const validate = (p: OrgForm) => {
    const errors: string[] = [];
    if (!p.nom.trim()) errors.push('Le nom est requis.');
    if (!p.contact.trim() && !p.emailEntreprise.trim()) {
      errors.push('Renseignez au moins un contact ou un email entreprise.');
    }
    if (p.logo && p.logo instanceof File) {
      const tooLarge = p.logo.size > 2_000_000; // 2 Mo
      const notImage = !p.logo.type.startsWith('image/');
      if (tooLarge) errors.push('Le logo ne doit pas dépasser 2 Mo.');
      if (notImage) errors.push('Le logo doit être une image (png/jpg/webp…).');
    }
    return errors;
  };

  /* ------------------------------ load org ------------------------------ */
  useEffect(() => {
    (async () => {
      const resp = await dispatch(fetchOrganisations());

      const data: Organisation[] = Array.isArray(resp?.payload) ? resp.payload : [];
      setOrgs(data);
    })();
  }, [dispatch]);

  /* ------------------------------ hydrate form ------------------------------ */
  useEffect(() => {
    // superAdmin par défaut = user._id si dispo
    const superAdminId = (user?._id as string) || '';

    if (currentOrg) {
      setFormData({
        nom: currentOrg.nom ?? '',
        rccm: currentOrg.rccm ?? '',
        contact: currentOrg.contact ?? '',
        siegeSocial: currentOrg.siegeSocial ?? '',
        devise: currentOrg.devise ?? '',
        pays: currentOrg.pays ?? '',
        emailEntreprise: currentOrg.emailEntreprise ?? '',
        logo: currentOrg.logo ?? null,
        superAdmin:
          (currentOrg.superAdmin as any)?._id ?? (currentOrg.superAdmin as any) ?? superAdminId,
        idNat: currentOrg.idNat ?? 'non affecté',
        numeroImpot: currentOrg.numeroImpot ?? 'non affecté',
      });
    } else {
      setFormData((prev) => ({ ...EMPTY_FORM, superAdmin: superAdminId }));
    }
    //@ts-ignore
  }, [currentOrg?._id, user?._id]); // re-hydrate si change

  /* ------------------------------ file preview ------------------------------ */
  useEffect(() => {
    if (formData.logo instanceof File) {
      const url = URL.createObjectURL(formData.logo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (typeof formData.logo === 'string' && formData.logo.trim()) {
      const src = `${API_URL()}/${formData.logo.replace('../', '')}`;
      setPreviewUrl(src);
      return;
    }
    setPreviewUrl('');
  }, [formData.logo]);

  /* ------------------------------ handlers ------------------------------ */
  const onChangeField = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onFileSelect = useCallback(
    (e: any) => {
      const f = e.files?.[0];
      if (!f) return;
      if (!f.type?.startsWith('image/')) {
        notify('warn', 'Fichier invalide', 'Veuillez sélectionner une image (png/jpg/webp…).');
        return;
      }
      if (f.size > 2_000_000) {
        notify('warn', 'Fichier trop volumineux', 'Taille maximale: 2 Mo.');
        return;
      }
      setFormData((prev) => ({ ...prev, logo: f }));
      setUploadKey((k) => k + 1); // reset UI FileUpload
    },
    [notify]
  );

  const onSubmit = useCallback(async () => {
    const errors = validate(formData);
    if (errors.length) {
      notify('warn', 'Validation', errors.join(' '));
      return;
    }

    try {
      setSubmitting(true);
      const fd = buildFormData(formData);

      if (currentOrg?._id) {
        // @ts-expect-error - compat: external lib types mismatch
        await dispatch(updateOrganisation({ id: currentOrg._id, data: fd })).unwrap();
        notify('success', 'Succès', 'Organisation mise à jour');
      } else {
        await dispatch(addOrganisation(fd)).unwrap();
        notify('success', 'Succès', 'Organisation créée');
      }

      // rafraîchir
      const resp = await dispatch(fetchOrganisations());

      setOrgs(Array.isArray(resp?.payload) ? resp.payload : []);
    } catch (e: any) {
      notify('error', 'Erreur', "Échec de l'opération");
    } finally {
      setSubmitting(false);
    }
  }, [dispatch, currentOrg?._id, formData, notify]);

  /* -------------------------------- render -------------------------------- */
  return (
    <div className="p-3 space-y-6">
      <Toast ref={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Organisation' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
        />
        <h2 className="text-2xl font-bold text-gray-700">Organisation</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Colonne gauche */}
          <div className="space-y-6 p-3">
            {(['nom', 'rccm', 'contact', 'siegeSocial', 'idNat', 'numeroImpot'] as const).map(
              (field) => (
                <span className="p-float-label p-3" key={field}>
                  <InputText
                    id={field}
                    name={field}
                    value={String(formData[field] ?? '')}
                    onChange={onChangeField}
                    className="w-full"
                  />
                  <label htmlFor={field} className="capitalize">
                    {field}
                  </label>
                </span>
              )
            )}
          </div>

          {/* Colonne droite */}
          <div className="space-y-6 p-3">
            {(['devise', 'pays', 'emailEntreprise'] as const).map((field) => (
              <span className="p-float-label p-3" key={field}>
                <InputText
                  id={field}
                  name={field}
                  value={String(formData[field] ?? '')}
                  onChange={onChangeField}
                  className="w-full"
                />
                <label htmlFor={field} className="capitalize">
                  {field}
                </label>
              </span>
            ))}

            <div className="flex items-center gap-4 p-3">
              <FileUpload
                key={uploadKey}
                mode="basic"
                accept="image/*"
                maxFileSize={2_000_000}
                chooseLabel="Choisir un logo"
                className="w-full max-w-xs [&>.p-button]:!bg-green-700 [&>.p-button]:hover:bg-green-800 [&>.p-button]:text-white"
                customUpload
                uploadHandler={() => {}}
                onSelect={onFileSelect}
              />

              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Logo"
                  className="h-16 w-16 object-contain border rounded"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
              ) : (
                <span className="text-sm text-gray-500">Aucune image</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end p-3">
          <Button
            label={currentOrg ? 'Mettre à jour' : 'Créer'}
            icon={currentOrg ? 'pi pi-refresh' : 'pi pi-plus'}
            className="w-full sm:w-auto !bg-green-700 text-white"
            onClick={onSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
