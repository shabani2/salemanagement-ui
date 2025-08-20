/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';

import { API_URL } from '@/lib/apiConfig';
import { AppDispatch, RootState } from '@/stores/store';

import {
  fetchStocks,
  selectAllStocks,
  selectStockMeta,
  selectStockStatus,
} from '@/stores/slices/stock/stockSlice';

import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

import { useDispatch, useSelector } from 'react-redux';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';

import type { Stock } from '@/Models/stock';
import type { PointVente } from '@/Models/pointVenteType';
import type { Categorie } from '@/Models/produitsType';

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

/* -------------------------------- Component -------------------------------- */
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<any>(null);

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

  const stocks = useSelector((s: RootState) => asArray<Stock>(selectAllStocks(s)));
  const meta = useSelector(selectStockMeta);
  const status = useSelector(selectStockStatus);
  const loading = status === 'loading';

  /* ------------------------------ pagination/tri (custom) ------------------- */
  const [page, setPage] = useState(1); // ✅ 1-based
  const [rows, setRows] = useState(10);
  const [sortBy, setSortBy] = useState<string>('updatedAt'); // défaut updatedAt
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  /* --------------------------------- Filtres UI ----------------------------- */
  const [search, setSearch] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  /* --------------------------- Construction des filtres serveur ------------- */
  const serverFilters = useMemo(() => {
    const roleFilters: Record<string, any> = {};
    if (user?.role === 'AdminPointVente' && isNonEmptyString(user?.pointVente?._id)) {
      roleFilters.pointVente = user.pointVente._id;
    } else if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
      roleFilters.region = user.region._id;
    }
    if (selectedPointVente?._id) {
      roleFilters.pointVente = selectedPointVente._id;
      delete roleFilters.region;
    }

    return {
      page, // ✅ page 1-based (plus de first/offset côté UI)
      limit: rows,
      q: search || undefined,
      sortBy, // ex: 'updatedAt' ou 'produit.nom' (supporté par ton contrôleur)
      order,
      includeTotal: true,
      includeRefs: true,
      ...roleFilters,
    };
  }, [
    page,
    rows,
    search,
    sortBy,
    order,
    selectedPointVente?._id,
    user?.role,
    user?.pointVente?._id,
    user?.region?._id,
  ]);

  /* ------------------------------ Chargement data --------------------------- */
  useEffect(() => {
  
    dispatch(fetchStocks(serverFilters));
  }, [dispatch, serverFilters]);

  // fallback si pas de rôle connu au 1er rendu
  useEffect(() => {
    if (!user?.role) {
      
      dispatch(fetchStocks(serverFilters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.role]);

  /* --------------------------------- Filtrage client (catégorie) ----------- */
  const visibleStocks = useMemo(() => {
    if (!selectedCategorie) return stocks;
    return stocks.filter((s) => {
      const catObj = (s?.produit as any)?.categorie;
      return typeof catObj === 'object' && catObj !== null && catObj?._id === selectedCategorie._id;
    });
  }, [stocks, selectedCategorie]);

  /* ----------------------------- Tri + Pagination UI ------------------------ */
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

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between pb-6 pt-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion du stock' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion du stock</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex mb-4 gap-4 justify-between items-center flex-wrap md:flex-nowrap">
          {/* Gauche */}
          <div className="flex flex-row items-center gap-2 flex-wrap md:flex-nowrap w-full md:w-auto">
            <InputText
              className="p-2 pl-10 border rounded w-full md:w-72"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value ?? '');
              }}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            />

            <DropdownPointVenteFilter
              onSelect={(pv) => {
                setPage(1);
                setSelectedPointVente(pv);
              }}
            />

            <DropdownCategorieFilter
              onSelect={(cat) => {
                setPage(1);
                setSelectedCategorie(cat);
              }}
            />
          </div>

          {/* Droite */}
          <div className="flex justify-end items-center gap-2 w-full md:w-auto">
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
                  const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
                  try {
                    const r = await dispatch(
                      exportFile({
                        url: '/export/stock',
                        mouvements: visibleStocks, // exporte ce qui est affiché
                        fileType,
                      }) as any
                    );
                    if ((exportFile as any).fulfilled.match(r)) {
                      const filename = `stock.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
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
              }}
            />
          </div>
        </div>

        {/* -------- TABLE TAILWIND (look DataTable) -------- */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[70rem] w-full text-sm">
            <thead>
              <tr className="bg-green-800 text-white">
                <th className="px-4 py-2 text-left">N°</th>

                <th className="px-4 py-2 text-left"> </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('produit.nom')}
                  title="Trier par produit"
                >
                  Produit <SortIcon order={sortedOrderFor('produit.nom')} />
                </th>

                <th className="px-4 py-2 text-left">Stock</th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('quantite')}
                  title="Trier par quantité"
                >
                  Quantité <SortIcon order={sortedOrderFor('quantite')} />
                </th>

                <th className="px-4 py-2 text-left">Seuil</th>
                <th className="px-4 py-2 text-left">Prix/U</th>
                <th className="px-4 py-2 text-left">Coût Total</th>
                <th className="px-4 py-2 text-left">Prix de vente Total</th>
                <th className="px-4 py-2 text-left">Valeur TVA Total</th>
                <th className="px-4 py-2 text-left">TTC</th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('updatedAt')}
                  title="Trier par date de mise à jour"
                >
                  Mis à jour le <SortIcon order={sortedOrderFor('updatedAt')} />
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && stocks.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={12}>
                    Chargement...
                  </td>
                </tr>
              ) : visibleStocks.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={12}>
                    Aucun article en stock
                  </td>
                </tr>
              ) : (
                visibleStocks.map((row, idx) => {
                  const cat = (row?.produit as any)?.categorie;
                  const imageUrl =
                    typeof cat === 'object' && cat !== null && isNonEmptyString(cat?.image)
                      ? safeApiImage(cat.image)
                      : '';
                  const q = Number(row?.quantite) || 0;
                  const seuil = Number((row?.produit as any)?.seuil);
                  const seuilKnown = Number.isFinite(seuil);
                  const ok = seuilKnown ? q > seuil : null;

                  const prixAchat = Number((row?.produit as any)?.prix) || 0;
                  const prixVente = Number((row?.produit as any)?.prixVente) || 0;
                  const totalVente = prixVente * q;
                  let ttcCls = 'text-blue-600';
                  if (prixVente > prixAchat) ttcCls = 'text-green-600 font-bold';
                  else if (prixVente < prixAchat) ttcCls = 'text-red-600 font-bold';

                  const net = Number((row?.produit as any)?.netTopay) || 0;
                  const tva = Number((row?.produit as any)?.tva) || 0;

                  return (
                    <tr
                      key={row._id}
                      className={(idx % 2 === 0 ? 'bg-gray-100' : 'bg-green-50') + ' text-gray-900'}
                    >
                      <td className="px-4 py-2">{firstIndex + idx + 1}</td>

                      <td className="px-4 py-2">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={cat?.nom ?? ''}
                            className="w-8 h-8 rounded-full object-cover border border-gray-100"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      <td className="px-4 py-2">{row?.produit?.nom ?? '—'}</td>

                      <td className="px-4 py-2">
                        {row?.region?.nom ?? row?.pointVente?.nom ?? 'Depot Central'}
                      </td>

                      <td className="px-4 py-2">{q.toString()}</td>

                      <td className="px-4 py-2">
                        {seuilKnown ? (
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-1"
                            style={{
                              backgroundColor: ok ? '#4caf50' : '#f44336',
                              borderRadius: '9999px',
                              color: '#fff',
                            }}
                            title={ok ? 'Stock suffisant' : 'Stock insuffisant'}
                          >
                            <i className={ok ? 'pi pi-check' : 'pi pi-exclamation-triangle'} />
                            <span>{seuil}</span>
                            <span className="ml-1">{ok ? 'Suffisant' : 'Insuffisant'}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-2">
                        {Number.isFinite(prixAchat)
                          ? prixAchat.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : 'N/A'}
                      </td>

                      <td className="px-4 py-2">{(Number(row?.montant) || 0).toLocaleString()}</td>

                      <td className="px-4 py-2">{(net * q).toFixed(2)}</td>

                      <td className="px-4 py-2">{(((net * tva) / 100) * q).toFixed(2)}</td>

                      <td className="px-4 py-2">
                        <span className={ttcCls}>{totalVente.toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-2">
                        {(() => {
                          try {
                            return new Date(
                              row?.updatedAt || row?.createdAt || ''
                            ).toLocaleDateString();
                          } catch {
                            return '—';
                          }
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* -------- PAGINATION TAILWIND -------- */}
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

            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(1)}
              disabled={page <= 1}
            >
              «
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
            >
              ‹
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
            >
              ›
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(totalPages)}
              disabled={page >= totalPages}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
