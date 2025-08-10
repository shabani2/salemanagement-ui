/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';

import { API_URL } from '@/lib/apiConfig';
import { AppDispatch, RootState } from '@/stores/store';

import {
  fetchStockByPointVenteId,
  fetchStockByRegionId,
  fetchStocks,
  selectAllStocks,
} from '@/stores/slices/stock/stockSlice';

import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';

import { useDispatch, useSelector } from 'react-redux';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
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
  isNonEmptyString(rel) ? `${API_URL}/${rel.replace('../', '').replace(/^\/+/, '')}` : '';

/* -------------------------------- Component -------------------------------- */
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  /* ------------------------------ User (safe) ------------------------------- */
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

  /* ------------------------------- Store data ------------------------------- */
  const stocks = useSelector((s: RootState) => asArray<Stock>(selectAllStocks(s)));

  /* --------------------------------- UI state ------------------------------- */
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  /* ------------------------------ Chargement data --------------------------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        if (user?.role === 'AdminPointVente' && isNonEmptyString(user?.pointVente?._id)) {
          await dispatch(fetchStockByPointVenteId(user.pointVente._id));
        } else if (user?.role === 'AdminRegion' && isNonEmptyString(user?.region?._id)) {
          await dispatch(fetchStockByRegionId(user.region._id));
        } else {
          await dispatch(fetchStocks());
        }
      } catch {
        if (!active) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger le stock.',
          life: 3000,
        });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch, user?.role, user?.pointVente?._id, user?.region?._id]);

  /* --------------------------------- Filtrage ------------------------------- */
  const filteredStocks = useMemo(() => {
    const q = normalize(search);
    return stocks.filter((s) => {
      const catObj = (s?.produit as any)?.categorie;
      const catNom =
        typeof catObj === 'object' && catObj !== null ? normalize(catObj?.nom) : normalize((s?.produit as any)?.categorie);
      const prod = normalize(s?.produit?.nom);
      const pv = normalize(s?.pointVente?.nom || 'depot central');
      const quantiteStr = String(safeNumber(s?.quantite)).toLowerCase();
      const montantStr = String(safeNumber(s?.montant)).toLowerCase();
      const dateStr = (() => {
        try {
          return new Date(s?.createdAt || '').toLocaleDateString().toLowerCase();
        } catch {
          return '';
        }
      })();

      const matchSearch =
        !q || [catNom, prod, pv, quantiteStr, montantStr, dateStr].some((field) => field.includes(q));

      const matchCategorie =
        !selectedCategorie ||
        (typeof catObj === 'object' && catObj !== null && isNonEmptyString(selectedCategorie?._id) && catObj?._id === selectedCategorie._id);

      const matchPV = !selectedPointVente || s?.pointVente?._id === selectedPointVente._id;

      return matchSearch && matchCategorie && matchPV;
    });
  }, [stocks, search, selectedCategorie, selectedPointVente]);

  /* ----------------------------- Pagination handler ------------------------ */
  const onPageChange = useCallback((e: any) => {
    setFirst(e.first ?? 0);
    setRows(e.rows ?? 10);
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
        // TODO: implémenter le parsing + validations
        return;
      }

      if (type === 'export') {
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/stock',
              mouvements: filteredStocks,
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
    [dispatch, filteredStocks]
  );

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between pb-6 pt-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des stock' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des stock</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex mb-4 gap-4">
          <div className="w-2/3 flex flex-row items-center gap-2">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value ?? '')}
            />

            <DropdownPointVenteFilter onSelect={(pv) => setSelectedPointVente(pv)} />

            <DropdownCategorieFilter
              onSelect={(cat) => setSelectedCategorie(cat)}
            />

            <DropdownImportExport onAction={handleFileManagement} />
          </div>
        </div>

        <DataTable
          value={filteredStocks}
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          onPage={onPageChange}
          className="rounded-lg custom-datatable text-[11px]"
          size="small"
          emptyMessage="Aucun article en stock"
          rowClassName={(_, options) => {
            //@ts-ignore
            const idx = options?.rowIndex ?? 0;
            const global = first + idx;
            return global % 2 === 0 ? '!bg-gray-300 !text-gray-900' : '!bg-green-900 !text-white';
          }}
        >
          <Column
            header="#"
            body={(_, options) => (Number.isFinite(options?.rowIndex) ? (options!.rowIndex as number) + 1 : '-')}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
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
                <span className="text-[11px]">—</span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Produit"
            body={(row: Stock) => row?.produit?.nom ?? '—'}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Stock"
            body={(row: Stock) => (
              <span className="text-[11px]">
                {row?.region?.nom ?? row?.pointVente?.nom ?? 'Depot Central'}
              </span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="quantite"
            header="Quantité"
            body={(row: Stock) => <span className="text-[11px]">{safeNumber(row?.quantite).toString()}</span>}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Quantité seuil"
            body={(row: Stock) => {
              const seuil = safeNumber((row?.produit as any)?.seuil, NaN);
              const q = safeNumber(row?.quantite, 0);
              const ok = Number.isFinite(seuil) ? seuil < q : false;
              return (
                <span
                  className="flex items-center gap-1 text-sm px-2 py-1 text-[11px]"
                  style={{
                    backgroundColor: ok ? '#4caf50' : '#f44336',
                    borderRadius: '9999px',
                    color: '#fff',
                  }}
                  title={ok ? 'Stock suffisant' : 'Stock insuffisant'}
                >
                  <i className={ok ? 'pi pi-check' : 'pi pi-exclamation-triangle'} style={{ fontSize: '0.75rem' }} />
                  <span style={{ fontSize: '0.75rem' }}>{Number.isFinite(seuil) ? seuil : 'N/A'}</span>
                  <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                    {ok ? 'Suffisant' : 'Insuffisant'}
                  </span>
                </span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix/U"
            body={(row: Stock) => (
              <span className="text-blue-700 font-semibold text-[11px]">
                {Number.isFinite(safeNumber(row?.produit?.prix, NaN))
                  ? safeNumber(row?.produit?.prix).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : 'N/A'}
              </span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Coût Total"
            body={(row: Stock) => safeNumber(row?.montant).toLocaleString()}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix de vente Total"
            body={(row: Stock) => {
              const net = safeNumber((row?.produit as any)?.netTopay, 0);
              const q = safeNumber(row?.quantite, 0);
              return <span className="text-purple-700 font-semibold text-[11px]">{(net * q).toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Valeur TVA Total"
            body={(row: Stock) => {
              const net = safeNumber((row?.produit as any)?.netTopay, 0);
              const tva = safeNumber((row?.produit as any)?.tva, 0);
              const q = safeNumber(row?.quantite, 0);
              const tvaVal = ((net * tva) / 100) * q;
              return <span className="text-yellow-600 font-medium text-[11px]">{tvaVal.toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="TTC"
            body={(row: Stock) => {
              const prixAchat = safeNumber(row?.produit?.prix, 0);
              const prixVente = safeNumber(row?.produit?.prixVente, 0);
              const q = safeNumber(row?.quantite, 0);
              const totalVente = prixVente * q;
              let cls = 'text-blue-600';
              if (prixVente > prixAchat) cls = 'text-green-600 font-bold';
              else if (prixVente < prixAchat) cls = 'text-red-600 font-bold';
              return <span className={`${cls} text-[11px]`}>{totalVente.toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Créé le"
            body={(row: Stock) => {
              try {
                return new Date(row?.createdAt || '').toLocaleDateString();
              } catch {
                return '—';
              }
            }}
            sortable
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
        </DataTable>
      </div>
    </div>
  );
};

export default Page;
