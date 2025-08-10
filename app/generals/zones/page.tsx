/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import {
  addRegion,
  updateRegion,
  deleteRegion,
  fetchRegions,
  selectAllRegions,
} from '@/stores/slices/regions/regionSlice';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';
import { Toast } from 'primereact/toast';

/* ----------------------------- Helpers robustes ---------------------------- */
type Region = { _id?: string; nom?: string; ville?: string; pointVenteCount?: number };

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const normalize = (s: unknown) =>
  (typeof s === 'string' ? s : '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

type MenuMap = Record<string, Menu | null>;

export default function RegionManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  /* ------------------------------- Store data ------------------------------- */
  const regions = useSelector((state: RootState) => asArray<Region>(selectAllRegions(state)));

  /* --------------------------------- UI state ------------------------------- */
  const [search, setSearch] = useState('');
  const [dialogType, setDialogType] = useState<'create' | 'edit' | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [newRegion, setNewRegion] = useState<Region>({ nom: '', ville: '' });
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(5);
  const [loading, setLoading] = useState(false);

  /* ------------------------------ Menus par ligne --------------------------- */
  const menuRefs = useRef<MenuMap>({});
  const setMenuRef = useCallback((id: string, el: Menu | null) => {
    if (!id) return;
    menuRefs.current[id] = el;
  }, []);
  const showMenu = useCallback((e: React.MouseEvent, id: string, row: Region) => {
    setSelectedRegion(row);
    menuRefs.current[id]?.toggle(e);
  }, []);

  /* ------------------------------ Chargement data --------------------------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await dispatch(fetchRegions());
      } catch {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les régions.',
          life: 3000,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [dispatch]);

  /* --------------------------------- Filtrage ------------------------------- */
  const filteredRegions = useMemo(() => {
    const q = normalize(search);
    return regions.filter((r) => {
      const nom = normalize(r?.nom);
      const ville = normalize(r?.ville);
      const pvc = String(safeNumber(r?.pointVenteCount)).toLowerCase();
      return !q || nom.includes(q) || ville.includes(q) || pvc.includes(q);
    });
  }, [regions, search]);

  /* ------------------------------ CRUD handlers ----------------------------- */
  const handleCreate = useCallback(async () => {
    if (!isNonEmptyString(newRegion.nom) || !isNonEmptyString(newRegion.ville)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Veuillez renseigner Nom et Ville.',
        life: 2500,
      });
      return;
    }
    try {
      setLoading(true);
      const res = await dispatch(addRegion({ nom: newRegion.nom.trim(), ville: newRegion.ville.trim() }) as any);
      // @ts-ignore
      if (addRegion.fulfilled?.match?.(res) || res?.meta?.requestStatus === 'fulfilled') {
        toast.current?.show({ severity: 'success', summary: 'Ajouté', detail: 'Région créée.', life: 2000 });
        setDialogType(null);
        setNewRegion({ nom: '', ville: '' });
        await dispatch(fetchRegions());
      } else {
        throw new Error();
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: "Échec de l'ajout.", life: 3000 });
    } finally {
      setLoading(false);
    }
  }, [dispatch, newRegion]);

  const handleUpdate = useCallback(async () => {
    if (!selectedRegion?._id) return;
    if (!isNonEmptyString(selectedRegion.nom) || !isNonEmptyString(selectedRegion.ville)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Veuillez renseigner Nom et Ville.',
        life: 2500,
      });
      return;
    }
    try {
      setLoading(true);
      const res = await dispatch(updateRegion(selectedRegion as any) as any);
      // @ts-ignore
      if (updateRegion.fulfilled?.match?.(res) || res?.meta?.requestStatus === 'fulfilled') {
        toast.current?.show({ severity: 'success', summary: 'Modifié', detail: 'Région mise à jour.', life: 2000 });
        setDialogType(null);
        await dispatch(fetchRegions());
      } else {
        throw new Error();
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la modification.', life: 3000 });
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedRegion]);

  const handleDelete = useCallback(async () => {
    if (!selectedRegion?._id) return;
    try {
      setLoading(true);
      const res = await dispatch(deleteRegion(selectedRegion._id) as any);
      // @ts-ignore
      if (deleteRegion.fulfilled?.match?.(res) || res?.meta?.requestStatus === 'fulfilled') {
        toast.current?.show({ severity: 'success', summary: 'Supprimé', detail: 'Région supprimée.', life: 2000 });
        await dispatch(fetchRegions());
      } else {
        throw new Error();
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la suppression.', life: 3000 });
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedRegion?._id]);

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
      if (type === 'import' && file) {
        toast.current?.show({
          severity: 'info',
          summary: `Import ${format.toUpperCase()}`,
          detail: `Fichier importé: ${file.name}`,
          life: 3000,
        });
        // TODO: implémenter parsing + validations
        return;
      }

      if (type === 'export') {
        if (format === 'pdf') {
          toast.current?.show({
            severity: 'warn',
            summary: 'Export PDF non supporté',
            detail: "L'export PDF n'est pas disponible pour ce module.",
            life: 3000,
          });
          return;
        }
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/regions',
              mouvements: filteredRegions,
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
    [dispatch, filteredRegions]
  );

  /* --------------------------------- UI ------------------------------------ */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between mb-3 mt-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des régions' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Régions</h2>
      </div>

      <div className="bg-white p-2 rounded-lg">
        <div className="flex justify-between my-4">
          <div className="relative w-2/3 flex justify-between gap-2">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value ?? '')}
            />
            <div className="ml-3 flex gap-2 w-2/5">
              <DropdownImportExport onAction={handleFileManagement} />
            </div>
          </div>

          <Button
            icon="pi pi-plus"
            label="nouveau"
            className="!bg-green-700 text-white p-2 rounded border-none"
            onClick={() => {
              setNewRegion({ nom: '', ville: '' });
              setDialogType('create');
            }}
          />
        </div>

        <div className="rounded-lg shadow-md">
          <DataTable
            value={filteredRegions}
            paginator
            rows={rows}
            first={first}
            onPage={(e) => {
              setFirst(e.first ?? 0);
              setRows(e.rows ?? 5);
            }}
            loading={loading}
            size="small"
            className="rounded-lg text-[11px]"
            tableStyle={{ minWidth: '50rem' }}
            rowClassName={(_, options) => {
              //@ts-ignore
              const idx = options?.rowIndex ?? 0;
              const global = first + idx;
              return global % 2 === 0 ? '!bg-gray-300 !text-gray-900' : '!bg-green-900 !text-white';
            }}
          >
            <Column
              header="#"
              body={(_, options) => <span className="text-[11px]">{(options?.rowIndex ?? 0) + 1}</span>}
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column field="nom" header="Nom" sortable headerClassName="text-[11px] !bg-green-900 !text-white" />
            <Column
              field="pointVenteCount"
              header="Points de vente"
              body={(r: Region) => safeNumber(r?.pointVenteCount).toString()}
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column field="ville" header="Ville" sortable headerClassName="text-[11px] !bg-green-900 !text-white" />

            <Column
              header="Actions"
              body={(row: Region) => (
                <>
                  <Button
                    icon="pi pi-bars"
                    className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                    onClick={(e) => showMenu(e, row?._id ?? '', row)}
                    disabled={!isNonEmptyString(row?._id)}
                    aria-haspopup
                  />
                  <Menu
                    popup
                    ref={(el) => setMenuRef(row?._id ?? '', el)}
                    model={[
                      { label: 'Détails', command: () => setSelectedRegion(row) },
                      {
                        label: 'Modifier',
                        command: () => {
                          setSelectedRegion(row);
                          setDialogType('edit');
                        },
                      },
                      {
                        label: 'Supprimer',
                        command: () => {
                          setSelectedRegion(row);
                          setDeleteDialogOpen(true);
                        },
                      },
                    ]}
                  />
                </>
              )}
              headerClassName="!text-[11px] !bg-green-900 !text-white"
            />
          </DataTable>
        </div>
      </div>

      {/* Dialog édition */}
      <Dialog
        visible={dialogType === 'edit'}
        header="Modifier une région"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw', maxWidth: 700 }}
        modal
      >
        <div className="p-4">
          {(['nom', 'ville'] as const).map((key) => (
            <div key={key} className="mb-4">
              <InputText
                type="text"
                placeholder={key === 'nom' ? 'Nom' : 'Ville'}
                value={(selectedRegion as any)?.[key] ?? ''}
                onChange={(e) => setSelectedRegion((p) => (p ? { ...p, [key]: e.target.value } : p))}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <Button label="Modifier" className="!bg-green-700 text-white" onClick={handleUpdate} loading={loading} />
          </div>
        </div>
      </Dialog>

      {/* Dialog création */}
      <Dialog
        visible={dialogType === 'create'}
        header="Ajouter une région"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw', maxWidth: 700 }}
        modal
      >
        <div className="p-4">
          {(['nom', 'ville'] as const).map((key) => (
            <div key={key} className="mb-4">
              <InputText
                type="text"
                placeholder={key === 'nom' ? 'Nom' : 'Ville'}
                value={(newRegion as any)?.[key] ?? ''}
                onChange={(e) => setNewRegion((p) => ({ ...p, [key]: e.target.value }))}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <Button label="Ajouter" className="!bg-green-700 text-white" onClick={handleCreate} loading={loading} />
          </div>
        </div>
      </Dialog>

      {/* Dialog suppression */}
      <ConfirmDeleteDialog
        visible={deleteDialogOpen}
        onHide={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          handleDelete();
          setDeleteDialogOpen(false);
        }}
        item={selectedRegion ?? { _id: '', nom: '' }}
        objectLabel="la région"
        displayField="nom"
      />
    </div>
  );
}
