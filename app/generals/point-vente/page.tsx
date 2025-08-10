/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import {
  addPointVente,
  deletePointVente,
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
  updatePointVente,
} from '@/stores/slices/pointvente/pointventeSlice';

import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';

import { PointVente } from '@/Models/pointVenteType';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';

/* ----------------------------- Helpers robustes ---------------------------- */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const normalize = (s: unknown) =>
  (typeof s === 'string' ? s : '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/* --------------------------------- Types ----------------------------------- */

type PVForm = { nom: string; adresse: string; region: string | null };
type ActionKind = 'create' | 'details' | 'edit' | 'delete' | null;
type MenuMap = Record<string, Menu | null>;

/* -------------------------------- Component -------------------------------- */

export default function PointVenteManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const pointsVente = useSelector((state: RootState) => asArray<PointVente>(selectAllPointVentes(state)));
  const regions = useSelector((state: RootState) => asArray<{ _id: string; nom: string }>(selectAllRegions(state)));

  const [dialogType, setDialogType] = useState<ActionKind>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [newPointVente, setNewPointVente] = useState<PVForm>({ nom: '', adresse: '', region: null });

  // Menus par ligne
  const menuRefs = useRef<MenuMap>({});
  const setMenuRef = useCallback((id: string, el: Menu | null) => {
    if (!id) return;
    menuRefs.current[id] = el;
  }, []);
  const showMenu = useCallback((event: React.MouseEvent, id: string, row: PointVente) => {
    setSelectedPointVente(row ?? null);
    menuRefs.current[id]?.toggle(event);
  }, []);

  // user côté client
  const user =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem('user-agricap') || 'null');
          } catch {
            return null;
          }
        })()
      : null;

  /* ----------------------------- Chargement data ---------------------------- */
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        await dispatch(fetchRegions());
        if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
          await dispatch(fetchPointVentesByRegionId(user.region._id));
        } else {
          await dispatch(fetchPointVentes());
        }
      } catch {
        if (!isActive) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les points de vente.',
          life: 3000,
        });
      }
    })();
    return () => {
      isActive = false;
    };
  }, [dispatch, user?.role, user?.region?._id]);

  /* --------------------------------- Recherche ------------------------------ */
  const [searchPV, setSearchPV] = useState('');
  const filteredPointsVente = useMemo(() => {
    const q = normalize(searchPV);
    if (!q) return pointsVente;
    return pointsVente.filter((pv) => {
      const regionNom =
        typeof pv?.region === 'object' && pv?.region !== null && 'nom' in pv.region
          ? normalize((pv.region as any).nom)
          : '';
      return normalize(pv?.nom).includes(q) || normalize(pv?.adresse).includes(q) || regionNom.includes(q);
    });
  }, [pointsVente, searchPV]);

  /* ---------------------------------- Actions ------------------------------- */
  const handleAction = useCallback((action: ActionKind, row: PointVente | null) => {
    setSelectedPointVente(row ?? null);
    setDialogType(action);
  }, []);

  const refresh = useCallback(async () => {
    if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      await dispatch(fetchPointVentesByRegionId(user.region._id));
    } else {
      await dispatch(fetchPointVentes());
    }
  }, [dispatch, user?.role, user?.region?._id]);

  const handleCreate = useCallback(async () => {
    if (!isNonEmptyString(newPointVente.nom) || !isNonEmptyString(newPointVente.adresse) || !isNonEmptyString(newPointVente.region)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Nom, adresse et région sont obligatoires.',
        life: 3000,
      });
      return;
    }
    try {
      const r = await dispatch(addPointVente(newPointVente as any));
      if ((addPointVente as any).fulfilled.match(r)) {
        toast.current?.show({ severity: 'success', summary: 'Ajouté', detail: 'Point de vente créé.', life: 2500 });
        await refresh();
        setDialogType(null);
        setNewPointVente({ nom: '', adresse: '', region: null });
      } else {
        throw new Error('Création non aboutie');
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: "Échec de l'ajout.", life: 3000 });
    }
  }, [dispatch, newPointVente, refresh]);

  const handleUpdate = useCallback(async () => {
    const id = (selectedPointVente as any)?._id ?? '';
    if (!isNonEmptyString(id)) {
      setDialogType(null);
      return;
    }
    try {
      const r = await dispatch(updatePointVente({ id, updateData: selectedPointVente } as any));
      if ((updatePointVente as any).fulfilled.match(r)) {
        toast.current?.show({ severity: 'success', summary: 'Mis à jour', detail: 'Point de vente modifié.', life: 2500 });
        await refresh();
      } else {
        throw new Error('Mise à jour non aboutie');
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la mise à jour.', life: 3000 });
    } finally {
      setSelectedPointVente(null);
      setDialogType(null);
    }
  }, [dispatch, selectedPointVente, refresh]);

  const handleDelete = useCallback(async () => {
    const id = (selectedPointVente as any)?._id ?? '';
    if (!isNonEmptyString(id)) {
      setDialogType(null);
      return;
    }
    try {
      const r = await dispatch(deletePointVente(id as any));
      if ((deletePointVente as any).fulfilled.match(r)) {
        toast.current?.show({ severity: 'success', summary: 'Supprimé', detail: 'Point de vente supprimé.', life: 2500 });
        await refresh();
      } else {
        throw new Error('Suppression non aboutie');
      }
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la suppression.', life: 3000 });
    } finally {
      setDialogType(null);
      setSelectedPointVente(null);
    }
  }, [dispatch, selectedPointVente, refresh]);

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
        // TODO: implémenter l’import réel + validations
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
              url: '/export/point-ventes',
              mouvements: pointsVente,
              fileType,
            }) as any
          );
          if ((exportFile as any).fulfilled.match(r)) {
            const filename = `pointVente.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
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

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between mt-5 mb-5">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des points de vente' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Points de Vente</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="gap-4 mb-4 flex justify-between">
          <div className="relative w-2/3 flex flex-row">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher ..."
              value={searchPV}
              onChange={(e) => setSearchPV(e.target.value ?? '')}
            />
            <div className="ml-3 flex w-2/5">
              <DropdownImportExport onAction={handleFileManagement} />
            </div>
          </div>
          <Button
            icon="pi pi-plus"
            label="Nouveau"
            className="text-white p-2 rounded !bg-green-700"
            onClick={() => {
              setNewPointVente({ nom: '', adresse: '', region: null });
              setDialogType('create');
            }}
          />
        </div>

        <DataTable
          value={filteredPointsVente}
          size="small"
          paginator
          rows={10}
          className="rounded-lg text-[11px]"
          tableStyle={{ minWidth: '50rem' }}
          //@ts-ignore
          rowClassName={(_, opt) => (opt?.rowIndex % 2 === 0 ? '!bg-gray-100 !text-gray-900' : '!bg-green-50 !text-gray-900')}
          emptyMessage="Aucun point de vente"
        >
          <Column
            header="#"
            body={(_, options) => (Number.isFinite(options?.rowIndex) ? (options!.rowIndex as number) + 1 : '-')}
            className="text-[11px]"
            headerClassName="!bg-green-900 !text-white text-[11px]"
          />
          <Column
            field="region"
            header="Région"
            body={(row: PointVente) =>
              typeof row?.region === 'object' && row?.region !== null ? (row.region as any)?.nom ?? 'N/A' : 'N/A'
            }
            sortable
            className="text-[11px] !p-[2px]"
            headerClassName="!bg-green-900 !text-white text-[11px]"
          />
          <Column field="nom" header="Nom" sortable className="text-[11px] !p-[2px]" headerClassName="!bg-green-900 !text-white text-[11px]" />
          <Column
            field="adresse"
            header="Adresse"
            sortable
            className="text-[11px] !p-[2px]"
            headerClassName="!bg-green-900 !text-white text-[11px]"
          />
          <Column
            header="Actions"
            className="!p-[2px] text-[11px]"
            headerClassName="!bg-green-900 !text-white text-[11px]"
            body={(row: PointVente) => (
              <>
                <Button
                  icon="pi pi-bars"
                  className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                  onClick={(e) => showMenu(e, (row as any)?._id ?? '', row)}
                  disabled={!isNonEmptyString((row as any)?._id)}
                  aria-haspopup
                />
                <Menu
                  popup
                  model={[
                    { label: 'Détails', command: () => handleAction('details', row) },
                    { label: 'Modifier', command: () => handleAction('edit', row) },
                    { label: 'Supprimer', command: () => handleAction('delete', row) },
                  ]}
                  ref={(el) => setMenuRef((row as any)?._id ?? '', el)}
                />
              </>
            )}
          />
        </DataTable>
      </div>

      {/* Create */}
      <Dialog visible={dialogType === 'create'} header="Ajouter un point de vente" onHide={() => setDialogType(null)} style={{ width: '40vw' }} modal>
        <div className="p-4">
          <div className="mb-4">
            <InputText
              type="text"
              placeholder="Nom"
              value={newPointVente.nom}
              onChange={(e) => setNewPointVente((p) => ({ ...p, nom: e.target.value ?? '' }))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <InputText
              type="text"
              placeholder="Adresse"
              value={newPointVente.adresse}
              onChange={(e) => setNewPointVente((p) => ({ ...p, adresse: e.target.value ?? '' }))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <Dropdown
              value={newPointVente.region}
              options={regions.map((r) => ({ label: r?.nom ?? '—', value: r?._id ?? '' }))}
              onChange={(e) => setNewPointVente((p) => ({ ...p, region: e.value ?? null }))}
              placeholder="Sélectionner une région"
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button label="Ajouter" className="!bg-green-700 text-white" onClick={handleCreate} />
          </div>
        </div>
      </Dialog>

      {/* Delete */}
      <Dialog visible={dialogType === 'delete'} header="Confirmation" onHide={() => setDialogType(null)} style={{ width: '30vw' }} modal>
        <div className="p-4">
          <p>Voulez-vous vraiment supprimer ce point de vente ?</p>
          <div className="flex justify-end mt-4 gap-2">
            <Button label="Annuler" className="p-button-secondary" onClick={() => setDialogType(null)} />
            <Button label="Supprimer" className="bg-red-700 text-white" onClick={handleDelete} />
          </div>
        </div>
      </Dialog>

      {/* Details */}
      <Dialog visible={dialogType === 'details'} header="Détails du point de vente" onHide={() => setDialogType(null)} style={{ width: '40vw' }} modal>
        <div className="p-4">
          <p>
            <strong>Nom:</strong> {selectedPointVente?.nom ?? '-'}
          </p>
          <p>
            <strong>Adresse:</strong> {selectedPointVente?.adresse ?? '-'}
          </p>
          <p>
            <strong>Région:</strong>{' '}
            {typeof selectedPointVente?.region === 'object' && selectedPointVente?.region !== null
              ? (selectedPointVente.region as any)?.nom ?? 'Non défini'
              : regions.find((r) => r._id === (selectedPointVente as any)?.region)?.nom || 'Non défini'}
          </p>
        </div>
      </Dialog>

      {/* Edit */}
      <Dialog visible={dialogType === 'edit'} header="Modifier le point de vente" onHide={() => setDialogType(null)} style={{ width: '40vw' }} modal>
        <div className="p-4">
          <div className="mb-2">
            <label className="block mb-1 text-xs text-gray-600">Nom</label>
            <InputText
              placeholder="Nom"
              value={selectedPointVente?.nom ?? ''}
              onChange={(e) => setSelectedPointVente((p) => (p ? { ...p, nom: e.target.value ?? '' } : p))}
              className="w-full p-2 border rounded mb-4"
            />
          </div>
          <div className="mb-2">
            <label className="block mb-1 text-xs text-gray-600">Adresse</label>
            <InputText
              placeholder="Adresse"
              value={selectedPointVente?.adresse ?? ''}
              onChange={(e) => setSelectedPointVente((p) => (p ? { ...p, adresse: e.target.value ?? '' } : p))}
              className="w-full p-2 border rounded mb-4"
            />
          </div>
          <div className="mb-2 flex justify-end">
            <Button label="Mettre à jour" className="!bg-green-700 text-white" onClick={handleUpdate} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
