/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AppDispatch, RootState } from '@/stores/store';
import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';

import {
  addProduit,
  deleteProduit as deleteProduitThunk,
  fetchProduits,
  selectAllProduits,
  selectProduitMeta,
  selectProduitStatus,
  updateProduit as updateProduitThunk,
} from '@/stores/slices/produits/produitsSlice';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';

import { Categorie, Produit } from '@/Models/produitsType';
import { API_URL } from '@/lib/apiConfig';

import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

/* ----------------------------- Utils ----------------------------- */

type ProduitForm = {
  nom: string;
  categorie: string;
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
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
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

/* ------------------------- Petit composant d’icône tri --------------------- */
const SortIcon: React.FC<{ order: 'asc' | 'desc' | null }> = ({ order }) => {
  return (
    <span className="inline-block align-middle ml-1">
      {order === 'asc' ? '▲' : order === 'desc' ? '▼' : '↕'}
    </span>
  );
};

/* --------------------------------- Page ---------------------------------- */

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);
  const [loading1, setLoading1] = useState(false);

  // Menu actions (un seul menu global)
  const menuRef = useRef<Menu>(null);
  const selectedRowDataRef = useRef<Produit | null>(null);
  const menuModel = useMemo(
    () => [
      {
        label: 'Détails',
        command: () =>
          selectedRowDataRef.current && handleAction('details', selectedRowDataRef.current),
      },
      {
        label: 'Modifier',
        command: () =>
          selectedRowDataRef.current && handleAction('edit', selectedRowDataRef.current),
      },
      {
        label: 'Supprimer',
        command: () =>
          selectedRowDataRef.current && handleAction('delete', selectedRowDataRef.current),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Store
  const produits = useSelector((state: RootState) => asArray<Produit>(selectAllProduits(state)));
  const meta = useSelector(selectProduitMeta); // attend { total, page, limit, ... }
  const status = useSelector(selectProduitStatus);
  const categories = useSelector((state: RootState) =>
    asArray<Categorie>(selectAllCategories(state))
  );
  const loading = status === 'loading';

  // États serveur : page/rows/tri/filtres
  const [page, setPage] = useState(1); // 1-based
  const [rows, setRows] = useState(10);
  const [sortBy, setSortBy] = useState<string>('updatedAt'); // 👈 tri par updatedAt demandé
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [categorieFilter, setCategorieFilter] = useState<Categorie | null>(null);

  // Modals
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [isDeleteProduit, setIsDeleteProduit] = useState<boolean>(false);

  // Form
  const [form, setForm] = useState<ProduitForm>({ ...INITIAL_FORM });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const fetchServer = useCallback(() => {
    dispatch(
      fetchProduits({
        page,
        limit: rows,
        q: searchText || undefined,
        categorie: categorieFilter?._id || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, page, rows, searchText, categorieFilter, sortBy, order]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  const handleAction = useCallback((action: 'details' | 'edit' | 'delete', rowData: Produit) => {
    setSelectedProduit(rowData ?? null);
    if (action === 'delete') {
      setIsDeleteProduit(true);
      setDialogType(null);
    } else {
      setDialogType(action);
    }
  }, []);

  // Form model
  useEffect(() => {
    if ((dialogType === 'edit' || dialogType === 'details') && selectedProduit) {
      setForm(produitToForm(selectedProduit));
    } else if (dialogType === 'create') {
      setForm({ ...INITIAL_FORM });
    }
  }, [dialogType, selectedProduit]);

  const handleInputChange = useCallback((field: keyof ProduitForm, value: any) => {
    setForm((prev) => {
      const updated = { ...prev };
      if (field === 'nom' || field === 'unite') {
        updated[field] = typeof value === 'string' ? value : '';
      } else if (field === 'categorie') {
        updated.categorie = typeof value === 'string' ? value : '';
      } else {
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
      return updated;
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setDialogType(null);
    setSelectedProduit(null);
  }, []);

  // CRUD
  const handleSubmitProduit = useCallback(async () => {
    if (!isNonEmptyString(form.nom)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champ requis',
        detail: 'Le nom est obligatoire',
        life: 3000,
      });
      return;
    }
    try {
      setLoading1(true);
      let r;
      if (selectedProduit?._id) {
        r = await dispatch(updateProduitThunk({ _id: selectedProduit._id, ...form }));
        setLoading1(false);
      } else {
        r = await dispatch(addProduit(form));
        setLoading1(false);
      }
      if (addProduit.fulfilled.match(r) || updateProduitThunk.fulfilled.match(r)) {
        fetchServer();
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: selectedProduit?._id ? 'Produit mis à jour' : 'Produit créé',
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
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'opération",
        life: 3000,
      });
    }
  }, [dispatch, form, selectedProduit, fetchServer, resetForm]);

  const handleDeleteProduit = useCallback(async () => {
    const id = selectedProduit?._id ?? '';
    if (!isNonEmptyString(id)) {
      setIsDeleteProduit(false);
      setSelectedProduit(null);
      return;
    }
    try {
      const r = await dispatch(deleteProduitThunk(id));
      if (deleteProduitThunk.fulfilled.match(r)) {
        toast.current?.show({
          severity: 'success',
          summary: 'Supprimé',
          detail: 'Produit supprimé',
          life: 3000,
        });
        const total = meta?.total ?? 0;
        const countAfter = total - 1;
        const lastPage = Math.max(1, Math.ceil(countAfter / rows));
        const nextPage = Math.min(page, lastPage);
        setPage(nextPage);
        dispatch(
          fetchProduits({
            page: nextPage,
            limit: rows,
            q: searchText || undefined,
            categorie: categorieFilter?._id || undefined,
            sortBy,
            order,
            includeTotal: true,
          })
        );
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec de la suppression',
          life: 3000,
        });
      }
    } finally {
      setIsDeleteProduit(false);
      setSelectedProduit(null);
    }
  }, [
    dispatch,
    selectedProduit,
    meta?.total,
    rows,
    page,
    searchText,
    categorieFilter,
    sortBy,
    order,
  ]);

  // Export
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
              mouvements: produits, // exporter ce qui est affiché (ou refais une route d’export serveur)
              fileType: exportFileType,
            })
          );
          if (exportFile.fulfilled.match(r)) {
            const filename = `produits.${exportFileType === 'csv' ? 'csv' : 'xlsx'}`;
            downloadExportedFile(r.payload, filename);
            toast.current?.show({
              severity: 'success',
              summary: 'Export réussi',
              detail: filename,
              life: 3000,
            });
          } else {
            throw new Error('Export non abouti');
          }
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: "Échec de l'export",
            life: 3000,
          });
        }
      }
    },
    [dispatch, produits]
  );

  // Rendu image catégorie
  const renderCategoryImage = useCallback(
    (rowData: Produit) => {
      const catId = toCategorieId(rowData?.categorie);
      if (!isNonEmptyString(catId)) return null;
      const found = categories.find((c) => c._id === catId);
      const label = found?.nom ?? '';
      const img = found?.image;
      const src =
        isNonEmptyString(img) && isNonEmptyString(API_URL())
          ? `${API_URL()}/${img.replace('../', '')}`
          : '';
      if (!isNonEmptyString(src)) return null;
      return (
        <img
          src={src}
          alt={label}
          className="w-8 h-8 rounded-full object-cover border border-gray-100"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    },
    [categories]
  );

  /* ----------------------------- Tri au clic ----------------------------- */
  const sortedOrderFor = (field: string) => (sortBy === field ? order : null);
  const toggleSort = (field: string) => {
    if (sortBy !== field) {
      setSortBy(field);
      setOrder('asc');
      setPage(1);
    } else {
      const next: 'asc' | 'desc' = order === 'asc' ? 'desc' : 'asc';
      setOrder(next);
      setPage(1);
    }
  };

  /* --------------------------- Pagination custom -------------------------- */
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / rows));
  const firstIndex = (page - 1) * rows;

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) setPage(next);
  };
  const onChangeRows = (n: number) => {
    setRows(n);
    // recalcule la page pour rester aligné avec l’offset
    const newTotalPages = Math.max(1, Math.ceil(total / n));
    const fixedPage = Math.min(page, newTotalPages);
    setPage(fixedPage);
  };

  // refetch quand page/rows/sort changent via contrôles
  useEffect(() => {
    dispatch(
      fetchProduits({
        page,
        limit: rows,
        q: searchText || undefined,
        categorie: categorieFilter?._id || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
    //@ts-ignore
  }, [dispatch, page, rows, sortBy, order]); // filtres text/cat -> via bouton Filtrer

  const applyFilters = useCallback(() => {
    setPage(1);
    dispatch(
      fetchProduits({
        page: 1,
        limit: rows,
        q: searchText || undefined,
        categorie: categorieFilter?._id || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, rows, searchText, categorieFilter, sortBy, order]);

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} position="top-right" />
      <Menu model={menuModel} popup ref={menuRef} />

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
                className="p-2 border rounded w-full md:w-1/3"
                placeholder="Rechercher un produit..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value ?? '')}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />

              <DropdownCategorieFilter onSelect={(cat) => setCategorieFilter(cat ?? null)} />

              <Button
                label="Filtrer"
                icon="pi pi-search"
                className="!bg-green-700 text-white"
                onClick={applyFilters}
              />

              <DropdownImportExport onAction={handleFileManagement} />
            </div>

            <Button
              label="Nouveau"
              icon="pi pi-plus"
              className="!bg-green-700 text-white p-2 rounded"
              onClick={() => setDialogType('create')}
            />
          </div>

          {/* ---------- TABLE TAILWIND (remplace DataTable) ----------- */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[70rem] w-full text-sm">
              <thead>
                <tr className="bg-green-800 text-white">
                  <th className="px-4 py-2 text-left">N°</th>

                  <th className="px-4 py-2 text-left"> </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('nom')}
                    title="Trier"
                  >
                    Nom <SortIcon order={sortedOrderFor('nom')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('prix')}
                    title="Trier"
                  >
                    Prix/U <SortIcon order={sortedOrderFor('prix')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('marge')}
                    title="Trier"
                  >
                    Marge (%) <SortIcon order={sortedOrderFor('marge')} />
                  </th>

                  <th className="px-4 py-2 text-left">Valeur Marge</th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('netTopay')}
                    title="Trier"
                  >
                    Prix de vente/U <SortIcon order={sortedOrderFor('netTopay')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('tva')}
                    title="Trier"
                  >
                    TVA (%) <SortIcon order={sortedOrderFor('tva')} />
                  </th>

                  <th className="px-4 py-2 text-left">Valeur TVA</th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('prixVente')}
                    title="Trier"
                  >
                    TTC/U <SortIcon order={sortedOrderFor('prixVente')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('seuil')}
                    title="Trier"
                  >
                    Seuil <SortIcon order={sortedOrderFor('seuil')} />
                  </th>

                  <th className="px-4 py-2 text-left">Unité</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && produits.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={13}>
                      Chargement...
                    </td>
                  </tr>
                ) : produits.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={13}>
                      Aucun produit trouvé
                    </td>
                  </tr>
                ) : (
                  produits.map((r, idx) => (
                    <tr
                      key={r._id}
                      className={(idx % 2 === 0 ? 'bg-gray-100' : 'bg-green-50') + ' text-gray-900'}
                    >
                      <td className="px-4 py-2">{firstIndex + idx + 1}</td>

                      <td className="px-4 py-2">{renderCategoryImage(r)}</td>

                      <td className="px-4 py-2">{r?.nom ?? '-'}</td>

                      <td className="px-4 py-2">{safeNumber(r?.prix).toFixed(2)}</td>

                      <td className="px-4 py-2">{safeNumber(r?.marge).toFixed(2)}</td>

                      <td className="px-4 py-2">
                        {((safeNumber(r?.prix) * safeNumber(r?.marge)) / 100).toFixed(2)}
                      </td>

                      <td className="px-4 py-2">{safeNumber(r?.netTopay).toFixed(2)}</td>

                      <td className="px-4 py-2">{safeNumber(r?.tva).toFixed(2)}</td>

                      <td className="px-4 py-2">
                        {((safeNumber(r?.netTopay) * safeNumber(r?.tva)) / 100).toFixed(2)}
                      </td>

                      <td className="px-4 py-2">{safeNumber(r?.prixVente).toFixed(2)}</td>

                      <td className="px-4 py-2">{safeNumber(r?.seuil).toFixed(2)}</td>

                      <td className="px-4 py-2">{isNonEmptyString(r?.unite) ? r.unite : '-'}</td>

                      <td className="px-4 py-2">
                        <Button
                          icon="pi pi-bars"
                          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                          onClick={(event) => {
                            selectedRowDataRef.current = r ?? null;
                            menuRef.current?.toggle(event);
                          }}
                          aria-haspopup
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ---------- PAGINATION TAILWIND ----------- */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-700">
              Page <span className="font-semibold">{page}</span> / {totalPages} —{' '}
              <span className="font-semibold">{total}</span> éléments
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 mr-2">Lignes:</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={rows}
                onChange={(e) => onChangeRows(Number(e.target.value))}
              >
                {[5, 10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <Button
                label="«"
                className="!bg-gray-200 !text-gray-800 px-2 py-1"
                onClick={() => goTo(1)}
                disabled={page <= 1}
              />
              <Button
                label="‹"
                className="!bg-gray-200 !text-gray-800 px-2 py-1"
                onClick={() => goTo(page - 1)}
                disabled={page <= 1}
              />
              <Button
                label="›"
                className="!bg-gray-200 !text-gray-800 px-2 py-1"
                onClick={() => goTo(page + 1)}
                disabled={page >= totalPages}
              />
              <Button
                label="»"
                className="!bg-gray-200 !text-gray-800 px-2 py-1"
                onClick={() => goTo(totalPages)}
                disabled={page >= totalPages}
              />
            </div>
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
                value={form.nom}
                onChange={(e) => handleInputChange('nom', e.target.value ?? '')}
                required
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Catégorie</label>
              <Dropdown
                value={form.categorie}
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
                value={String(form.prix)}
                onChange={(e) => handleInputChange('prix', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="decimal"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Marge (%)</label>
              <InputText
                type="number"
                value={String(form.marge)}
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
                value={String(form.tva)}
                onChange={(e) => handleInputChange('tva', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="decimal"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Seuil de stock</label>
              <InputText
                type="number"
                value={String(form.seuil)}
                onChange={(e) => handleInputChange('seuil', e.target.value)}
                className="w-full p-2 border rounded"
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Unité</label>
            <InputText
              value={form.unite}
              onChange={(e) => handleInputChange('unite', e.target.value ?? '')}
              placeholder="kg, l, pièce..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-sm text-gray-600">Valeur Marge:</label>
              <span className="font-medium">
                {((safeNumber(form.prix) * safeNumber(form.marge)) / 100).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Valeur TVA:</label>
              <span className="font-medium">
                {((safeNumber(form.netTopay) * safeNumber(form.tva)) / 100).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Net à payer:</label>
              <span className="font-medium">{safeNumber(form.netTopay).toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Prix de vente:</label>
              <span className="font-medium">{safeNumber(form.prixVente).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button label="Annuler" className="!bg-gray-500 text-white" onClick={resetForm} />
            <Button
              //@ts-ignore
              label={
                loading1 ? (
                  <div className="flex items-center gap-2">
                    <i className="pi pi-spinner pi-spin"></i>
                    {dialogType === 'edit' ? 'Modifier' : 'Créer'}
                  </div>
                ) : dialogType === 'edit' ? (
                  'Modifier'
                ) : (
                  'Créer'
                )
              }
              disabled={loading1}
              className="!bg-green-700 text-white"
              onClick={handleSubmitProduit}
            />
          </div>
        </div>
      </Dialog>

      {/* Dialog Details */}
      <Dialog
        visible={dialogType === 'details'}
        header="Détails du produit"
        onHide={resetForm}
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Nom</span>
            <span>{selectedProduit?.nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Catégorie</span>
            <span>
              {categories.find((c) => c._id === toCategorieId(selectedProduit?.categorie))?.nom ??
                '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Prix achat</span>
            <span>{safeNumber(selectedProduit?.prix).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Marge (%)</span>
            <span>{safeNumber(selectedProduit?.marge).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">TVA (%)</span>
            <span>{safeNumber(selectedProduit?.tva).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Net à payer</span>
            <span>{safeNumber(selectedProduit?.netTopay).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">TTC/U</span>
            <span>{safeNumber(selectedProduit?.prixVente).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Seuil</span>
            <span>{safeNumber(selectedProduit?.seuil).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Unité</span>
            <span>{selectedProduit?.unite || '—'}</span>
          </div>
        </div>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDeleteDialog
        visible={isDeleteProduit}
        onHide={() => setIsDeleteProduit(false)}
        onConfirm={handleDeleteProduit}
        item={selectedProduit || ({ _id: '', nom: '' } as any)}
        objectLabel="le produit"
        displayField="nom"
      />
    </div>
  );
};

export default Page;
