/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import {
  addRegion,
  updateRegion as updateRegionThunk,
  deleteRegion as deleteRegionThunk,
  fetchRegions,
  selectAllRegions,
  selectRegionMeta,
  selectRegionStatus,
  selectRegionError,
} from '@/stores/slices/regions/regionSlice';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

/* ----------------------------- Helpers ----------------------------- */
type RegionVM = {
  _id?: string;
  nom?: string;
  ville?: string;
  pointVenteCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const SortIcon: React.FC<{ order: 'asc' | 'desc' | null }> = ({ order }) => (
  <span className="inline-block align-middle ml-1">
    {order === 'asc' ? '▲' : order === 'desc' ? '▼' : '↕'}
  </span>
);

/* --------------------------------- Page ---------------------------------- */

export default function RegionManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Store
  const regions = useSelector((state: RootState) => selectAllRegions(state));
  const meta = useSelector(selectRegionMeta);
  const status = useSelector(selectRegionStatus);
  const error = useSelector(selectRegionError);
  const loading = status === 'loading';

  // Requête serveur (params) — 1-based + tri custom
  const [page, setPage] = useState(1); // 1-based
  const [rows, setRows] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [villeFilter, setVilleFilter] = useState('');

  // Modals / sélection
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionVM | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Formulaire création/édition
  const [form, setForm] = useState<Pick<RegionVM, 'nom' | 'ville'>>({ nom: '', ville: '' });

  // ✅ Un seul Menu global pour corriger le bug de sélection
  const menuRef = useRef<Menu>(null);
  const selectedRowDataRef = useRef<RegionVM | null>(null);
  const handleAction = useCallback((action: 'details' | 'edit' | 'delete', row: RegionVM) => {
    setSelectedRegion(row ?? null);
    if (action === 'delete') {
      setIsDeleteOpen(true);
      setDialogType(null);
    } else {
      setDialogType(action);
    }
  }, []);
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
    [handleAction]
  );
  const [loading1, setLoading1] = useState(false);

  /* ------------------------------ Fetch serveur ----------------------------- */
  const fetchServer = useCallback(() => {
    dispatch(
      fetchRegions({
        page,
        limit: rows,
        q: searchText || undefined,
        ville: villeFilter || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, page, rows, searchText, villeFilter, sortBy, order]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  useEffect(() => {
    if (status === 'failed' && error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: error,
        life: 3000,
      });
    }
  }, [status, error]);

  /* -------------------------- Tri & pagination (UI) ------------------------- */
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / rows));
  const firstIndex = (page - 1) * rows;

  const sortedOrderFor = (field: string) => (sortBy === field ? order : null);
  const toggleSort = (field: string) => {
    if (sortBy !== field) {
      setSortBy(field);
      setOrder('asc');
      setPage(1);
    } else {
      setOrder(order === 'asc' ? 'desc' : 'asc');
      setPage(1);
    }
  };

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) setPage(next);
  };

  const onChangeRows = (n: number) => {
    setRows(n);
    const newTotalPages = Math.max(1, Math.ceil(total / n));
    const fixed = Math.min(page, newTotalPages);
    setPage(fixed);
  };

  const applyFilters = useCallback(() => {
    setPage(1);
    fetchServer();
  }, [fetchServer]);

  // Actions CRUD
  const resetForm = useCallback(() => {
    setForm({ nom: '', ville: '' });
    setDialogType(null);
    setSelectedRegion(null);
  }, []);

  useEffect(() => {
    if (dialogType === 'edit' || dialogType === 'details') {
      setForm({ nom: selectedRegion?.nom ?? '', ville: selectedRegion?.ville ?? '' });
    } else if (dialogType === 'create') {
      setForm({ nom: '', ville: '' });
    }
  }, [dialogType, selectedRegion]);

  const handleCreate = useCallback(async () => {
    if (!isNonEmptyString(form.nom) || !isNonEmptyString(form.ville)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Nom et Ville sont requis',
        life: 2500,
      });
      return;
    }
    //@ts-ignore
    const r = await dispatch(addRegion({ nom: form.nom.trim(), ville: form.ville.trim() }) as any);
    if ((addRegion as any).fulfilled.match(r)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Ajouté',
        detail: 'Région créée',
        life: 2000,
      });
      setLoading1(false);
      resetForm();
      fetchServer();
    } else {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'ajout",
        life: 3000,
      });
      setLoading1(false);
    }
  }, [dispatch, form, fetchServer, resetForm]);

  const handleUpdate = useCallback(async () => {
    setLoading1(true);
    if (!selectedRegion?._id) return;
    if (!isNonEmptyString(form.nom) || !isNonEmptyString(form.ville)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Nom et Ville sont requis',
        life: 2500,
      });
      return;
    }
    const r = await dispatch(
      updateRegionThunk({
        _id: selectedRegion._id,
        nom: form.nom.trim(),
        ville: form.ville.trim(),
      } as any)
    );
    if ((updateRegionThunk as any).fulfilled.match(r)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Modifié',
        detail: 'Région mise à jour',
        life: 2000,
      });
      setLoading1(false);
      resetForm();
      fetchServer();
    } else {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la modification',
        life: 3000,
      });
      setLoading1(false);
    }
  }, [dispatch, selectedRegion, form, fetchServer, resetForm]);

  const handleDelete = useCallback(async () => {
    if (!selectedRegion?._id) return;
    const r = await dispatch(deleteRegionThunk(selectedRegion._id) as any);
    if ((deleteRegionThunk as any).fulfilled.match(r)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Supprimé',
        detail: 'Région supprimée',
        life: 2000,
      });
      // si la page devient vide, reculer d’une page
      const nextPage =
        regions.length === 1 && (meta?.page ?? 1) > 1 ? meta!.page - 1 : (meta?.page ?? page);
      setPage(nextPage);
      dispatch(
        fetchRegions({
          page: nextPage,
          limit: rows,
          q: searchText || undefined,
          ville: villeFilter || undefined,
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
  }, [
    dispatch,
    selectedRegion,
    regions.length,
    meta,
    page,
    rows,
    searchText,
    villeFilter,
    sortBy,
    order,
  ]);

  // Export
  const handleFileManagement = useCallback(
    async ({
      type,
      format,
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
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/regions',
              mouvements: regions, // idéalement: endpoint backend d’export avec les mêmes filtres
              fileType,
            }) as any
          );
          if ((exportFile as any).fulfilled.match(r)) {
            const filename = `regions.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
            downloadExportedFile((r as any).payload, filename);
            toast.current?.show({
              severity: 'success',
              summary: `Export ${format.toUpperCase()}`,
              detail: `Fichier téléchargé: ${filename}`,
              life: 3000,
            });
          } else {
            throw new Error();
          }
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: `Export ${format.toUpperCase()} échoué`,
            detail: 'Une erreur est survenue.',
            life: 3000,
          });
        }
      }
    },
    [dispatch, regions]
  );

  const actionButton = useCallback(
    (rowData: RegionVM) => (
      <Button
        icon="pi pi-bars"
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData ?? null;
          menuRef.current?.toggle(event);
        }}
        aria-haspopup
      />
    ),
    []
  );
  console.log('regions = ', regions);

  /* --------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} position="top-right" />
      {/* Menu global */}
      <Menu model={menuModel} popup ref={menuRef} />

      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Régions' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Régions</h2>
      </div>

      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row w-full">
        <div className="bg-white p-4 rounded-lg w-full">
          <div className="gap-4 mb-4 w-full flex justify-between flex-wrap">
            <div className="relative w-full md:w-2/3 flex flex-row gap-2 flex-wrap">
              <InputText
                className="p-2 border rounded w-full md:w-1/3"
                placeholder="Rechercher (nom, ville, etc.)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value ?? '')}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
              <InputText
                className="p-2 border rounded w-full md:w-1/3"
                placeholder="Filtrer par ville"
                value={villeFilter}
                onChange={(e) => setVilleFilter(e.target.value ?? '')}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />

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

          {/* -------- TABLE TAILWIND (look DataTable) -------- */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[60rem] w-full text-sm">
              <thead>
                <tr className="bg-green-800 text-white">
                  <th className="px-4 py-2 text-left">N°</th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('nom')}
                    title="Trier par nom"
                  >
                    Nom <SortIcon order={sortedOrderFor('nom')} />
                  </th>

                  <th className="px-4 py-2 text-left">Points de vente</th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('ville')}
                    title="Trier par ville"
                  >
                    Ville <SortIcon order={sortedOrderFor('ville')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('createdAt')}
                    title="Trier par date de création"
                  >
                    Créée le <SortIcon order={sortedOrderFor('createdAt')} />
                  </th>

                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && regions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                      Chargement...
                    </td>
                  </tr>
                ) : regions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                      Aucune région trouvée
                    </td>
                  </tr>
                ) : (
                  regions.map((r, idx) => (
                    <tr
                      key={r._id}
                      className={(idx % 2 === 0 ? 'bg-gray-100' : 'bg-green-50') + ' text-gray-900'}
                    >
                      <td className="px-4 py-2">
                        {(meta?.page ? (meta.page - 1) * (meta.limit ?? 10) : 0) + idx + 1}
                      </td>
                      <td className="px-4 py-2">{r?.nom ?? '—'}</td>
                      <td className="px-4 py-2">{String(r?.pointVenteCount ?? 0)}</td>
                      <td className="px-4 py-2">{r?.ville ?? '—'}</td>
                      <td className="px-4 py-2">
                        {r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {
                          //@ts-ignore
                          actionButton(r)
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* -------- PAGINATION TAILWIND -------- */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-700">
              Page <span className="font-semibold">{meta?.page ?? 1}</span> /{' '}
              {Math.max(1, meta?.totalPages ?? 1)} —{' '}
              <span className="font-semibold">{meta?.total ?? 0}</span> éléments
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 mr-2">Lignes:</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={rows}
                onChange={(e) => onChangeRows(Number(e.target.value))}
              >
                {[10, 20, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <button
                className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                onClick={() => goTo(1)}
                disabled={(meta?.page ?? 1) <= 1}
              >
                «
              </button>
              <button
                className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                onClick={() => goTo((meta?.page ?? 1) - 1)}
                disabled={(meta?.page ?? 1) <= 1}
              >
                ‹
              </button>
              <button
                className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                onClick={() => goTo((meta?.page ?? 1) + 1)}
                disabled={(meta?.page ?? 1) >= Math.max(1, meta?.totalPages ?? 1)}
              >
                ›
              </button>
              <button
                className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                onClick={() => goTo(Math.max(1, meta?.totalPages ?? 1))}
                disabled={(meta?.page ?? 1) >= Math.max(1, meta?.totalPages ?? 1)}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Create/Edit */}
      <Dialog
        visible={dialogType === 'create' || dialogType === 'edit'}
        header={dialogType === 'edit' ? 'Modifier la région' : 'Ajouter une région'}
        onHide={resetForm}
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom*</label>
              <InputText
                value={form.nom ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value ?? '' }))}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Ville*</label>
              <InputText
                value={form.ville ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, ville: e.target.value ?? '' }))}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button label="Annuler" className="!bg-gray-500 text-white" onClick={resetForm} />
            <Button
              label={dialogType === 'edit' ? 'Modifier' : 'Créer'}
              icon={loading1 ? 'pi pi-spinner pi-spin' : undefined}
              disabled={loading1}
              className="!bg-green-700 text-white"
              onClick={dialogType === 'edit' ? handleUpdate : handleCreate}
            />
          </div>
        </div>
      </Dialog>

      {/* Dialog Details */}
      <Dialog
        visible={dialogType === 'details'}
        header="Détails de la région"
        onHide={resetForm}
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Nom</span>
            <span>{selectedRegion?.nom ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Ville</span>
            <span>{selectedRegion?.ville ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Points de vente</span>
            <span>{selectedRegion?.pointVenteCount ?? 0}</span>
          </div>
        </div>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDeleteDialog
        visible={isDeleteOpen}
        onHide={() => setIsDeleteOpen(false)}
        onConfirm={() => {
          setIsDeleteOpen(false);
          handleDelete();
        }}
        item={selectedRegion ?? { _id: '', nom: '' }}
        objectLabel="la région"
        displayField="nom"
      />
    </div>
  );
}
