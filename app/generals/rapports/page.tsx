/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Menu } from 'primereact/menu';
import { InputText } from 'primereact/inputtext';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import {
  fetchMouvementsStock,
  fetchMouvementStockByPointVenteId,
  fetchMouvementStockByRegionId,
  selectAllMouvementsStock,
  validateMouvementStock,
} from '@/stores/slices/mvtStock/mvtStock';

import { getOptionsByRole } from '@/lib/utils';
import { ValidationDialog } from '@/components/ui/ValidationDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownTypeFilter from '@/components/ui/dropdowns/dropDownFile-filter';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';

import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';

import type { MouvementStock } from '@/Models/mouvementStockType';
import type { Categorie } from '@/Models/produitsType';
import type { PointVente } from '@/Models/pointVenteType';

import { useUserRole } from '@/hooks/useUserRole';
import { API_URL } from '@/lib/apiConfig';

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

type MenuMap = Record<string, Menu | null>;

/* -------------------------------- Component -------------------------------- */
const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

  const allMvtStocks = useSelector((s: RootState) => asArray<MouvementStock>(selectAllMouvementsStock(s)));

  /* ------------------------------ États locaux ------------------------------ */
  const [importedFiles, setImportedFiles] = useState<{ name: string; format: string }[]>([]);
  const [selectedMvt, setSelectedMvt] = useState<MouvementStock | null>(null);
  const [isValidateMvt, setIsValidateMvt] = useState(false);

  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  // Menus par ligne
  const menuRefs = useRef<MenuMap>({});
  const setMenuRef = useCallback((id: string, el: Menu | null) => {
    if (!id) return;
    menuRefs.current[id] = el;
  }, []);
  const showMenu = useCallback((event: React.MouseEvent, id: string, row: MouvementStock) => {
    setSelectedMvt(row ?? null);
    menuRefs.current[id]?.toggle(event);
  }, []);

  /* ------------------------------ Chargement data --------------------------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user?.role) return;
        setLoading(true);
        if (isAdminPointVente && isNonEmptyString((user as any)?.pointVente?._id)) {
          await dispatch(fetchMouvementStockByPointVenteId((user as any).pointVente._id));
        } else if (isAdminRegion && isNonEmptyString((user as any)?.region?._id)) {
          await dispatch(fetchMouvementStockByRegionId((user as any).region._id));
        } else if (isSuperAdmin) {
          await dispatch(fetchMouvementsStock());
        } else {
          // fallback raisonnable
          await dispatch(fetchMouvementsStock());
        }
      } catch {
        if (!active) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les rapports.',
          life: 3000,
        });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch, user?.role, (user as any)?.pointVente?._id, (user as any)?.region?._id, isSuperAdmin, isAdminRegion, isAdminPointVente]);

  /* ---------------------------- Types autorisés (rôle) ---------------------- */
  const allowedTypes = useMemo(() => {
    const opts = asArray<{ label: string; value: string }>(getOptionsByRole(user?.role));
    const base = opts.map((o) => o.value);
    return user?.role === 'AdminPointVente' ? [...base, 'Livraison'] : base;
  }, [user?.role]);

  const mvtStocks = useMemo(
    () => asArray<MouvementStock>(allMvtStocks).filter((m) => allowedTypes.includes(m?.type ?? '')),
    [allMvtStocks, allowedTypes]
  );

  // valeur par défaut du filtre type
  const mvtDefault = useMemo(() => allowedTypes?.[0] ?? null, [allowedTypes]);
  useEffect(() => {
    if (mvtDefault) setSelectedType(mvtDefault);
  }, [mvtDefault]);

  /* --------------------------------- Filtrage ------------------------------- */
  const filteredMvtStocks = useMemo(() => {
    const q = normalize(search);
    return mvtStocks.filter((row) => {
      const catObj = (row?.produit as any)?.categorie;
      const catNom =
        typeof catObj === 'object' && catObj !== null ? normalize(catObj?.nom) : normalize((row?.produit as any)?.categorie);

      const produitNom = normalize(row?.produit?.nom);
      const pvNom = normalize(row?.pointVente?.nom);
      const typeNom = normalize(row?.type);
      const quantiteStr = String(safeNumber(row?.quantite)).toLowerCase();
      const montantStr = String(safeNumber(row?.montant)).toLowerCase();
      const statutStr = (row?.statut ? 'valide' : 'en attente').toLowerCase();
      const dateStr = (() => {
        try {
          return new Date(row?.createdAt || '').toLocaleDateString().toLowerCase();
        } catch {
          return '';
        }
      })();

      const matchSearch =
        !q ||
        catNom.includes(q) ||
        produitNom.includes(q) ||
        pvNom.includes(q) ||
        typeNom.includes(q) ||
        quantiteStr.includes(q) ||
        montantStr.includes(q) ||
        statutStr.includes(q) ||
        dateStr.includes(q);

      const matchCategorie =
        !categorie ||
        (typeof catObj === 'object' && catObj !== null && isNonEmptyString(categorie?._id) && catObj?._id === categorie._id);

      const matchPointVente =
        !selectedPointVente || (row?.pointVente?._id && row.pointVente._id === selectedPointVente._id);

      const matchType = !selectedType || selectedType === 'Tout' || row?.type === selectedType;

      return matchSearch && matchCategorie && matchPointVente && matchType;
    });
  }, [mvtStocks, search, categorie, selectedPointVente, selectedType]);

  /* ----------------------------- Pagination handler ------------------------ */
  const onPageChange = useCallback((e: any) => {
    setFirst(e.first ?? 0);
    setRows(e.rows ?? 10);
  }, []);

  /* ------------------------------ Actions / Menu ---------------------------- */
  const handleAction = useCallback((action: string, row: MouvementStock | null) => {
    if (!row) return;
    setSelectedMvt(row);
    if (action === 'valider') setIsValidateMvt(true);
    // TODO: edit/delete si besoin
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
        setImportedFiles((prev) => [...prev, { name: file.name, format }]);
        toast.current?.show({
          severity: 'info',
          summary: `Import ${format.toUpperCase()}`,
          detail: `Fichier importé: ${file.name}`,
          life: 3000,
        });
        // À implémenter: parsing + validations
        return;
      }

      if (type === 'export') {
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/rapport-mouvement-stock',
              mouvements: filteredMvtStocks,
              fileType,
            }) as any
          );
          if ((exportFile as any).fulfilled.match(r)) {
            const filename = `rapport.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
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
    [dispatch, filteredMvtStocks]
  );

  const refreshAfterValidate = useCallback(async () => {
    if (isAdminPointVente && isNonEmptyString((user as any)?.pointVente?._id)) {
      await dispatch(fetchMouvementStockByPointVenteId((user as any).pointVente._id));
    } else if (isAdminRegion && isNonEmptyString((user as any)?.region?._id)) {
      await dispatch(fetchMouvementStockByRegionId((user as any).region._id));
    } else {
      await dispatch(fetchMouvementsStock());
    }
  }, [dispatch, isAdminPointVente, isAdminRegion, user?.pointVente?._id, user?.region?._id]);

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between pt-6 pb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Rapports' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Rapports</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex mb-4 gap-4">
          <div className="w-4/5 flex flex-row gap-2">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value ?? '')}
            />

            <DropdownTypeFilter
              mvtStocks={mvtStocks}
              onChange={(_, type) => setSelectedType(type)}
            />

            <DropdownCategorieFilter onSelect={(cat) => setCategorie(cat)} />

            <DropdownPointVenteFilter onSelect={(pv) => setSelectedPointVente(pv)} />
          </div>

          <div className="w-1/5 flex justify-end items-end gap-2">
            <DropdownImportExport onAction={handleFileManagement} />
          </div>
        </div>

        <DataTable
          value={filteredMvtStocks}
          emptyMessage="Aucun mouvement de stock trouvé."
          responsiveLayout="scroll"
          scrollable
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          size="small"
          onPage={onPageChange}
          className="rounded-lg custom-datatable text-[11px]"
          tableStyle={{ minWidth: '60rem' }}
          //@ts-ignore
          rowClassName={(_, opt) => (opt?.rowIndex % 2 === 0 ? '!bg-gray-300 !text-gray-900' : '!bg-green-900 !text-white')}
        >
          <Column
            header="#"
            body={(_, options) => <span className="text-[11px]">{(options?.rowIndex ?? 0) + 1}</span>}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header=""
            body={(row: MouvementStock) => {
              const cat = (row?.produit as any)?.categorie;
              const imageUrl =
                typeof cat === 'object' && cat?.image ? safeApiImage(cat.image) : '';
              return imageUrl ? (
                <div className="w-10 h-10">
                  <img
                    src={imageUrl}
                    alt={cat?.nom ?? ''}
                    className="rounded-full w-full h-full object-cover border border-gray-100"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              ) : (
                <span className="text-[11px]">—</span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Produit"
            body={(row: MouvementStock) => <span className="text-[11px]">{row?.produit?.nom ?? '—'}</span>}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Catégorie"
            body={(row: MouvementStock) => {
              const cat = (row?.produit as any)?.categorie;
              const label =
                typeof cat === 'object' && cat !== null ? cat?.nom ?? '—' : (row?.produit as any)?.categorie ?? '—';
              return <span className="text-[11px]">{label}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Stock"
            body={(row: MouvementStock) => (
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
            body={(row: MouvementStock) => <span className="text-[11px]">{safeNumber(row?.quantite).toString()}</span>}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix/U"
            body={(row: MouvementStock) => {
              const prix =
                ['Entrée', 'Livraison', 'Commande'].includes(row?.type ?? '')
                  ? row?.produit?.prix
                  : row?.produit?.prixVente;
              const val = safeNumber(prix, NaN);
              return (
                <span className="text-blue-700 font-medium text-[11px]">
                  {Number.isFinite(val) ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                </span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix de vente Total"
            body={(row: MouvementStock) => {
              const net = safeNumber((row?.produit as any)?.netTopay, 0);
              const q = safeNumber(row?.quantite, 0);
              return <span className="text-purple-700 font-semibold text-[11px]">{(net * q).toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Valeur TVA Total"
            body={(row: MouvementStock) => {
              const net = safeNumber((row?.produit as any)?.netTopay, 0);
              const tva = safeNumber((row?.produit as any)?.tva, 0);
              const q = safeNumber(row?.quantite, 0);
              return <span className="text-yellow-600 font-medium text-[11px]">{(((net * tva) / 100) * q).toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
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
              return <span className={`${cls} text-[11px]`}>{total.toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Statut"
            body={(row: MouvementStock) => {
              const ok = !!row?.statut;
              return <Badge value={ok ? 'Validé' : 'En attente'} severity={ok ? 'success' : 'warning'} className="text-sm px-2 py-1 text-[11px]" />;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Utilisateur"
            body={(row: MouvementStock) => (
              <span className="text-[11px]">{typeof row?.user === 'object' ? (row.user as any)?.nom ?? '—' : (row as any)?.user ?? '—'}</span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Créé le"
            body={(row: MouvementStock) => {
              let d = '';
              try {
                d = new Date(row?.createdAt || '').toLocaleDateString();
              } catch {}
              return <span className="text-[11px]">{d || '—'}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Actions"
            body={(row: MouvementStock) => (
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
                    { label: 'Valider', command: () => handleAction('valider', row) },
                    // { label: 'Modifier', command: () => handleAction('edit', row) },
                    // { label: 'Supprimer', command: () => handleAction('delete', row) },
                  ]}
                  ref={(el) => setMenuRef((row as any)?._id ?? '', el)}
                />
              </>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
        </DataTable>
      </div>

      {/* Dialog de validation */}
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
              await refreshAfterValidate();
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
    </div>
  );
};

export default Page;
