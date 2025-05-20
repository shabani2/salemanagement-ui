/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';
import {
  addProduit,
  deleteProduit,
  fetchProduits,
  updateProduit,
} from '@/stores/slices/produits/produitsSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Produit } from '@/Models/produitsType';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { saveAs } from 'file-saver';
import { Toast } from 'primereact/toast';
const page = () => {
  const menuRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [produits, setProduits] = useState<Produit[]>([]); //useSelector((state: RootState) => selectAllProduits(state));
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const categories = useSelector((state: RootState) => selectAllCategories(state));

  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);

  const selectedRowDataRef = useRef<any>(null);
  const [isDeleteProduit, setIsDeleteProduit] = useState<boolean>(false);

  const [newProduit, setNewProduit] = useState<Produit>({
    nom: '',
    categorie: '',
    prix: 0,
    prixVente: 0,
    tva: 0,
    marge: 0,
    netTopay: 0,
    unite: '',
  });

  //@ts-ignore
  // const [newCategory, setNewCategory] = useState<Categorie | null>(null);
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      setAllProduits(resp.payload); // garde la version complète
      setProduits(resp.payload); // version visible (filtrée ou pas)
    });
  }, [dispatch]);

  const handleAction = (action: string, rowData: Produit) => {
    console.log('Produit cliqué :', rowData);
    setSelectedProduit(rowData);
    setDialogType(action);
    if (action === 'delete') {
      setIsDeleteProduit(true);
    }
  };

  //@ts-ignore

  const actionBodyTemplate = (rowData: Produit) => (
    <div>
      <Menu
        model={[
          {
            label: 'Détails',
            command: () => handleAction('details', selectedRowDataRef.current),
          },
          {
            label: 'Modifier',
            command: () => handleAction('edit', selectedRowDataRef.current),
          },
          {
            label: 'Supprimer',
            command: () => handleAction('delete', selectedRowDataRef.current),
          },
        ]}
        popup
        ref={menuRef}
      />
      <Button
        icon="pi pi-bars"
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData; // 👈 on stocke ici le bon rowData
          menuRef.current.toggle(event);
        }}
        aria-haspopup
        severity={undefined}
      />
    </div>
  );

  const handleSubmitProduit = async () => {
    if (newProduit._id) {
      // Cas modification
      //@ts-ignore
      await dispatch(updateProduit(newProduit)).then((resp) => {
        console.log('resp ', resp.payload);
      }); // updateProduit doit prendre l'objet complet
    } else {
      // Cas création
      await dispatch(addProduit(newProduit));
    }

    await dispatch(fetchProduits()).then((resp) => {
      setProduits(resp.payload);
    });

    setNewProduit({
      nom: '',
      categorie: '',
      prix: 0,
      prixVente: 0,
      tva: 0,
    }); // reset le form

    setDialogType(null);
  };

  useEffect(() => {
    if (dialogType === 'edit' && selectedProduit) {
      setNewProduit({
        nom: selectedProduit.nom || '',
        //@ts-ignore
        categorie: selectedProduit.categorie?._id || selectedProduit.categorie || '',
        prix: selectedProduit.prix || 0,
        prixVente: selectedProduit.prixVente || 0,
        tva: selectedProduit.tva || 0,
        marge: selectedProduit.marge || 0,
        unite: selectedProduit.unite || '',

        _id: selectedProduit._id, // si tu en as besoin pour l'update
      });
    }
  }, [dialogType, selectedProduit]);

  const handleInputChange = (field: keyof Produit, value: number | string) => {
    const updated = { ...newProduit, [field]: value };
    if (typeof updated.prix === 'number' && typeof updated.marge === 'number') {
      updated.netTopay = updated.prix + (updated.prix * updated.marge) / 100;
    }
    if (typeof updated.netTopay === 'number' && typeof updated.tva === 'number') {
      updated.prixVente = updated.netTopay + (updated.netTopay * updated.tva) / 100;
    }
    setNewProduit(updated);
  };

  //gestion de variable de categorie

  // traitement de la recherche de produit
  const [searchProd, setSearchProd] = useState('');
  const [filteredProduits, setFilteredProduits] = useState(produits || []);

  useEffect(() => {
    const filtered = produits.filter((p) => {
      const query = searchProd.toLowerCase();
      return (
        p.nom?.toLowerCase().includes(query) ||
        String(p.prix).includes(query) ||
        String(p.marge).includes(query) ||
        String(p.netTopay).includes(query) ||
        String(p.tva).includes(query) ||
        String(p.prixVente).includes(query) ||
        p.unite?.toLowerCase().includes(query)
      );
    });
    setFilteredProduits(filtered);
  }, [searchProd, produits]);

  //file management
  const toast = useRef<Toast>(null);

  const handleFileManagement = ({
    type,
    format,
    file,
  }: {
    type: 'import' | 'export';
    format: 'csv' | 'pdf';
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
      const content = format === 'csv' ? 'name,age\nJohn,30\nJane,25' : 'Excel simulation content';
      const blob = new Blob([content], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `export.${format === 'csv' ? 'csv' : 'xlsx'}`;
      saveAs(blob, filename);

      toast.current?.show({
        severity: 'success',
        summary: `Export ${format.toUpperCase()}`,
        detail: `File downloaded: ${filename}`,
        life: 3000,
      });
    }
  };

  return (
    <div className="  min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Produits1' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-500">Gestion des Produits</h2>
      </div>
      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row">
        <div className=" bg-white p-2 rounded-lg">
          <div className="gap-4 mb-4   flex justify-between">
            <div className="relative w-2/3 flex flex-row ">
              <InputText
                className="p-2 pl-10 border rounded w-full"
                placeholder="Rechercher un produit..."
                value={searchProd}
                onChange={(e) => setSearchProd(e.target.value)}
              />
              <div className="ml-3 flex gap-2 w-2/5">
                <DropdownImportExport onAction={handleFileManagement} />
              </div>
            </div>
            <Button
              label="nouveau"
              icon="pi pi-plus"
              className="!bg-green-700 text-white p-2 rounded"
              onClick={() => setDialogType('create')}
              severity={undefined}
            />
          </div>
          <div>
            <DataTable
              value={filteredProduits}
              paginator
              
              rows={5}
              className="rounded-lg"
              tableStyle={{ minWidth: '70rem' }}
            >
              <Column field="_id" header="#" body={(_, options) => options.rowIndex + 1} />
              <Column field="nom" header="Nom" sortable />
              <Column field="prix" header="cout unitaire" />
              <Column
                field="marge"
                header="Marge (%)"
                body={(rowData: Produit) => rowData.marge ?? 'N/A'}
              />
              <Column
                header="Valeur Marge"
                body={(rowData: Produit) =>
                  rowData.prix && rowData.marge !== undefined
                    ? ((rowData.prix * rowData.marge) / 100).toFixed(2)
                    : 'N/A'
                }
              />
              <Column
                field="netTopay"
                header="Net à Payer"
                body={(rowData: Produit) => rowData.netTopay?.toFixed(2) ?? 'N/A'}
              />
              <Column field="tva" header="TVA (%)" />
              <Column
                header="Valeur TVA"
                body={(rowData: Produit) =>
                  rowData.netTopay && rowData.tva !== undefined
                    ? ((rowData.netTopay * rowData.tva) / 100).toFixed(2)
                    : 'N/A'
                }
              />
              <Column
                field="prixVente"
                header="Prix de Vente"
                body={(rowData: Produit) => rowData.prixVente?.toFixed(2) ?? 'N/A'}
              />
              <Column
                field="unite"
                header="Unité"
                body={(rowData: Produit) => rowData.unite || 'N/A'}
              />

              <Column body={actionBodyTemplate} header="Actions" className="px-4 py-1" />
            </DataTable>
          </div>
        </div>
      </div>
      {/* dialog pour la creation d'un produit */}
      <Dialog
        visible={dialogType === 'create' || dialogType === 'edit'}
        header={dialogType === 'edit' ? 'Modifier le produit' : 'Ajouter un produit'}
        onHide={() => setDialogType(null)}
        style={{ width: '50vw' }}
        modal
      >
        <div className="p-4 space-y-4">
          {/* Ligne 1: nom et catégorie */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom</label>
              <InputText
                type="text"
                value={newProduit.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Catégorie</label>
              <Dropdown
                value={
                  typeof newProduit.categorie === 'string'
                    ? newProduit.categorie
                    : newProduit.categorie?._id
                }
                options={categories.map((cat) => ({ label: cat.nom, value: cat._id }))}
                onChange={(e) => handleInputChange('categorie', e.value)}
                placeholder="Sélectionner une catégorie"
                className="w-full border rounded"
              />
            </div>
          </div>

          {/* Ligne 2: prix, marge, tva */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Prix d&apos;acquisition/Prod</label>
              <InputText
                type="number"
                //@ts-ignore
                value={newProduit.prix}
                onChange={(e) => handleInputChange('prix', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Marge (%)</label>
              <InputText
                type="number"
                //@ts-ignore
                value={newProduit.marge}
                onChange={(e) => handleInputChange('marge', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">TVA (%)</label>
              <InputText
                type="number"
                //@ts-ignore
                value={newProduit.tva}
                onChange={(e) => handleInputChange('tva', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Ligne 3: unité */}
          <div>
            <label className="block mb-1 text-sm font-medium">Unité</label>
            <InputText
              type="text"
              value={newProduit.unite}
              onChange={(e) => handleInputChange('unite', e.target.value)}
              placeholder="Unité (ex: kg, l, pièce)"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Ligne 4: valeurs calculées */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm">
                Valeur Marge: {((newProduit.prix * (newProduit.marge || 0)) / 100).toFixed(2)}{' '}
              </label>
              <label className="block text-sm">
                Valeur TVA:{' '}
                {(((newProduit.netTopay || 0) * (newProduit.tva || 0)) / 100).toFixed(2)}
              </label>
            </div>
            <div className="flex-1 text-right">
              <label className="block text-sm font-medium">
                Net à payer: {newProduit.netTopay?.toFixed(2)}
              </label>
              <label className="block text-sm font-medium">
                Prix de vente: {newProduit.prixVente?.toFixed(2)}
              </label>
            </div>
          </div>

          {/* Bouton action */}
          <div className="flex justify-end">
            <Button
              label={dialogType === 'edit' ? 'Modifier' : 'Ajouter'}
              className="!bg-green-700 text-white"
              onClick={handleSubmitProduit}
              severity={undefined}
            />
          </div>
        </div>
      </Dialog>

      {/* delete dialog pour produit */}

      <ConfirmDeleteDialog
        visible={isDeleteProduit}
        onHide={() => setIsDeleteProduit(false)}
        onConfirm={(item) => {
          dispatch(deleteProduit(item._id)).then(() => {
            dispatch(fetchProduits()).then((resp) => {
              setAllProduits(resp.payload); // garde la version complète
              setProduits(resp.payload); // version visible (filtrée ou pas)
            });
            setIsDeleteProduit(false);
          });
        }}
        item={selectedProduit}
        objectLabel="le produit"
        displayField="nom"
      />
    </div>
  );
};

export default page;
