/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CategorieList from '@/components/ui/produitComponent/CategoriesList';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';

import { Categorie } from '@/Models/produitsType';
import { AppDispatch, RootState } from '@/stores/store';
import {
  addCategorie,
  deleteCategorie,
  fetchCategories,
  selectAllCategories,
  updateCategorie,
} from '@/stores/slices/produits/categoriesSlice';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';

import { API_URL } from '@/lib/apiConfig';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

/* ----------------------------- Helpers robustes ---------------------------- */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const safeUrlJoin = (base?: string, path?: string) => {
  if (!isNonEmptyString(base) || !isNonEmptyString(path)) return '';
  return `${base}/${path.replace('../', '').replace(/^\/+/, '')}`;
};

const isFile = (v: unknown): v is File => typeof File !== 'undefined' && v instanceof File;

/** Construit un payload compatible (FormData si image = File, sinon JSON simple) */
function buildCategoriePayload(data: { nom: string; type: string; image?: File | string | null }) {
  if (isFile(data.image)) {
    const fd = new FormData();
    fd.append('nom', data.nom ?? '');
    fd.append('type', data.type ?? '');
    fd.append('image', data.image);
    return fd;
  }
  return {
    nom: data.nom ?? '',
    type: data.type ?? '',
    image: data.image ?? null,
  };
}

/* --------------------------------- Page ----------------------------------- */

