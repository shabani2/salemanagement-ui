/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { InputText } from 'primereact/inputtext';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';

import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/stores/store';

import {
  fetchMouvementsStock,
  validateMouvementStock,
  selectAllMouvementsStock,
  selectMouvementStockMeta,
  selectMouvementStockStatus,
} from '@/stores/slices/mvtStock/mvtStock';

import { ValidationDialog } from '@/components/ui/ValidationDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';

import type { MouvementStock } from '@/Models/mouvementStockType';

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

const SortIcon: React.FC<{ order: 'asc' | 'desc' | null }> = ({ order }) => (
  <span className="inline-block align-middle ml-1">
    {order === 'asc' ? '▲' : order === 'desc' ? '▼' : '↕'}
  </span>
);

/* -------------------------------- Page -------------------------------- */
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const toast = useRef<Toast | null>(null);

  const { user, isAdminPointVente, isAdminRegion } = useUserRole();

  const mvtList = useSelector((s: RootState) =>
    asArray<MouvementStock>(selectAllMouvementsStock(s))
  );
  const meta = useSelector(selectMouvementStockMeta);
  const status = useSelector(selectMouvementStockStatus);
  const loading = status === 'loading';

  const [selectedMvt, setSelectedMvt] = useState<MouvementStock | null>(null);
  const [isValidateMvt, setIsValidateMvt] = useState(false);

  // pagination & tri (custom 1-based)
  const [page, setPage] = useState(1); // 1-based
  const [rows, setRows] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // recherche (texte uniquement)
  const [search, setSearch] = useState('');

  // Menu actions (un seul menu global)
  const actionsMenuRef = useRef<Menu | null>(null);
  const currentRowRef = useRef<MouvementStock | null>(null);

  const openActionsMenu = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, row: MouvementStock) => {
      currentRowRef.current = row;
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
    ],
    []
  );

  /* ------------------- Paramètres serveur (query) ------------------ */
  const serverParams = useMemo(() => {
    const roleFilters: Record<string, any> = {};
    if (isAdminPointVente && isNonEmptyString((user as any)?.pointVente?._id)) {
      roleFilters.pointVente = (user as any).pointVente._id;
    } else if (isAdminRegion && isNonEmptyString((user as any)?.region?._id)) {
      roleFilters.region = (user as any).region._id;
    }
    return {
      page, // ✅ 1-based (évite les “sauts” d’offset)
      limit: rows,
      q: search || undefined,
      sortBy,
      order,
      includeTotal: true,
      includeRefs: true,
      ...roleFilters,
    };
  },
  //@ts-ignore
   [
    page,
    rows,
    search,
    sortBy,
    order,
    isAdminPointVente,
    isAdminRegion,
    user?.region?._id,
    user?.pointVente?._id,
  ]);

  /* --------------------------- Chargement data --------------------------- */
  useEffect(() => {
    dispatch(fetchMouvementsStock(serverParams));
  }, [dispatch, serverParams]);

  /* ----------------------- Tri / Pagination custom ---------------------- */
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

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="min-h-screen">
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
              onChange={(e) => setSearch(e.target.value ?? '')}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
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
                  const { exportFile, downloadExportedFile } = await import(
                    '@/stores/slices/document/importDocuments/exportDoc'
                  );
                  const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
                  try {
                    const r: any = await (dispatch as any)(
                      exportFile({
                        url: '/export/rapport-mouvement-stock',
                        mouvements: mvtList, // exporte ce qui est dans la liste actuelle
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

        {/* ---------- TABLE TAILWIND ----------- */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[70rem] w-full text-sm">
            <thead>
              <tr className="bg-green-800 text-white">
                <th className="px-4 py-2 text-left">N°</th>

                <th className="px-4 py-2 text-left"> </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('produit.nom')} // tri côté back si supporté
                  title="Trier par produit"
                >
                  Produit <SortIcon order={sortedOrderFor('produit.nom')} />
                </th>

                <th className="px-4 py-2 text-left">Catégorie</th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('type')}
                  title="Trier par type"
                >
                  Type <SortIcon order={sortedOrderFor('type')} />
                </th>

                <th className="px-4 py-2 text-left">Stock</th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('quantite')}
                  title="Trier par quantité"
                >
                  Quantité <SortIcon order={sortedOrderFor('quantite')} />
                </th>

                <th className="px-4 py-2 text-left">Prix/U</th>
                <th className="px-4 py-2 text-left">Prix de vente Total</th>
                <th className="px-4 py-2 text-left">Valeur TVA Total</th>
                <th className="px-4 py-2 text-left">TTC</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Utilisateur</th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('createdAt')}
                  title="Trier par date de création"
                >
                  Créé le <SortIcon order={sortedOrderFor('createdAt')} />
                </th>

                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && mvtList.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={14}>
                    Chargement...
                  </td>
                </tr>
              ) : mvtList.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={14}>
                    Aucun mouvement de stock trouvé.
                  </td>
                </tr>
              ) : (
                mvtList.map((row, idx) => {
                  const cat = (row?.produit as any)?.categorie;
                  const imageUrl =
                    typeof cat === 'object' && cat?.image ? safeApiImage(cat.image) : '';
                  const q = safeNumber(row?.quantite, 0);

                  const prixBase = ['Entrée', 'Livraison', 'Commande'].includes(row?.type ?? '')
                    ? row?.produit?.prix
                    : row?.produit?.prixVente;

                  const prixVente = safeNumber(row?.produit?.prixVente, 0);
                  const total = prixVente * q;
                  let ttcCls = 'text-blue-600';
                  const base = safeNumber(prixBase, 0);
                  if (prixVente > base) ttcCls = 'text-green-600 font-bold';
                  else if (prixVente < base) ttcCls = 'text-red-600 font-bold';

                  return (
                    <tr
                      key={row._id}
                      className={(idx % 2 === 0 ? 'bg-gray-100' : 'bg-green-50') + ' text-gray-900'}
                    >
                      <td className="px-4 py-2">{firstIndex + idx + 1}</td>

                      <td className="px-4 py-2">
                        {imageUrl ? (
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
                        )}
                      </td>

                      <td className="px-4 py-2">{row?.produit?.nom ?? '—'}</td>

                      <td className="px-4 py-2">
                        {typeof cat === 'object' && cat !== null
                          ? (cat?.nom ?? '—')
                          : ((row?.produit as any)?.categorie ?? '—')}
                      </td>

                      <td className="px-4 py-2">{row?.type || '—'}</td>

                      <td className="px-4 py-2">
                        {row?.region?.nom ?? row?.pointVente?.nom ?? 'Depot Central'}
                      </td>

                      <td className="px-4 py-2">{q.toString()}</td>

                      <td className="px-4 py-2">
                        {(() => {
                          const prix = ['Entrée', 'Livraison', 'Commande'].includes(row?.type ?? '')
                            ? row?.produit?.prix
                            : row?.produit?.prixVente;
                          const val = safeNumber(prix, NaN);
                          return Number.isFinite(val)
                            ? val.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : 'N/A';
                        })()}
                      </td>

                      <td className="px-4 py-2">
                        {(() => {
                          const net = safeNumber((row?.produit as any)?.netTopay, 0);
                          return (net * q).toFixed(2);
                        })()}
                      </td>

                      <td className="px-4 py-2">
                        {(() => {
                          const net = safeNumber((row?.produit as any)?.netTopay, 0);
                          const tva = safeNumber((row?.produit as any)?.tva, 0);
                          return (((net * tva) / 100) * q).toFixed(2);
                        })()}
                      </td>

                      <td className="px-4 py-2">
                        <span className={ttcCls}>{total.toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-2">
                        <Badge
                          value={row?.statut ? 'Validé' : 'En attente'}
                          severity={row?.statut ? 'success' : 'warning'}
                          className="text-xs px-2 py-1"
                        />
                      </td>

                      <td className="px-4 py-2">
                        {typeof row?.user === 'object'
                          ? ((row.user as any)?.nom ?? '—')
                          : ((row as any)?.user ?? '—')}
                      </td>

                      <td className="px-4 py-2">
                        {(() => {
                          try {
                            return new Date(row?.createdAt || '').toLocaleDateString();
                          } catch {
                            return '—';
                          }
                        })()}
                      </td>

                      <td className="px-4 py-2">
                        <Button
                          icon="pi pi-bars"
                          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                          onClick={(e) => openActionsMenu(e, row)}
                          disabled={!isNonEmptyString((row as any)?._id)}
                          aria-haspopup
                        />
                      </td>
                    </tr>
                  );
                })
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
              {[10, 20, 30, 50, 100].map((n) => (
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

        {/* Menu Actions (global) */}
        <Menu
          model={actionsModel}
          popup
          ref={actionsMenuRef}
          appendTo={typeof document !== 'undefined' ? document.body : undefined}
          baseZIndex={1000}
        />
      </div>

      {/* Validation dialog */}
      <ValidationDialog
        visible={isValidateMvt}
        onHide={() => setIsValidateMvt(false)}
        onConfirm={async (item) => {
          try {
            if (!item?._id) return;
            const r = await dispatch(validateMouvementStock(item._id as any));
       
            if (
              validateMouvementStock.fulfilled?.match?.(r) ||
              r?.meta?.requestStatus === 'fulfilled'
            ) {
              toast.current?.show({
                severity: 'success',
                summary: 'Validé',
                detail: "L'opération a été validée.",
                life: 2500,
              });
              // refresh page courante
              dispatch(fetchMouvementsStock(serverParams));
              setIsValidateMvt(false);
            } else {
              throw new Error();
            }
          } catch {
            toast.current?.show({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Échec de la validation.',
              life: 3000,
            });
          }
        }}
        item={selectedMvt}
        objectLabel="l'opération"
        displayField="nom"
      />
    </div>
  );
};

export default Page;
