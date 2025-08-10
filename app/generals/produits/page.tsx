/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '@/stores/store';
import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';
import {
  addProduit,
  deleteProduit,
  fetchProduits,
  updateProduit,
} from '@/stores/slices/produits/produitsSlice';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';

import { Categorie, Produit } from '@/Models/produitsType';
import { API_URL } from '@/lib/apiConfig';

import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

/* ----------------------------- Utils robustes ----------------------------- */

type ProduitForm = {
  nom: string;
  categorie: string; // stocke seulement l'ID ici
  prix: number;
  prixVente: number;
  tva: number;
  marge: number;
  seuil: number;
  netTopay: number;
  unite: string;
};

const INITIAL_FORM: ProduitForm = {
  nom: '',
  categorie: '',
  prix: 0,
  prixVente: 0,
  tva: 0,
  marge: 0,
  seuil: 0,
  netTopay: 0,
  unite: '',
};

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const safeLower = (v?: string | null) => (typeof v === 'string' ? v.toLowerCase() : '');
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const isCategorieObject = (c: unknown): c is Categorie =>
  !!c && typeof c === 'object' && '_id' in (c as any);

const toCategorieId = (c: unknown): string =>
  typeof c === 'string' ? c : isCategorieObject(c) ? (c._id ?? '') : '';

function computePrices(prix: number, marge: number, tva: number) {
  const p = safeNumber(prix);
  const m = safeNumber(marge);
  const t = safeNumber(tva);

  const netTopay = p + (p * m) / 100;
  const prixVente = netTopay + (netTopay * t) / 100;

  return {
    netTopay: Number(netTopay.toFixed(2)),
    prixVente: Number(prixVente.toFixed(2)),
  };
}

function produitToForm(produit: Produit | null | undefined): ProduitForm {
  if (!produit) return { ...INITIAL_FORM };
  const prix = safeNumber(produit.prix);
  const marge = safeNumber(produit.marge);
  const tva = safeNumber(produit.tva);

  const { netTopay, prixVente } = computePrices(prix, marge, tva);

  return {
    nom: isNonEmptyString(produit.nom) ? produit.nom : '',
    categorie: toCategorieId(produit.categorie),
    prix,
    tva,
    marge,
    seuil: safeNumber(produit.seuil),
    netTopay: safeNumber(produit.netTopay, netTopay),
    prixVente: safeNumber(produit.prixVente, prixVente),
    unite: isNonEmptyString(produit.unite) ? produit.unite : '',
  };
}

