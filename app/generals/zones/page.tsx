/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
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
} from '@/stores/slices/regions/regionSlice';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';

/* ----------------------------- Helpers ----------------------------- */
type Region = { _id?: string; nom?: string; ville?: string; pointVenteCount?: number };

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/* --------------------------------- Page ---------------------------------- */

export default function RegionManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Store
  const regions = useSelector((state: RootState) => asArray<Region>(selectAllRegions(state)));
  const meta = useSelector(selectRegionMeta);
  const status = useSelector(selectRegionStatus);
  const loading = status === 'loading';

  // Requête serveur (params)
  const [page, setPage] = useState(1); // 1-based
  const [rows, setRows] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [villeFilter, setVilleFilter] = useState('');

  // Modals / sélection
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);

  // Formulaire création/édition
  const [form, setForm] = useState<Pick<Region, 'nom' | 'ville'>>({ nom: '', ville: '' });

  // ✅ Un seul Menu global pour corriger le bug de sélection
  const menuRef = useRef<Menu>(null);
  const selectedRowDataRef = useRef<Region | null>(null);
  const handleAction = useCallback((action: 'details' | 'edit' | 'delete', row: Region) => {
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
      { label: 'Détails', command: () => selectedRowDataRef.current && handleAction('details', selectedRowDataRef.current) },
      { label: 'Modifier', command: () => selectedRowDataRef.current && handleAction('edit', selectedRowDataRef.current) },
      { label: 'Supprimer', command: () => selectedRowDataRef.current && handleAction('delete', selectedRowDataRef.current) },
    ],
    [handleAction]
  );

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

  /* ------------------------------- Handlers UI ------------------------------ */
  const onPage = useCallback(
    (e: DataTablePageEvent) => {
      const newPage = (e.page ?? 0) + 1; // PrimeReact 0-based
      setPage(newPage);
      setRows(e.rows);
      dispatch(
        fetchRegions({
          page: newPage,
          limit: e.rows,
          q: searchText || undefined,
          ville: villeFilter || undefined,
          sortBy,
          order,
          includeTotal: true,
        })
      );
    },
    [dispatch, searchText, villeFilter, sortBy, order]
  );

  const onSort = useCallback(
    (e: DataTableSortEvent) => {
      const newSortBy = (e.sortField as string) || 'createdAt';
      const newOrder = e.sortOrder === 1 ? 'asc' : 'desc';
      setSortBy(newSortBy);
      setOrder(newOrder);
      setPage(1);
      dispatch(
        fetchRegions({
          page: 1,
          limit: rows,
          q: searchText || undefined,
          ville: villeFilter || undefined,
          sortBy: newSortBy,
          order: newOrder,
          includeTotal: true,
        })
      );
    },
    [dispatch, rows, searchText, villeFilter]
  );

  const applyFilters = useCallback(() => {
    setPage(1);
    dispatch(
      fetchRegions({
        page: 1,
        limit: rows,
        q: searchText || undefined,
        ville: villeFilter || undefined,
        sortBy,
        order,
        includeTotal: true,
      })
    );
  }, [dispatch, rows, searchText, villeFilter, sortBy, order]);

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
      toast.current?.show({ severity: 'warn', summary: 'Champs requis', detail: 'Nom et Ville sont requis', life: 2500 });
      return;
    }
    const r = await dispatch(addRegion({ nom: form.nom.trim(), ville: form.ville.trim() }) as any);
    if ((addRegion as any).fulfilled.match(r)) {
      toast.current?.show({ severity: 'success', summary: 'Ajouté', detail: 'Région créée', life: 2000 });
      resetForm();
      fetchServer();
    } else {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: "Échec de l'ajout", life: 3000 });
    }
  }, [dispatch, form, fetchServer, resetForm]);

  const handleUpdate = useCallback(async () => {
    if (!selectedRegion?._id) return;
    if (!isNonEmptyString(form.nom) || !isNonEmptyString(form.ville)) {
      toast.current?.show({ severity: 'warn', summary: 'Champs requis', detail: 'Nom et Ville sont requis', life: 2500 });
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
      toast.current?.show({ severity: 'success', summary: 'Modifié', detail: 'Région mise à jour', life: 2000 });
      resetForm();
      fetchServer();
    } else {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la modification', life: 3000 });
    }
  }, [dispatch, selectedRegion, form, fetchServer, resetForm]);

  const handleDelete = useCallback(async () => {
    if (!selectedRegion?._id) return;
    const r = await dispatch(deleteRegionThunk(selectedRegion._id) as any);
    if ((deleteRegionThunk as any).fulfilled.match(r)) {
      toast.current?.show({ severity: 'success', summary: 'Supprimé', detail: 'Région supprimée', life: 2000 });
      // si la page devient vide, reculer d’une page
      const nextPage = regions.length === 1 && (meta?.page ?? 1) > 1 ? (meta!.page - 1) : (meta?.page ?? page);
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
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la suppression', life: 3000 });
    }
  }, [dispatch, selectedRegion, regions.length, meta, page, rows, searchText, villeFilter, sortBy, order]);

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

  const actionBodyTemplate = useCallback(
    (rowData: Region) => (
      <div className="flex items-center">
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
    []
  );

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

              <Button label="Filtrer" icon="pi pi-search" className="!bg-green-700 text-white" onClick={applyFilters} />

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
              value={regions}
              lazy
              paginator
              size="small"
              rows={rows}
              totalRecords={meta?.total ?? 0}
              first={((meta?.page ?? page) - 1) * rows}
              onPage={onPage}
              onSort={onSort}
              sortField={sortBy}
              sortOrder={order === 'asc' ? 1 : -1}
              className="rounded-lg text-sm text-gray-900 w-full"
              tableStyle={{ minWidth: '60rem' }}
              rowClassName={(_, options) =>
                // @ts-ignore
                options.rowIndex % 2 === 0 ? '!bg-gray-100 !text-gray-900' : '!bg-green-50 !text-gray-900'
              }
              emptyMessage={loading ? 'Chargement...' : 'Aucune région trouvée'}
              loading={loading}
            >
              <Column
                header="#"
                body={(_, { rowIndex }) =>
                  Number.isFinite(rowIndex) ? ((meta?.page ?? page) - 1) * rows + (rowIndex as number) + 1 : '-'
                }
                headerClassName="text-sm !bg-green-800 !text-white"
                className="text-sm"
              />

              <Column
                field="nom"
                header="Nom"
                sortable
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Region) => r?.nom ?? '—'}
              />

              <Column
                field="pointVenteCount"
                header="Points de vente"
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Region) => String(r?.pointVenteCount ?? 0)}
              />

              <Column
                field="ville"
                header="Ville"
                sortable
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                body={(r: Region) => r?.ville ?? '—'}
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
          <div className="flex justify-between"><span className="font-medium">Nom</span><span>{selectedRegion?.nom ?? '—'}</span></div>
          <div className="flex justify-between"><span className="font-medium">Ville</span><span>{selectedRegion?.ville ?? '—'}</span></div>
          <div className="flex justify-between"><span className="font-medium">Points de vente</span><span>{selectedRegion?.pointVenteCount ?? 0}</span></div>
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
