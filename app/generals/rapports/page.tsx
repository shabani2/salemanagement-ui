/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import type { DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { InputText } from 'primereact/inputtext';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import {
  fetchMouvementsStock,
  validateMouvementStock,
  selectAllMouvementsStock,
  selectMouvementStockMeta,
  selectMouvementStockStatus,
} from '@/stores/slices/mvtStock/mvtStock';

import { getOptionsByRole } from '@/lib/utils';
import { ValidationDialog } from '@/components/ui/ValidationDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownTypeFilter from '@/components/ui/dropdowns/dropDownFile-filter';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';

import type { MouvementStock } from '@/Models/mouvementStockType';
import type { Categorie } from '@/Models/produitsType';
import type { PointVente } from '@/Models/pointVenteType';

import { useUserRole } from '@/hooks/useUserRole';
import { API_URL } from '@/lib/apiConfig';

/* ----------------------------- Helpers ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const safeApiImage = (rel?: string) =>
  isNonEmptyString(rel) ? `${API_URL()}/${rel.replace('../', '').replace(/^\/+/, '')}` : '';

/* -------------------------------- Page -------------------------------- */
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Hooks toujours déclarés avant tout return
  const [mounted, setMounted] = useState(false);
  const toast = useRef<Toast | null>(null);

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

  const mvtList = useSelector((s: RootState) => asArray<MouvementStock>(selectAllMouvementsStock(s)));
  const meta = useSelector(selectMouvementStockMeta);
  const status = useSelector(selectMouvementStockStatus);
  const loading = status === 'loading';

  const [selectedMvt, setSelectedMvt] = useState<MouvementStock | null>(null);
  const [isValidateMvt, setIsValidateMvt] = useState(false);

  // pagination & tri serveur
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<1 | -1>(-1);

  // filtres
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  // Un SEUL menu popup global
  const actionsMenuRef = useRef<Menu | null>(null);
  const actionsAnchorRef = useRef<HTMLButtonElement | null>(null);
  const currentRowRef = useRef<MouvementStock | null>(null);

  const openActionsMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, row: MouvementStock) => {
      currentRowRef.current = row;
      actionsAnchorRef.current = e.currentTarget;
      actionsMenuRef.current?.toggle(e);
    },
    []
  );

  const actionsModel = useMemo<MenuItem[]>(
    () => [
      {
        label: 'Valider',
        command: () => {
          if (currentRowRef.current) {
            setSelectedMvt(currentRowRef.current);
            setIsValidateMvt(true);
          }
        },
      },
      // { label: 'Modifier', command: () => {} },
      // { label: 'Supprimer', command: () => {} },
    ],
    []
  );

  useEffect(() => setMounted(true), []);

  /* ---------------------- Types autorisés (rôle) ---------------------- */
  const allowedTypes = useMemo(() => {
    const opts = asArray<{ label: string; value: string }>(getOptionsByRole(user?.role));
    const base = opts.map((o) => o.value);
    return user?.role === 'AdminPointVente' ? [...base, 'Livraison'] : base;
  }, [user?.role]);

  useEffect(() => {
    if (allowedTypes?.length && !selectedType) setSelectedType(allowedTypes[0] ?? null);
  }, [allowedTypes, selectedType]);

  /* ------------------- Filtres côté serveur (query) ------------------ */
  const serverFilters = useMemo(() => {
    const page = Math.floor(first / rows) + 0;
    const roleFilters: Record<string, any> = {};

    if (isAdminPointVente && isNonEmptyString((user as any)?.pointVente?._id)) {
      roleFilters.pointVente = (user as any).pointVente._id;
    } else if (isAdminRegion && isNonEmptyString((user as any)?.region?._id)) {
      roleFilters.region = (user as any).region._id;
    }

    if (selectedPointVente?._id) {
      roleFilters.pointVente = selectedPointVente._id;
      delete roleFilters.region;
    }

    return {
      page,
      limit: rows,
      q: search || undefined,
      sortBy: sortField,
      order: sortOrder === 1 ? 'asc' : 'desc',
      includeTotal: true,
      includeRefs: true,
      type: selectedType && selectedType !== 'Tout' ? selectedType : undefined,
      ...roleFilters,
    };
  }, [first, rows, search, sortField, sortOrder, selectedType, isAdminPointVente, isAdminRegion, user?.region?._id, user?.pointVente?._id, selectedPointVente?._id]);

  /* --------------------------- Chargement data --------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      if (mounted) dispatch(fetchMouvementsStock(serverFilters as any));
    }, 250);
    return () => clearTimeout(t);
  }, [dispatch, serverFilters, mounted]);

  // fallback si pas de rôle
  useEffect(() => {
    if (!user?.role && mounted) dispatch(fetchMouvementsStock(serverFilters as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.role, mounted]);

  /* ----------- Filtrage client additionnel (catégorie) ----------- */
  const filteredMvtStocks = useMemo(() => {
    if (!categorie) return mvtList;
    return mvtList.filter((row) => {
      const catObj = (row?.produit as any)?.categorie;
      return typeof catObj === 'object' && catObj !== null && catObj?._id === categorie._id;
    });
  }, [mvtList, categorie]);

  /* ----------------------- Handlers DataTable ----------------------- */
  const onPageChange = useCallback((e: DataTablePageEvent) => {
    setFirst(e.first ?? 0);
    setRows(e.rows ?? 10);
  }, []);

  const onSort = useCallback((e: DataTableSortEvent) => {
    const field = (e.sortField as string) || 'createdAt';
    const order = (e.sortOrder as 1 | -1 | 0) ?? -1;
    setSortField(field);
    setSortOrder(order === 0 ? -1 : order);
  }, []);

  /* --------------------------- Actions --------------------------- */
  const refreshCurrentPage = useCallback(async () => {
    await dispatch(fetchMouvementsStock(serverFilters as any));
  }, [dispatch, serverFilters]);


  console.log('filteredMvtStocks: ', filteredMvtStocks);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="min-h-screen">
      {!mounted ? (
        <div className="p-6">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-10 w-full bg-gray-100 rounded" />
        </div>
      ) : (
        <>
          <Toast ref={toast} />

          <div className="flex items-center justify-between mt-5 mb-5">
            <BreadCrumb
              model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Rapports' }]}
              home={{ icon: 'pi pi-home', url: '/' }}
              className="bg-none"
            />
            <h2 className="text-2xl font-bold text-gray-700">Gestion des Rapports</h2>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="gap-4 mb-4 flex justify-between flex-wrap md:flex-nowrap">
              <div className="relative w-full md:w-4/5 flex flex-row gap-2 flex-wrap">
                <InputText
                  className="p-2 pl-10 border rounded w-full md:w-1/3"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => {
                    setFirst(0);
                    setSearch(e.target.value ?? '');
                  }}
                />

                <DropdownTypeFilter
                  mvtStocks={mvtList}
                  //@ts-ignore
                  onChange={(_, type) => {
                    setFirst(0);
                    setSelectedType(type);
                  }}
                />

                <DropdownCategorieFilter onSelect={(cat) => setCategorie(cat)} />

                <DropdownPointVenteFilter
                  onSelect={(pv) => {
                    setFirst(0);
                    setSelectedPointVente(pv);
                  }}
                />
              </div>

              <div className="w-full md:w-1/5 flex justify-end items-center gap-2">
                <DropdownImportExport
                  onAction={async ({ type, format, file }) => {
                    if (type === 'import' && file) {
                      toast.current?.show({
                        severity: 'info',
                        summary: `Import ${format.toUpperCase()}`,
                        detail: `Fichier importé: ${file.name}`,
                        life: 3000,
                      });
                      return;
                    }
                    if (type === 'export') {
                      const { exportFile, downloadExportedFile } = await import('@/stores/slices/document/importDocuments/exportDoc');
                      const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
                      try {
                        const r: any = await (dispatch as any)(
                          exportFile({
                            url: '/export/rapport-mouvement-stock',
                            mouvements: filteredMvtStocks,
                            fileType,
                          })
                        );
                        if ((exportFile as any).fulfilled.match(r)) {
                          const filename = `rapport.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
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
                          detail: 'Une erreur est survenue.',
                          life: 3000,
                        });
                      }
                    }
                  }}
                />
              </div>
            </div>

            <DataTable
              value={filteredMvtStocks}
              dataKey="_id"
              lazy
              paginator
              totalRecords={meta?.total ?? 0}
              rows={rows}
              first={first}
              onPage={onPageChange}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
              loading={loading}
              size="small"
              className="rounded-lg text-sm"
              tableStyle={{ minWidth: '70rem' }}
              //@ts-ignore
              rowClassName={(_, opt) => (opt?.rowIndex % 2 === 0 ? '!bg-gray-100 !text-gray-900' : '!bg-green-50 !text-gray-900')}
              emptyMessage="Aucun mouvement de stock trouvé."
            >
              <Column
                header="#"
                body={(_, options) => (Number.isFinite(options?.rowIndex) ? first + (options!.rowIndex as number) + 1 : '-')}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header=""
                body={(row: MouvementStock) => {
                  const cat = (row?.produit as any)?.categorie;
                  const imageUrl = typeof cat === 'object' && cat?.image ? safeApiImage(cat.image) : '';
                  return imageUrl ? (
                    <div className="w-8 h-8">
                      <img
                        src={imageUrl}
                        alt={cat?.nom ?? ''}
                        className="rounded-full w-full h-full object-cover border border-gray-100"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  ) : (
                    <span>—</span>
                  );
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Produit"
                sortable
                sortField="produit.nom"
                body={(row: MouvementStock) => row?.produit?.nom ?? '—'}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Catégorie"
                body={(row: MouvementStock) => {
                  const cat = (row?.produit as any)?.categorie;
                  return typeof cat === 'object' && cat !== null ? cat?.nom ?? '—' : (row?.produit as any)?.categorie ?? '—';
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
                  />
                   <Column
                header="operations"
                body={(row: MouvementStock) => {
                 
                  return row.type ? row.type : '—';
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Stock"
                body={(row: MouvementStock) => row?.region?.nom ?? row?.pointVente?.nom ?? 'Depot Central'}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                field="quantite"
                header="Quantité"
                sortable
                body={(row: MouvementStock) => safeNumber(row?.quantite).toString()}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Prix/U"
                body={(row: MouvementStock) => {
                  const prix =
                    ['Entrée', 'Livraison', 'Commande'].includes(row?.type ?? '')
                      ? row?.produit?.prix
                      : row?.produit?.prixVente;
                  const val = safeNumber(prix, NaN);
                  return Number.isFinite(val)
                    ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : 'N/A';
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Prix de vente Total"
                body={(row: MouvementStock) => {
                  const net = safeNumber((row?.produit as any)?.netTopay, 0);
                  const q = safeNumber(row?.quantite, 0);
                  return (net * q).toFixed(2);
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Valeur TVA Total"
                body={(row: MouvementStock) => {
                  const net = safeNumber((row?.produit as any)?.netTopay, 0);
                  const tva = safeNumber((row?.produit as any)?.tva, 0);
                  const q = safeNumber(row?.quantite, 0);
                  return (((net * tva) / 100) * q).toFixed(2);
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="TTC"
                body={(row: MouvementStock) => {
                  const prixBase =
                    ['Entrée', 'Livraison', 'Commande'].includes(row?.type ?? '')
                      ? row?.produit?.prix
                      : row?.produit?.prixVente;
                  const prixVente = safeNumber(row?.produit?.prixVente, 0);
                  const q = safeNumber(row?.quantite, 0);
                  const total = prixVente * q;
                  let cls = 'text-blue-600';
                  const base = safeNumber(prixBase, 0);
                  if (prixVente > base) cls = 'text-green-600 font-bold';
                  else if (prixVente < base) cls = 'text-red-600 font-bold';
                  return <span className={cls}>{total.toFixed(2)}</span>;
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Statut"
                body={(row: MouvementStock) => {
                  const ok = !!row?.statut;
                  return <Badge value={ok ? 'Validé' : 'En attente'} severity={ok ? 'success' : 'warning'} className="text-xs px-2 py-1" />;
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Utilisateur"
                body={(row: MouvementStock) =>
                  typeof row?.user === 'object' ? (row.user as any)?.nom ?? '—' : (row as any)?.user ?? '—'
                }
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Créé le"
                sortable
                sortField="createdAt"
                body={(row: MouvementStock) => {
                  try {
                    return new Date(row?.createdAt || '').toLocaleDateString();
                  } catch {
                    return '—';
                  }
                }}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />

              <Column
                header="Actions"
                body={(row: MouvementStock) => (
                  <Button
                    icon="pi pi-bars"
                    className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                    onClick={(e) => openActionsMenu(e, row)}
                    disabled={!isNonEmptyString((row as any)?._id)}
                    aria-haspopup
                  />
                )}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
            </DataTable>

            {/* Menu global (appendTo body pour éviter les overlays qui bloquent les clics) */}
            <Menu
              model={actionsModel}
              popup
              ref={actionsMenuRef}
              appendTo={mounted ? document.body : undefined}
              baseZIndex={1000}
            />
          </div>

          <ValidationDialog
            visible={isValidateMvt}
            onHide={() => setIsValidateMvt(false)}
            onConfirm={async (item) => {
              try {
                if (!item?._id) return;
                const r = await dispatch(validateMouvementStock(item._id as any));
                // @ts-ignore
                if (validateMouvementStock.fulfilled?.match?.(r) || r?.meta?.requestStatus === 'fulfilled') {
                  toast.current?.show({ severity: 'success', summary: 'Validé', detail: "L'opération a été validée.", life: 2500 });
                  await refreshCurrentPage();
                  setIsValidateMvt(false);
                } else {
                  throw new Error();
                }
              } catch {
                toast.current?.show({ severity: 'error', summary: 'Erreur', detail: 'Échec de la validation.', life: 3000 });
              }
            }}
            item={selectedMvt}
            objectLabel="l'opération"
            displayField="nom"
          />
        </>
      )}
    </div>
  );
};

export default Page;
