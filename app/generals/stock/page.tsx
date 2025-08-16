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

import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';

import { useDispatch, useSelector } from 'react-redux';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';

/* --------------------------------- Types ----------------------------------- */
import type { Stock } from '@/Models/stock';
import type { PointVente } from '@/Models/pointVenteType';
import type { Categorie } from '@/Models/produitsType';

/* ----------------------------- Helpers robustes ---------------------------- */
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
const safeApiImage = (rel?: string) =>
  isNonEmptyString(rel) ? `${API_URL()}/${rel.replace('../', '').replace(/^\/+/, '')}` : '';

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

  /* ------------------------------ server pagination/sort -------------------- */
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0); // offset 0,10,20...
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<1 | -1>(-1); // -1 = desc

  /* --------------------------------- Filtres UI ----------------------------- */
  const [search, setSearch] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  /* --------------------------- Construction des filtres serveur ------------- */
  const serverFilters = useMemo(() => {
    // IMPORTANT: 0-based page index pour éviter le saut de page
    const pageIndex = Math.floor(first / rows);

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
      // Si ton API attend une page 1-based, remplace la ligne dessous par:
      // page: pageIndex + 1,
      page: pageIndex, // 0-based
      limit: rows,
      q: search || undefined,
      sortBy: sortField,
      order: sortOrder === 1 ? 'asc' : 'desc',
      includeTotal: true,
      includeRefs: true,
      ...roleFilters,
    };
  }, [first, rows, search, sortField, sortOrder, selectedPointVente?._id, user?.role, user?.pointVente?._id, user?.region?._id]);

  /* ------------------------------ Chargement data --------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      // @ts-ignore — le thunk doit accepter un objet de filtres (adapter côté slice si besoin)
      dispatch(fetchStocks(serverFilters));
    }, 200);
    return () => clearTimeout(t);
  }, [dispatch, serverFilters]);

  useEffect(() => {
    if (!user?.role) {
      // @ts-ignore
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

  /* ----------------------------- Pagination / Sort handlers ----------------- */
  const onPageChange = useCallback((e: DataTablePageEvent) => {
    // DataTable fournit e.first et e.rows → on les répercute tels quels
    setFirst(e.first ?? 0);
    setRows(e.rows ?? 10);
  }, []);

  const onSort = useCallback((e: DataTableSortEvent) => {
    const field = (e.sortField as string) || 'createdAt';
    const order = (e.sortOrder as 1 | -1 | 0) ?? -1;
    setSortField(field);
    setSortOrder(order === 0 ? -1 : order);
    // Repartir en début pour éviter des trous visuels
    setFirst(0);
  }, []);

  /* ----------------------------- Import / Export ---------------------------- */
  const handleFileManagement = useCallback(
    async ({
      type,
      format,
      file,
    }: {
      type: 'import' | 'export';
      format: 'csv' | 'excel';
      file?: File;
    }) => {
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
              mouvements: visibleStocks, // on exporte ce qu'on voit
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
    },
    [dispatch, visibleStocks]
  );

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
                setFirst(0);
                setSearch(e.target.value ?? '');
              }}
            />

            <DropdownPointVenteFilter
              onSelect={(pv) => {
                setFirst(0);
                setSelectedPointVente(pv);
              }}
            />

            <DropdownCategorieFilter onSelect={(cat) => setSelectedCategorie(cat)} />
          </div>

          {/* Droite */}
          <div className="flex justify-end items-center gap-2 w-full md:w-auto">
            <DropdownImportExport onAction={handleFileManagement} />
          </div>
        </div>

        <DataTable
          value={visibleStocks}
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
          emptyMessage="Aucun article en stock"
        >
          <Column
            header="#"
            body={(_, options) =>
              Number.isFinite(options?.rowIndex) ? first + (options!.rowIndex as number) + 1 : '-'
            }
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header=""
            body={(row: Stock) => {
              const cat = (row?.produit as any)?.categorie;
              const imageUrl =
                typeof cat === 'object' && cat !== null && isNonEmptyString(cat?.image)
                  ? safeApiImage(cat.image)
                  : '';
              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={cat?.nom ?? ''}
                  className="w-8 h-8 rounded-full object-cover border border-gray-100"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
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
            body={(row: Stock) => row?.produit?.nom ?? '—'}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Stock"
            body={(row: Stock) => row?.region?.nom ?? row?.pointVente?.nom ?? 'Depot Central'}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            field="quantite"
            header="Quantité"
            sortable
            body={(row: Stock) => {
              const q = Number(row?.quantite) || 0;
              return q.toString();
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Seuil"
            body={(row: Stock) => {
              const seuilRaw = (row?.produit)?.seuil;
              const seuil = Number(seuilRaw);
              const q = Number(row?.quantite) || 0;
              console.log('seuil : ', row?.produit);
              if (!Number.isFinite(seuil)) {
                return (
                  <span className="text-xs text-gray-500">—</span>
                );
              }

              const ok = q > seuil;
              return (
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
              );
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Prix/U"
            body={(row: Stock) => {
              const v = Number((row?.produit as any)?.prix);
              return Number.isFinite(v)
                ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : 'N/A';
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Coût Total"
            body={(row: Stock) => (Number(row?.montant) || 0).toLocaleString()}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Prix de vente Total"
            body={(row: Stock) => {
              const net = Number((row?.produit as any)?.netTopay) || 0;
              const q = Number(row?.quantite) || 0;
              return (net * q).toFixed(2);
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Valeur TVA Total"
            body={(row: Stock) => {
              const net = Number((row?.produit as any)?.netTopay) || 0;
              const tva = Number((row?.produit as any)?.tva) || 0;
              const q = Number(row?.quantite) || 0;
              return (((net * tva) / 100) * q).toFixed(2);
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="TTC"
            body={(row: Stock) => {
              const prixAchat = Number((row?.produit as any)?.prix) || 0;
              const prixVente = Number((row?.produit as any)?.prixVente) || 0;
              const q = Number(row?.quantite) || 0;
              const totalVente = prixVente * q;
              let cls = 'text-blue-600';
              if (prixVente > prixAchat) cls = 'text-green-600 font-bold';
              else if (prixVente < prixAchat) cls = 'text-red-600 font-bold';
              return <span className={cls}>{totalVente.toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />

          <Column
            header="Créé le"
            sortable
            sortField="createdAt"
            body={(row: Stock) => {
              try {
                return new Date(row?.createdAt || '').toLocaleDateString();
              } catch {
                return '—';
              }
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
        </DataTable>
      </div>
    </div>
  );
};

export default Page;
