/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import CategorieList from '@/components/ui/produitComponent/CategoriesList';
import { Categorie } from '@/Models/produitsType';
import {
  addCategorie,
  deleteCategorie,
  fetchCategories,
  selectAllCategories,
  updateCategorie,
} from '@/stores/slices/produits/categoriesSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileUpload } from 'primereact/fileupload';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { Toast } from 'primereact/toast';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

const page = () => {
  const dispatch = useDispatch<AppDispatch>();

  const categories = useSelector((state: RootState) => selectAllCategories(state));

  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);
  const [importedFiles, setImportedFiles] = useState<{ name: string; format: string }[]>([]);
  //@ts-ignore
  // const [newCategory, setNewCategory] = useState<Categorie | null>(null);
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  //gestion de variable de categorie

  const [newCategorie, setNewCategorie] = useState<Categorie>({
    nom: '',
    type: '',
    image: null,
  });
  const [formState, setFormState] = useState<Categorie>(newCategorie);
  const [isDeleteCat, setIsDeleteCat] = useState<boolean>(false);

  const handleOpenCreate = () => {
    setNewCategorie({ nom: '', type: '', image: null });
    setActionMade('create');
  };

  const [actionMade, setActionMade] = useState<string | null>(null);

  const geteActionMade = (action: 'edit' | 'delete', categorie: Categorie) => {
    if (action === 'edit') {
      setActionMade('update');
      setSelectedCategorie(categorie);
      console.log('selected categorie => ', selectedCategorie);
    } else if (action === 'delete') {
      setActionMade('delete');
      setIsDeleteCat(true);
      setSelectedCategorie(categorie);
    }
  };

  useEffect(() => {
    if (actionMade === 'create') {
      setFormState(newCategorie);
    } else if (actionMade === 'update' && selectedCategorie) {
      setFormState({
        _id: selectedCategorie._id,
        nom: selectedCategorie.nom,
        type: selectedCategorie.type,
        image: null,
      });
    }
  }, [actionMade, newCategorie, selectedCategorie]);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('nom', formState.nom);
    formData.append('type', formState.type);
    if (formState.image) {
      formData.append('image', formState.image);
    }
    if (actionMade === 'create') {
      console.log('categorie created : ', formData, formState);
      dispatch(addCategorie(formState)).then((resp) => {
        console.log('resp ', resp.payload);
      });
    } else if (actionMade === 'update') {
      if (formState.image == null) {
        console.log('image', selectedCategorie?.image);
        setFormState({ ...formState, image: selectedCategorie?.image });
      }
      //@ts-ignore
      dispatch(updateCategorie({ id: selectedCategorie?._id, data: formState }));
      console.log('categorie updated : ', formState);
    }

    setActionMade(null);
  };
  useEffect(() => {
    if (!formState.image && selectedCategorie?.image) {
      console.log('Image injectée dans formState:', selectedCategorie.image);
      setFormState((prev) => ({ ...prev, image: selectedCategorie.image }));
    }
  }, [selectedCategorie, formState.image]);

  //file management
  const toast = useRef<Toast>(null);

  const handleFileManagement = async ({
    type,
    format,
    file,
  }: {
    type: 'import' | 'export';
    format: string;
    file?: File;
  }) => {
    if (type === 'import' && file) {
      setImportedFiles((prev) => [...prev, { name: file.name, format }]);
      toast.current?.show({
        severity: 'info',
        summary: `Import ${format.toUpperCase()}`,
        detail: `File imported: ${file.name}`,
        life: 3000,
      });
      return;
    }

    if (type === 'export') {
      // Only allow "csv" or "excel" as fileType
      if (format !== 'csv' && format !== 'excel') {
        toast.current?.show({
          severity: 'warn',
          summary: `Export ${format.toUpperCase()} non supporté`,
          detail: `L'export ${format.toUpperCase()} n'est pas disponible pour ce module.`,
          life: 3000,
        });
        return;
      }
      // Map "excel" to "xlsx" for backend compatibility
      const exportFileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : format;
      const result = await dispatch(
        exportFile({
          url: '/export/categories',
          mouvements: categories,
          fileType: exportFileType,
        })
      );

      if (exportFile.fulfilled.match(result)) {
        const filename = `categories.${format === 'csv' ? 'csv' : 'xlsx'}`;
        downloadExportedFile(result.payload, filename);

        toast.current?.show({
          severity: 'success',
          summary: `Export ${format.toUpperCase()}`,
          detail: `File downloaded: ${filename}`,
          life: 3000,
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: `Export ${format.toUpperCase()} Échoué`,
          detail: String(result.payload || 'Une erreur est survenue.'),
          life: 3000,
        });
      }
    }
  };

  return (
    <div className="  min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Categories' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-500">Gestion des Categories</h2>
      </div>
      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row">
        <div className=" w-full bg-white p-2 rounded-lg">
          <div className="flex flex-row justify-between p-1 items-center mb-2">
            <div className="flex flex-row gap-2 items-center">
              <h3 className="text-lg font-bold">categories</h3>
              <DropdownImportExport onAction={handleFileManagement} />
            </div>

            <div>
              <Button
                icon="pi pi-plus"
                label="nouveau"
                className=" text-white p-1 rounded !bg-green-700"
                onClick={() => handleOpenCreate()}
                severity={undefined}
              />
            </div>
          </div>
          <CategorieList categories={categories} onAction={geteActionMade} />
        </div>
      </div>

      {/* dialog cote categorie */}
      <Dialog
        visible={actionMade === 'create' || actionMade === 'update'}
        header={actionMade === 'create' ? 'Ajouter une catégorie' : 'Modifier la catégorie'}
        onHide={() => setActionMade(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4 space-y-4">
          {/* Ligne Nom + Type */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom</label>
              <InputText
                type="text"
                value={formState.nom}
                onChange={(e) => setFormState({ ...formState, nom: e.target.value })}
                required
                className="w-full p-2 border rounded"
                placeholder="Nom de la catégorie"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Type</label>
              <InputText
                type="text"
                value={formState.type}
                onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                required
                className="w-full p-2 border rounded"
                placeholder="Type de la catégorie"
              />
            </div>
          </div>

          {/* Champ FileUpload + image preview côte à côte */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Sélectionner une image</label>
              <FileUpload
                mode="basic"
                accept="image/*"
                maxFileSize={1000000}
                chooseLabel="Choisir une image"
                className="w-full mt-2"
                customUpload
                uploadHandler={() => {}}
                onSelect={(e) => {
                  const file = e.files?.[0];
                  // @ts-ignore
                  if (file) {
                    // @ts-ignore
                    setFormState({ ...formState, image: file });
                  }
                }}
              />
            </div>

            {/* Image sélectionnée (preview) ou image actuelle */}
            {
              // @ts-ignore
              formState.image instanceof File ? (
                // @ts-ignore
                <img
                  src={URL.createObjectURL(formState.image)}
                  alt="Aperçu sélectionné"
                  className="h-24 w-auto object-contain border rounded"
                />
              ) : (
                actionMade === 'update' &&
                selectedCategorie?.image && (
                  <img
                    src={`http://localhost:8000/${selectedCategorie.image}`}
                    alt="Image actuelle"
                    className="h-24 w-auto object-contain border rounded"
                  />
                )
              )
            }
          </div>

          {/* Bouton Ajouter/Modifier */}
          <div className="flex justify-end">
            <Button
              label={actionMade === 'create' ? 'Ajouter' : 'Modifier'}
              className="bg-blue-600 text-white"
              onClick={handleSubmit}
              severity={undefined}
            />
          </div>
        </div>
      </Dialog>

      {/* delete categorie Dialogue */}

      <ConfirmDeleteDialog
        visible={isDeleteCat}
        onHide={() => setIsDeleteCat(false)}
        onConfirm={(item) => {
          dispatch(deleteCategorie(item._id)).then(() => {
            dispatch(fetchCategories());
            setIsDeleteCat(false);
          });
        }}
        item={selectedCategorie}
        objectLabel="la catégorie"
        displayField="nom"
      />
    </div>
  );
};

export default page;