type ActionKind = 'create' | 'update' | 'delete' | null;

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const categories = useSelector((state: RootState) =>
    asArray<Categorie>(selectAllCategories(state))
  );

  const [actionMade, setActionMade] = useState<ActionKind>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);
  const [isDeleteCat, setIsDeleteCat] = useState(false);

  // état du formulaire (sécurisé)
  const [formState, setFormState] = useState<{
    _id?: string;
    nom: string;
    type: string;
    image: File | string | null;
  }>({ nom: '', type: '', image: null });

  /* ----------------------------- Chargement data ---------------------------- */
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        await dispatch(fetchCategories());
      } catch (e) {
        if (!isActive) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les catégories.',
          life: 3000,
        });
      }
    })();
    return () => {
      isActive = false;
    };
  }, [dispatch]);

  /* ------------------------------ Actions list ------------------------------ */
  const geteActionMade = useCallback((action: 'edit' | 'delete', categorie: Categorie) => {
    if (action === 'edit') {
      setSelectedCategorie(categorie ?? null);
      setActionMade('update');
    } else if (action === 'delete') {
      setSelectedCategorie(categorie ?? null);
      setIsDeleteCat(true);
      setActionMade('delete');
    }
  }, []);

  const handleOpenCreate = useCallback(() => {
    setSelectedCategorie(null);
    setFormState({ nom: '', type: '', image: null });
    setActionMade('create');
  }, []);

  /* --------------------------- Sync form <-> sélection ---------------------- */
  useEffect(() => {
    if (actionMade === 'update' && selectedCategorie) {
      setFormState({
        _id: selectedCategorie._id,
        nom: selectedCategorie.nom ?? '',
        type: selectedCategorie.type ?? '',
        image: selectedCategorie.image ?? null, // on garde l’URL/chemin tant qu’aucun nouveau File choisi
      });
    } else if (actionMade === 'create') {
      setFormState({ nom: '', type: '', image: null });
    }
  }, [actionMade, selectedCategorie]);

  /* --------------------------------- Submit -------------------------------- */
  const handleSubmit = useCallback(async () => {
    if (!isNonEmptyString(formState.nom) || !isNonEmptyString(formState.type)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Le nom et le type sont obligatoires.',
        life: 3000,
      });
      return;
    }

    try {
      if (actionMade === 'create') {
        // ✅ ENVOIE UN OBJET SIMPLE, PAS DE FormData ICI
        const r = await dispatch(
          addCategorie({
            nom: formState.nom,
            type: formState.type,
            image: formState.image ?? null, // File | string | null (optionnelle)
          } as any)
        );

        if (addCategorie.fulfilled.match(r)) {
          toast.current?.show({
            severity: 'success',
            summary: 'Succès',
            detail: 'Catégorie créée.',
            life: 3000,
          });
          await dispatch(fetchCategories());
          setActionMade(null);
        } else {
          throw new Error('Création non aboutie');
        }
      } else if (actionMade === 'update' && isNonEmptyString(formState._id)) {
        // ✅ Prépare un objet "partiel"
        const data: any = {
          nom: formState.nom,
          type: formState.type,
        };
        // si nouveau fichier choisi
        if (isFile(formState.image)) data.image = formState.image;
        // si string (chemin/URL) ou null
        else if (typeof formState.image === 'string' || formState.image === null)
          data.image = formState.image;

        const r = await dispatch(updateCategorie({ id: formState._id, data }));
        if (updateCategorie.fulfilled.match(r)) {
          toast.current?.show({
            severity: 'success',
            summary: 'Succès',
            detail: 'Catégorie mise à jour.',
            life: 3000,
          });
          await dispatch(fetchCategories());
          setActionMade(null);
        } else {
          throw new Error('Mise à jour non aboutie');
        }
      }
    } catch (e) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'opération sur la catégorie.",
        life: 3000,
      });
    }
  }, [dispatch, actionMade, formState]);

  /* ----------------------------- Suppression -------------------------------- */
  const handleConfirmDelete = useCallback(
    async (item: { _id?: string }) => {
      const id = item?._id ?? selectedCategorie?._id ?? '';
      if (!isNonEmptyString(id)) {
        setIsDeleteCat(false);
        return;
      }
      try {
        const r = await dispatch(deleteCategorie(id));
        if (deleteCategorie.fulfilled.match(r)) {
          toast.current?.show({
            severity: 'success',
            summary: 'Supprimé',
            detail: 'Catégorie supprimée.',
            life: 3000,
          });
          await dispatch(fetchCategories());
        } else {
          throw new Error('Suppression non aboutie');
        }
      } catch {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec de la suppression.',
          life: 3000,
        });
      } finally {
        setIsDeleteCat(false);
        setActionMade(null);
        setSelectedCategorie(null);
      }
    },
    [dispatch, selectedCategorie]
  );

  /* ------------------------- Import / Export robuste ------------------------ */
  const handleFileManagement = useCallback(
    async ({ type, format, file }: { type: 'import' | 'export'; format: string; file?: File }) => {
      if (type === 'import' && file) {
        // à implémenter selon ton backend (validation côté client recommandée)
        toast.current?.show({
          severity: 'info',
          summary: `Import ${format.toUpperCase()}`,
          detail: `Fichier sélectionné: ${file.name}`,
          life: 3000,
        });
        return;
      }

      if (type === 'export') {
        if (format !== 'csv' && format !== 'excel') {
          toast.current?.show({
            severity: 'warn',
            summary: `Export ${format.toUpperCase()} non supporté`,
            detail: `Seuls CSV et Excel sont disponibles.`,
            life: 3000,
          });
          return;
        }
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/categories',
              mouvements: asArray<Categorie>(categories),
              fileType,
            })
          );
          if (exportFile.fulfilled.match(r)) {
            const filename = `categories.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
            downloadExportedFile(r.payload, filename);
            toast.current?.show({
              severity: 'success',
              summary: `Export ${format.toUpperCase()}`,
              detail: `Fichier téléchargé: ${filename}`,
              life: 3000,
            });
          } else {
            throw new Error('Export non abouti');
          }
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: `Export ${format.toUpperCase()} échoué`,
            detail: `Une erreur est survenue.`,
            life: 3000,
          });
        }
      }
    },
    [dispatch, categories]
  );

  /* --------------------------------- UI ------------------------------------ */
  const currentImageUrl = useMemo(() => {
    // si image = File, on fera un preview via URL.createObjectURL ; sinon on tente l’URL API
    if (isFile(formState.image)) return URL.createObjectURL(formState.image);
    if (isNonEmptyString(formState.image)) return safeUrlJoin(API_URL(), formState.image);
    if (actionMade === 'update' && isNonEmptyString(selectedCategorie?.image)) {
      return safeUrlJoin(API_URL(), selectedCategorie?.image);
    }
    return '';
  }, [formState.image, selectedCategorie, actionMade]);
  console.log('formState : ', formState);
  return (
    <div className="min-h-screen">
      <Toast ref={toast} position="top-right" />

      <div className="flex items-center justify-between mb-3 mt-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Categories' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Catégories</h2>
      </div>

      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row">
        <div className="w-full bg-white p-2 rounded-lg">
          <div className="flex flex-row justify-between p-1 items-center mb-2">
            <div className="flex flex-row gap-2 items-center">
              <h3 className="text-lg font-bold">Catégories</h3>
              <DropdownImportExport onAction={handleFileManagement} />
            </div>

            <div>
              <Button
                icon="pi pi-plus"
                label="Nouveau"
                className="text-white p-1 rounded !bg-green-700"
                onClick={handleOpenCreate}
              />
            </div>
          </div>

          {/* Liste protégée */}
          <CategorieList categories={asArray<Categorie>(categories)} onAction={geteActionMade} />
        </div>
      </div>

      {/* Dialog Create / Update */}
      <Dialog
        visible={actionMade === 'create' || actionMade === 'update'}
        header={actionMade === 'create' ? 'Ajouter une catégorie' : 'Modifier la catégorie'}
        onHide={() => setActionMade(null)}
        style={{ width: '40vw', maxWidth: 700 }}
        modal
      >
        <div className="p-4 space-y-4">
          {/* Ligne Nom + Type */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom</label>
              <InputText
                value={formState.nom}
                onChange={(e) => setFormState((p) => ({ ...p, nom: e.target.value ?? '' }))}
                required
                className="w-full p-2 border rounded"
                placeholder="Nom de la catégorie"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Type</label>
              <InputText
                value={formState.type}
                onChange={(e) => setFormState((p) => ({ ...p, type: e.target.value ?? '' }))}
                required
                className="w-full p-2 border rounded"
                placeholder="Type de la catégorie"
              />
            </div>
          </div>

          {/* FileUpload + Preview */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Sélectionner une image</label>
              <FileUpload
                mode="basic"
                accept="image/*"
                maxFileSize={1_000_000}
                chooseLabel="Choisir une image"
                className="w-full mt-2"
                customUpload
                uploadHandler={() => {}}
                onSelect={(e) => {
                  const file = e?.files?.[0];
                  if (file) setFormState((p) => ({ ...p, image: file }));
                }}
                onClear={() => setFormState((p) => ({ ...p, image: null }))}
              />
            </div>

            {isNonEmptyString(currentImageUrl) && (
              <img
                src={currentImageUrl}
                alt="Aperçu"
                className="h-24 w-auto object-contain border rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              className="!bg-gray-500 text-white"
              onClick={() => setActionMade(null)}
            />
            <Button
              label={actionMade === 'create' ? 'Ajouter' : 'Modifier'}
              className="!bg-green-700 text-white"
              onClick={handleSubmit}
            />
          </div>
        </div>
      </Dialog>

      {/* Delete dialog */}
      <ConfirmDeleteDialog
        visible={isDeleteCat}
        onHide={() => setIsDeleteCat(false)}
        onConfirm={handleConfirmDelete}
        item={selectedCategorie || { _id: '', nom: '' }}
        objectLabel="la catégorie"
        displayField="nom"
      />
    </div>
  );
};

export default Page;