/* --------------------------------- Page ---------------------------------- */

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const selectedRowDataRef = useRef<Produit | null>(null);

  const categories = useSelector((state: RootState) => asArray<Categorie>(selectAllCategories(state)));

  const [loading, setLoading] = useState(true);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [isDeleteProduit, setIsDeleteProduit] = useState<boolean>(false);

  const [newProduit, setNewProduit] = useState<ProduitForm>({ ...INITIAL_FORM });

  const [searchProd, setSearchProd] = useState('');
  const [categorieFilter, setCategorieFilter] = useState<Categorie | null>(null);

  /* ----------------------------- Chargement data ----------------------------- */
  useEffect(() => {
    let isActive = true;
    const abort = new AbortController();

    (async () => {
      try {
        setLoading(true);
        // On charge en parallèle, mais on protège les résultats
        await Promise.all([dispatch(fetchCategories()), dispatch(fetchProduits())]).then(
          async ([, produitsResult]) => {
            if (!isActive) return;

            if (fetchProduits.fulfilled.match(produitsResult)) {
              const produitsData = asArray<Produit>(produitsResult.payload);
              setAllProduits(produitsData);
            } else {
              toast.current?.show({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Échec du chargement des produits',
                life: 3000,
              });
            }
          }
        );
      } catch (err) {
        if (!isActive) return;
        console.error('Erreur de chargement:', err);
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Une erreur est survenue lors du chargement',
          life: 3000,
        });
      } finally {
        if (isActive) setLoading(false);
      }
    })();

    return () => {
      isActive = false;
      abort.abort();
    };
  }, [dispatch]);

  /* ----------------------------- Filtres mémoïsés ---------------------------- */
  const filteredProduits = useMemo(() => {
    const list = asArray<Produit>(allProduits);

    if (list.length === 0) return [];

    const q = normalize(searchProd || '');

    const filteredByText = q
      ? list.filter((p) => {
          const nom = normalize(p?.nom || '');
          const prix = String(safeNumber(p?.prix));
          const marge = String(safeNumber(p?.marge));
          const net = String(safeNumber(p?.netTopay));
          const tva = String(safeNumber(p?.tva));
          const pv = String(safeNumber(p?.prixVente));
          const unite = normalize(p?.unite || '');

          return (
            nom.includes(q) ||
            prix.includes(q) ||
            marge.includes(q) ||
            net.includes(q) ||
            tva.includes(q) ||
            pv.includes(q) ||
            unite.includes(q)
          );
        })
      : list;

    const catId = categorieFilter?._id ?? '';
    if (!isNonEmptyString(catId)) return filteredByText;

    return filteredByText.filter((p) => toCategorieId(p.categorie) === catId);
  }, [allProduits, searchProd, categorieFilter]);

  /* ------------------------------- Actions UI -------------------------------- */
  const handleAction = useCallback((action: 'details' | 'edit' | 'delete', rowData: Produit) => {
    setSelectedProduit(rowData ?? null);
    if (action === 'delete') {
      setIsDeleteProduit(true);
      setDialogType(null);
    } else {
      setDialogType(action);
    }
  }, []);

  const actionBodyTemplate = useCallback(
    (rowData: Produit) => (
      <div>
        <Menu
          model={[
            { label: 'Détails', command: () => handleAction('details', rowData) },
            { label: 'Modifier', command: () => handleAction('edit', rowData) },
            { label: 'Supprimer', command: () => handleAction('delete', rowData) },
          ]}
          popup
          ref={menuRef}
        />
        <Button
          icon="pi pi-bars"
          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
          onClick={(event) => {
            selectedRowDataRef.current = rowData ?? null;
            menuRef.current?.toggle(event);
          }}
          aria-haspopup
        />
      </div>
    ),
    [handleAction]
  );

  /* ------------------------- Form helpers (robustes) ------------------------- */
  const resetForm = useCallback(() => {
    setNewProduit({ ...INITIAL_FORM });
    setDialogType(null);
    setSelectedProduit(null);
  }, []);

  useEffect(() => {
    if (dialogType === 'edit' && selectedProduit) {
      setNewProduit(produitToForm(selectedProduit));
    } else if (dialogType === 'create') {
      setNewProduit({ ...INITIAL_FORM });
    }
  }, [dialogType, selectedProduit]);

  const handleInputChange = useCallback(
    (field: keyof ProduitForm, value: any) => {
      const updated: ProduitForm = { ...newProduit };

      if (field === 'nom' || field === 'unite') {
        updated[field] = typeof value === 'string' ? value : '';
      } else if (field === 'categorie') {
        updated.categorie = typeof value === 'string' ? value : '';
      } else {
        // champs numériques
        const num = safeNumber(value, 0);
        (updated as any)[field] = num;

        if (field === 'prix' || field === 'marge' || field === 'tva') {
          const { netTopay, prixVente } = computePrices(
            field === 'prix' ? num : updated.prix,
            field === 'marge' ? num : updated.marge,
            field === 'tva' ? num : updated.tva
          );
          updated.netTopay = netTopay;
          updated.prixVente = prixVente;
        }
      }

      setNewProduit(updated);
    },
    [newProduit]
  );

  /* ------------------------------ CRUD handlers ------------------------------ */
  const refreshProduits = useCallback(async () => {
    const r = await dispatch(fetchProduits());
    if (fetchProduits.fulfilled.match(r)) {
      setAllProduits(asArray<Produit>(r.payload));
    }
  }, [dispatch]);

  const handleSubmitProduit = useCallback(async () => {
    // validation minimale robuste
    if (!isNonEmptyString(newProduit.nom)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champ requis',
        detail: 'Le nom du produit est obligatoire',
        life: 3000,
      });
      return;
    }

    try {
      let r;
      if (selectedProduit?._id) {
        r = await dispatch(
          updateProduit({
            ...newProduit,
            _id: selectedProduit._id,
          })
        );
      } else {
        r = await dispatch(addProduit(newProduit));
      }

      if (addProduit.fulfilled.match(r) || updateProduit.fulfilled.match(r)) {
        await refreshProduits();
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: selectedProduit?._id ? 'Produit mis à jour' : 'Produit créé avec succès',
          life: 3000,
        });
        resetForm();
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: "Échec de l'opération",
          life: 3000,
        });
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'opération",
        life: 3000,
      });
    }
  }, [dispatch, newProduit, selectedProduit, refreshProduits, resetForm]);

  const handleDeleteProduit = useCallback(async () => {
    const id = selectedProduit?._id ?? '';
    if (!isNonEmptyString(id)) {
      setIsDeleteProduit(false);
      setSelectedProduit(null);
      return;
    }

    try {
      const r = await dispatch(deleteProduit(id));
      if (deleteProduit.fulfilled.match(r)) {
        setAllProduits((prev) => prev.filter((p) => p._id !== id));
        toast.current?.show({
          severity: 'success',
          summary: 'Supprimé',
          detail: 'Produit supprimé avec succès',
          life: 3000,
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec de la suppression',
          life: 3000,
        });
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la suppression',
        life: 3000,
      });
    } finally {
      setIsDeleteProduit(false);
      setSelectedProduit(null);
    }
  }, [dispatch, selectedProduit]);

  /* -------------------------- Import / Export robuste ------------------------ */
  const handleFileManagement = useCallback(
    async ({
      type,
      format,
      file,
    }: {
      type: 'import' | 'export';
      format: 'csv' | 'pdf' | 'excel';
      file?: File;
    }) => {
      if (type === 'export') {
        if (format === 'pdf') {
          toast.current?.show({
            severity: 'warn',
            summary: 'Export non supporté',
            detail: "L'export PDF n'est pas disponible",
            life: 3000,
          });
          return;
        }

        try {
          const exportFileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
          const r = await dispatch(
            exportFile({
              url: '/export/produits',
              mouvements: filteredProduits, // déjà protégé
              fileType: exportFileType,
            })
          );

          if (exportFile.fulfilled.match(r)) {
            const filename = `produits.${exportFileType === 'csv' ? 'csv' : 'xlsx'}`;
            downloadExportedFile(r.payload, filename);
            toast.current?.show({
              severity: 'success',
              summary: 'Export réussi',
              detail: `Fichier téléchargé: ${filename}`,
              life: 3000,
            });
          } else {
            throw new Error('Export non abouti');
          }
        } catch (err) {
          toast.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: "Échec de l'export",
            life: 3000,
          });
        }
      }
      // TODO: import (si nécessaire), avec validations strictes
    },
    [dispatch, filteredProduits]
  );

  /* ------------------------- Rendu image catégorie safe ---------------------- */
  const renderCategoryImage = useCallback(
    (rowData: Produit) => {
      const catId = toCategorieId(rowData?.categorie);
      if (!isNonEmptyString(catId)) return null;

      const found = categories.find((c) => c._id === catId);
      const label = found?.nom ?? '';
      const img = found?.image;

      const src =
        isNonEmptyString(img) && isNonEmptyString(API_URL)
          ? `${API_URL}/${img.replace('../', '')}`
          : '';

      if (!isNonEmptyString(src)) return null;

      return (
        <img
          src={src}
          alt={label}
          className="w-8 h-8 rounded-full object-cover border border-gray-100"
          onError={(e) => {
            // masque proprement l’image cassée
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    },
    [categories]
  );

  /* --------------------------------- Loading -------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProgressSpinner />
      </div>
    );
  }

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} position="top-right" />

      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Produits' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Produits</h2>
      </div>

      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row w-full">
        <div className="bg-white p-4 rounded-lg w-full">
          <div className="gap-4 mb-4 w-full flex justify-between flex-wrap">
            <div className="relative w-full md:w-2/3 flex flex-row gap-2 flex-wrap">
              <InputText
                className="p-2 pl-10 border rounded w-full md:w-1/3"
                placeholder="Rechercher un produit..."
                value={searchProd}
                onChange={(e) => setSearchProd(e.target.value ?? '')}
              />

              <DropdownCategorieFilter onSelect={(categorie) => setCategorieFilter(categorie ?? null)} />

              <DropdownImportExport onAction={handleFileManagement} />
            </div>

            <Button
              label="Nouveau"
              icon="pi pi-plus"
              className="!bg-green-700 text-white p-2 rounded"
              onClick={() => setDialogType('create')}
            />
          </div>

          <div>
            <DataTable
              value={asArray<Produit>(filteredProduits)}
              paginator
              size="small"
              rows={10}
              className="rounded-lg text-sm text-gray-900 w-full"
              tableStyle={{ minWidth: '70rem' }}
              rowClassName={(_, options) =>
                //@ts-ignore
                options.rowIndex % 2 === 0 ? '!bg-gray-100 !text-gray-900' : '!bg-green-50 !text-gray-900'
              }
              emptyMessage="Aucun produit trouvé"
              loading={loading}
            >
              <Column
                header="#"
                body={(_, { rowIndex }) => (Number.isFinite(rowIndex) ? rowIndex + 1 : '-')}
                headerClassName="text-sm !bg-green-800 !text-white"
                className="text-sm"
              />

              <Column
                header=""
                body={renderCategoryImage}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                field="nom"
                header="Nom"
                sortable
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => r?.nom ?? '-'}
              />

              <Column
                field="prix"
                header="Prix/U"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => safeNumber(r?.prix).toFixed(2)}
              />

              <Column
                header="Marge (%)"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => safeNumber(r?.marge).toFixed(2)}
              />

              <Column
                header="Valeur Marge"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => {
                  const prix = safeNumber(r?.prix);
                  const marge = safeNumber(r?.marge);
                  return ((prix * marge) / 100).toFixed(2);
                }}
              />

              <Column
                header="Prix de vente/U"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => safeNumber(r?.netTopay).toFixed(2)}
              />

              <Column
                header="TVA (%)"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => safeNumber(r?.tva).toFixed(2)}
              />

              <Column
                header="Valeur TVA"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => {
                  const netTopay = safeNumber(r?.netTopay);
                  const tva = safeNumber(r?.tva);
                  return ((netTopay * tva) / 100).toFixed(2);
                }}
              />

              <Column
                header="TTC/U"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => safeNumber(r?.prixVente).toFixed(2)}
              />

              <Column
                header="Seuil de stock"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => safeNumber(r?.seuil).toFixed(2)}
              />

              <Column
                header="Unité"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Produit) => (isNonEmptyString(r?.unite) ? r.unite : '-')}
              />

              <Column
                body={actionBodyTemplate}
                header="Actions"
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
            </DataTable>
          </div>
        </div>
      </div>

      {/* Dialog Create/Edit */}
      <Dialog
        visible={dialogType === 'create' || dialogType === 'edit'}
        header={dialogType === 'edit' ? 'Modifier le produit' : 'Ajouter un produit'}
        onHide={resetForm}
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom*</label>
              <InputText
                value={newProduit.nom}
                onChange={(e) => handleInputChange('nom', e.target.value ?? '')}
                required
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Catégorie</label>
              <Dropdown
                value={newProduit.categorie}
                options={[
                  { label: 'Sélectionner...', value: '' },
                  ...asArray<Categorie>(categories).map((cat) => ({
                    label: cat?.nom ?? '—',
                    value: cat?._id ?? '',
                  })),
                ]}
                onChange={(e) => handleInputChange('categorie', e.value)}
                className="w-full border rounded"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Prix d&apos;acquisition</label>
              <InputText
                type="number"
                value={String(newProduit.prix)}
                onChange={(e) => handleInputChange('prix', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="decimal"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Marge (%)</label>
              <InputText
                type="number"
                value={String(newProduit.marge)}
                onChange={(e) => handleInputChange('marge', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">TVA (%)</label>
              <InputText
                type="number"
                value={String(newProduit.tva)}
                onChange={(e) => handleInputChange('tva', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="decimal"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Seuil de stock</label>
              <InputText
                type="number"
                value={String(newProduit.seuil)}
                onChange={(e) => handleInputChange('seuil', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Unité</label>
            <InputText
              value={newProduit.unite}
              onChange={(e) => handleInputChange('unite', e.target.value ?? '')}
              placeholder="kg, l, pièce..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-sm text-gray-600">Valeur Marge:</label>
              <span className="font-medium">
                {((safeNumber(newProduit.prix) * safeNumber(newProduit.marge)) / 100).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Valeur TVA:</label>
              <span className="font-medium">
                {((safeNumber(newProduit.netTopay) * safeNumber(newProduit.tva)) / 100).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Net à payer:</label>
              <span className="font-medium">{safeNumber(newProduit.netTopay).toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Prix de vente:</label>
              <span className="font-medium">{safeNumber(newProduit.prixVente).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button label="Annuler" className="!bg-gray-500 text-white" onClick={resetForm} />
            <Button
              label={dialogType === 'edit' ? 'Modifier' : 'Créer'}
              className="!bg-green-700 text-white"
              onClick={handleSubmitProduit}
            />
          </div>
        </div>
      </Dialog>

      <ConfirmDeleteDialog
        visible={isDeleteProduit}
        onHide={() => setIsDeleteProduit(false)}
        onConfirm={handleDeleteProduit}
        item={selectedProduit || { _id: '', nom: '' }}
        objectLabel="le produit"
        displayField="nom"
      />
    </div>
  );
};

export default Page;
