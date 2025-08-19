/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import {
  addPointVente,
  deletePointVente as deletePointVenteThunk,
  fetchPointVentes,
  selectAllPointVentes,
  selectPointVenteMeta,
  selectPointVenteStatus,
  updatePointVente as updatePointVenteThunk,
} from '@/stores/slices/pointvente/pointventeSlice';

import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';

import { PointVente } from '@/Models/pointVenteType';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

/* ----------------------------- Helpers ----------------------------- */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

type RegionLite = { _id: string; nom: string };
type PVForm = { nom: string; adresse: string; region: string };

/* --------- Petit composant d’icône de tri --------- */
const SortIcon: React.FC<{ order: 'asc' | 'desc' | null }> = ({ order }) => (
  <span className="inline-block align-middle ml-1">
    {order === 'asc' ? '▲' : order === 'desc' ? '▼' : '↕'}
  </span>
);

/* -------------------------------- Component -------------------------------- */

export default function PointVenteManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Store
  const pointsVente = useSelector((state: RootState) =>
    asArray<PointVente>(selectAllPointVentes(state))
  );
  const regions = useSelector((state: RootState) => asArray<RegionLite>(selectAllRegions(state)));
  const meta = useSelector(selectPointVenteMeta); // doit contenir { total, page, limit, ... }
  const status = useSelector(selectPointVenteStatus);
  const loading = status === 'loading';

  // Requête serveur (params)
  const [page, setPage] = useState(1); // 1-based
  const [rows, setRows] = useState(10);
  const [sortBy, setSortBy] = useState<string>('updatedAt'); // 👈 tri par updatedAt par défaut
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('');

  // Modals / sélection
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [selectedPV, setSelectedPV] = useState<PointVente | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Formulaire création/édition
  const [form, setForm] = useState<PVForm>({ nom: '', adresse: '', region: '' });

  // ✅ Un seul Menu global pour corriger le bug de sélection
  const menuRef = useRef<Menu>(null);
  const selectedRowDataRef = useRef<PointVente | null>(null);
  const handleAction = useCallback((action: 'details' | 'edit' | 'delete', row: PointVente) => {
    setSelectedPV(row ?? null);
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

  /* ----------------------------- Chargement initial ---------------------------- */
  useEffect(() => {
    dispatch(fetchRegions());
  }, [dispatch]);

  // Si l'utilisateur AdminRegion est stocké côté client, on préfiltre par sa région:
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user-agricap') : null;
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      if (u?.role === 'AdminRegion' && isNonEmptyString(u?.region?._id)) {
        setRegionFilter(u.region._id);
      }
    } catch {
      /* noop */
    }
  }, []);

  /* ------------------------------ Fetch serveur ----------------------------- */
  const fetchServer = useCallback(() => {
    dispatch(
      fetchPointVentes({
        page,
        limit: rows,
        q: searchText || undefined,
        region: regionFilter || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, page, rows, searchText, regionFilter, sortBy, order]);

  // 1) premier fetch & quand filtres manuels appliqués
  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  // 2) refetch quand page/rows/sort changent via contrôles (pagination/tri custom)
  useEffect(() => {
    dispatch(
      fetchPointVentes({
        page,
        limit: rows,
        q: searchText || undefined,
        region: regionFilter || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, page, rows, sortBy, order]); // search/region via bouton "Filtrer"

  /* ------------------------------- Tri custom ------------------------------- */
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

  /* --------------------------- Pagination custom ---------------------------- */
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / rows));
  const firstIndex = (page - 1) * rows;

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) setPage(next);
  };

  const onChangeRows = (n: number) => {
    setRows(n);
    const newTotalPages = Math.max(1, Math.ceil(total / n));
    const fixedPage = Math.min(page, newTotalPages);
    setPage(fixedPage);
  };

  /* ------------------------------- Handlers UI ------------------------------ */
  const applyFilters = useCallback(() => {
    setPage(1);
    dispatch(
      fetchPointVentes({
        page: 1,
        limit: rows,
        q: searchText || undefined,
        region: regionFilter || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, rows, searchText, regionFilter, sortBy, order]);

  // Remplir form en fonction de la modal
  useEffect(() => {
    if (dialogType === 'edit' || dialogType === 'details') {
      const regionId =
        typeof selectedPV?.region === 'string'
          ? selectedPV?.region
          : ((selectedPV?.region as any)?._id ?? '');
      setForm({
        nom: selectedPV?.nom ?? '',
        adresse: selectedPV?.adresse ?? '',
        region: regionId,
      });
    } else if (dialogType === 'create') {
      setForm({ nom: '', adresse: '', region: regionFilter || '' });
    }
  }, [dialogType, selectedPV, regionFilter]);

  const resetForm = useCallback(() => {
    setForm({ nom: '', adresse: '', region: '' });
    setDialogType(null);
    setSelectedPV(null);
  }, []);

  /* ------------------------------ CRUD Handlers ----------------------------- */
  const handleCreate = useCallback(async () => {
    if (
      !isNonEmptyString(form.nom) ||
      !isNonEmptyString(form.adresse) ||
      !isNonEmptyString(form.region)
    ) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Nom, Adresse et Région sont obligatoires',
        life: 2500,
      });
      return;
    }
    const r = await dispatch(addPointVente(form as any) as any);
    if ((addPointVente as any).fulfilled.match(r)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Ajouté',
        detail: 'Point de vente créé',
        life: 2000,
      });
      resetForm();
      fetchServer();
    } else {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'ajout",
        life: 3000,
      });
    }
  }, [dispatch, form, fetchServer, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (!selectedPV?._id) return;
    if (
      !isNonEmptyString(form.nom) ||
      !isNonEmptyString(form.adresse) ||
      !isNonEmptyString(form.region)
    ) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Nom, Adresse et Région sont obligatoires',
        life: 2500,
      });
      return;
    }
    const r = await dispatch(
      updatePointVenteThunk({
        id: selectedPV._id,
        updateData: {
          nom: form.nom.trim(),
          adresse: form.adresse.trim(),
          region: form.region,
        },
      }) as any
    );
    if ((updatePointVenteThunk as any).fulfilled.match(r)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Modifié',
        detail: 'Point de vente mis à jour',
        life: 2000,
      });
      resetForm();
      fetchServer();
    } else {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la modification',
        life: 3000,
      });
    }
  }, [dispatch, selectedPV, form, fetchServer, resetForm]);

  const handleDelete = useCallback(async () => {
    if (!selectedPV?._id) return;
    const r = await dispatch(deletePointVenteThunk(selectedPV._id) as any);
    if ((deletePointVenteThunk as any).fulfilled.match(r)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Supprimé',
        detail: 'Point de vente supprimé',
        life: 2000,
      });
      // reculer si la page devient vide
      const nextPage =
        pointsVente.length === 1 && (meta?.page ?? 1) > 1 ? meta!.page - 1 : (meta?.page ?? page);
      setPage(nextPage);
      dispatch(
        fetchPointVentes({
          page: nextPage,
          limit: rows,
          q: searchText || undefined,
          region: regionFilter || undefined,
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
    selectedPV,
    pointsVente.length,
    meta,
    page,
    rows,
    searchText,
    regionFilter,
    sortBy,
    order,
  ]);

  /* ----------------------------- Import / Export ---------------------------- */
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
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/pointventes',
              mouvements: pointsVente, // idéalement: endpoint backend d’export avec les mêmes filtres
              fileType,
            }) as any
          );
          if ((exportFile as any).fulfilled.match(r)) {
            const filename = `pointventes.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
            downloadExportedFile((r as any).payload, filename);
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
            detail: 'Une erreur est survenue.',
            life: 3000,
          });
        }
      }
    },
    [dispatch, pointsVente]
  );

  const regionOptions = useMemo(
    () => [
      { label: 'Toutes les régions', value: '' },
      ...regions.map((r) => ({ label: r.nom, value: r._id })),
    ],
    [regions]
  );

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} position="top-right" />
      {/* Menu global */}
      <Menu model={menuModel} popup ref={menuRef} />

      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Points de vente' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Points de Vente</h2>
      </div>

      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row w-full">
        <div className="bg-white p-4 rounded-lg w-full">
          <div className="gap-4 mb-4 w-full flex justify-between flex-wrap">
            <div className="relative w-full md:w-2/3 flex flex-row gap-2 flex-wrap">
              <InputText
                className="p-2 border rounded w-full md:w-1/3"
                placeholder="Rechercher (nom, adresse, …)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value ?? '')}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />

              <Dropdown
                value={regionFilter}
                options={regionOptions}
                onChange={(e) => setRegionFilter(e.value)}
                className="p-0 w-full md:w-1/3"
                placeholder="Filtrer par région"
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

          {/* ---------- TABLE TAILWIND (sans DataTable) ----------- */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[60rem] w-full text-sm">
              <thead>
                <tr className="bg-green-800 text-white">
                  <th className="px-4 py-2 text-left">N°</th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('region.nom')}
                    title="Trier"
                  >
                    Région <SortIcon order={sortedOrderFor('region.nom')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('nom')}
                    title="Trier"
                  >
                    Nom <SortIcon order={sortedOrderFor('nom')} />
                  </th>

                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort('adresse')}
                    title="Trier"
                  >
                    Adresse <SortIcon order={sortedOrderFor('adresse')} />
                  </th>

                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && pointsVente.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                      Chargement...
                    </td>
                  </tr>
                ) : pointsVente.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                      Aucun point de vente trouvé
                    </td>
                  </tr>
                ) : (
                  pointsVente.map((row, idx) => (
                    <tr
                      key={row._id}
                      className={(idx % 2 === 0 ? 'bg-gray-100' : 'bg-green-50') + ' text-gray-900'}
                    >
                      <td className="px-4 py-2">{firstIndex + idx + 1}</td>

                      <td className="px-4 py-2">
                        {(() => {
                          const reg = row?.region as any;
                          return reg && typeof reg === 'object'
                            ? (reg?.nom ?? '—')
                            : (regions.find((r) => r._id === reg)?.nom ?? '—');
                        })()}
                      </td>

                      <td className="px-4 py-2">{row?.nom ?? '—'}</td>
                      <td className="px-4 py-2">{row?.adresse ?? '—'}</td>

                      <td className="px-4 py-2">
                        <Button
                          icon="pi pi-bars"
                          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                          onClick={(event) => {
                            selectedRowDataRef.current = row ?? null;
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
        header={dialogType === 'edit' ? 'Modifier le point de vente' : 'Ajouter un point de vente'}
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
                onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value ?? '' }))}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Adresse*</label>
              <InputText
                value={form.adresse}
                onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value ?? '' }))}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Région*</label>
              <Dropdown
                value={form.region}
                options={[
                  { label: 'Sélectionner...', value: '' },
                  ...regions.map((r) => ({ label: r.nom, value: r._id })),
                ]}
                onChange={(e) => setForm((p) => ({ ...p, region: e.value ?? '' }))}
                className="w-full border rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button label="Annuler" className="!bg-gray-500 text-white" onClick={resetForm} />
            <Button
              label={dialogType === 'edit' ? 'Modifier' : 'Créer'}
              className="!bg-green-700 text-white"
              onClick={dialogType === 'edit' ? handleUpdate : handleCreate}
            />
          </div>
        </div>
      </Dialog>

      {/* Dialog Details */}
      <Dialog
        visible={dialogType === 'details'}
        header="Détails du point de vente"
        onHide={resetForm}
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Nom</span>
            <span>{selectedPV?.nom ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Adresse</span>
            <span>{selectedPV?.adresse ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Région</span>
            <span>
              {(() => {
                const reg = selectedPV?.region as any;
                return reg && typeof reg === 'object'
                  ? (reg?.nom ?? '—')
                  : (regions.find((r) => r._id === reg)?.nom ?? '—');
              })()}
            </span>
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
        item={selectedPV ?? ({ _id: '', nom: '' } as any)}
        objectLabel="le point de vente"
        displayField="nom"
      />
    </div>
  );
}
