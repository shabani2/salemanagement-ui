/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { API_URL } from '@/lib/apiConfig';

import { OperationType } from '@/lib/operationType';
import { MouvementStock } from '@/Models/mouvementStockType';
import { PointVente } from '@/Models/pointVenteType';
import { Stock } from '@/Models/stock';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';
import {
  fetchStockByPointVenteId,
  fetchStockByRegionId,
  fetchStocks,
  selectAllStocks,
} from '@/stores/slices/stock/stockSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { Badge } from 'primereact/badge';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import React, { SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const typeOptions = Object.values(OperationType).map((op) => ({
  label: op,
  value: op,
}));

const page = () => {
  const [selectedType, setSelectedType] = useState(null);
  const dispatch = useDispatch<AppDispatch>();
  const stocks = useSelector((state: RootState) => selectAllStocks(state));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(10);
  // const [rowIndexes, setRowIndexes] = useState<{ [key: string]: number }>({});
  const [first, setFirst] = useState(0);
  const onPageChange = (event: { first: SetStateAction<number>; rows: SetStateAction<number> }) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAction = (action: string) => {
    console.log();
    // setDialogType(action);
  };

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  // useEffect(() => {
  //   if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
  //     dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
  //   } else {
  //     dispatch(fetchStocks());
  //   }
  // }, [dispatch, user?.role]);

  // traitement de la recherche dans le stock
  const [search, setSearch] = useState('');
  const [filteredBase, setFilteredBase] = useState<Stock[]>(stocks);
  const [categorie, setCategorie] = useState<any>(null);

  const filteredStocks = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return (filteredBase??[]).filter((s) => {
      const cat =
        typeof s.produit?.categorie === 'object' &&
        s.produit?.categorie !== null &&
        'nom' in s.produit.categorie
          ? (s.produit.categorie.nom as string)?.toLowerCase()
          : '';
      const prod = s.produit?.nom?.toLowerCase() || '';
      const pv = s.pointVente?.nom?.toLowerCase() || 'depot central';
      const quantite = String(s.quantite || '').toLowerCase();
      const montant = String(s.montant || '').toLowerCase();
      const date = new Date(s.createdAt || '').toLocaleDateString().toLowerCase();
      return [cat, prod, pv, quantite, montant, date].some((field) => field.includes(lowerSearch));
    });
  }, [search, filteredBase]);

  //file management
  const toast = useRef<Toast>(null);

  const [importedFiles, setImportedFiles] = useState<{ name: string; format: string }[]>([]);

  // 1. Charger les données une seule fois au mount
  useEffect(() => {
    if (user?.role === 'AdminPointVente') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else if (user?.role === 'AdminRegion') {
      dispatch(fetchStockByRegionId(user?.region?._id));
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.pointVente?._id, user?.region?._id, user?.role]);

  // 2. Initialiser filteredBase après que stocks ait été rempli
  useEffect(() => {
    if (stocks.length > 0) {
      setFilteredBase(stocks);
    }
  }, [stocks]);

  // console.log('filteredBase');
  const handlePointVenteSelect = (pointVente: PointVente | null) => {
    if (!pointVente) {
      setFilteredBase(stocks);
      return;
    }

    const filtered = (stocks??[]).filter((s) => s.pointVente?._id === pointVente._id);
    setFilteredBase(filtered);
  };
  const handleFileManagement = async ({
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
        detail: `File imported: ${file.name}`,
        life: 3000,
      });
      return;
    }

    if (type === 'export') {
      // Map "excel" to "xlsx" to satisfy the type requirement
      const exportFileType = format === 'excel' ? 'xlsx' : format;
      const result = await dispatch(
        exportFile({
          url: '/export/stock',
          mouvements: filteredStocks,
          fileType: exportFileType,
        })
      );

      if (exportFile.fulfilled.match(result)) {
        const filename = `stock.${format === 'csv' ? 'csv' : 'xlsx'}`;
        downloadExportedFile(result.payload, filename);

        toast.current?.show({
          severity: 'success',
          summary: `Export ${format.toUpperCase()}`,
          detail: `File downloaded: ${filename}`,
          life: 3000,
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: `Export ${format.toUpperCase()} Échoué`,
          detail: String(result.payload || 'Une erreur est survenue.'),
          life: 3000,
        });
      }
    }
  };
  console.log('filteredStocks', filteredStocks);

  return (
    <div className=" min-h-screen ">
      <div className="flex items-center justify-between pb-6 pt-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des stock' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-5000">Gestion des stock</h2>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex mb-4 gap-4">
          {/* Partie gauche - champ de recherche */}
          <div className="w-2/3 flex flex-row items-center gap-2">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <DropdownPointVenteFilter onSelect={handlePointVenteSelect} />
            <DropdownCategorieFilter
              onSelect={(categorie) => {
                setCategorie(categorie);

                if (categorie === null) {
                  setFilteredBase(stocks); // doit repartir de stocks (pas filteredBase !)
                  return;
                }

                const filtered = (stocks??[]).filter((p) => {
                  return (
                    typeof p.produit.categorie === 'object' &&
                    p.produit.categorie !== null &&
                    '_id' in p.produit.categorie &&
                    p.produit.categorie._id === categorie._id
                  );
                });

                setFilteredBase(filtered);
              }}
            />

            <DropdownImportExport onAction={handleFileManagement} />
          </div>
        </div>

        {/* dataTable */}
        <DataTable
          value={
            Array.isArray(filteredStocks[0])
              ? (filteredStocks ?? []).flat()
              : (filteredStocks ?? [])
          }
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          onPage={onPageChange}
          className="rounded-lg custom-datatable text-[11px]"
          // tableStyle={{ minWidth: '60rem' }}
          size="small"
          rowClassName={(_rowData: Stock, options) => {
            //@ts-ignore
            const rowIndex = options?.rowIndex ?? 0;
            const globalIndex = first + rowIndex;
            return globalIndex % 2 === 0
              ? '!bg-gray-300 !text-gray-900'
              : '!bg-green-900 !text-white';
          }}
        >
          <Column
            field="_id"
            header="#"
            body={(_, options) => options.rowIndex + 1}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="produit.categorie.nom"
            header=""
            body={(rowData: Stock) => {
              const categorie = rowData?.produit?.categorie;
              if (!categorie) return <span className="text-[11px]">—</span>;
              const imageUrl =
                typeof categorie === 'object' &&
                categorie !== null &&
                'image' in categorie &&
                categorie.image
                  ? `${API_URL}/${(categorie.image as string).replace('../', '')}`
                  : '';
              return (
                <div className="flex items-center gap-2 text-[11px]">
                  {typeof categorie === 'object' &&
                    categorie !== null &&
                    'image' in categorie &&
                    categorie.image && (
                      <img
                        src={imageUrl}
                        alt={categorie.nom}
                        className="w-8 h-8 rounded-full object-cover border border-gray-100"
                      />
                    )}
                </div>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="produit.nom"
            header="Produit"
            filter
            body={(rowData: Stock) => rowData.produit?.nom || '—'}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
          <Column
            field="pointVente.nom"
            header="stock"
            body={(rowData: Stock) => (
              <span className="text-[11px]">
                {rowData?.region
                  ? rowData?.region.nom
                  : rowData?.pointVente?.nom
                    ? rowData.pointVente.nom
                    : 'Depot Central'}
              </span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="quantite"
            header="Quantité"
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
          <Column
            field="stock.produit.seuil"
            header="quantite seuil"
            filter
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
            body={(rowData: Stock) => {
              const isValide = (rowData?.produit?.seuil ?? 0) < rowData.quantite;
              return (
                <span
                  className="flex items-center gap-1 text-sm px-2 py-1 text-[11px]"
                  style={{
                    backgroundColor: isValide ? '#4caf50' : '#f44336',
                    borderRadius: '9999px',
                    color: '#fff',
                  }}
                  title={isValide ? 'Stock suffisant' : 'Stock insuffisant'}
                  data-testid="stock-severity-badge"
                  data-severity={isValide ? 'success' : 'warning'}
                >
                  <i
                    className={isValide ? 'pi pi-check' : 'pi pi-exclamation-triangle'}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <span style={{ fontSize: '0.75rem' }}>{rowData?.produit?.seuil || 'N/A'}</span>
                  <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                    {isValide ? 'Suffisant' : 'Insuffisant'}
                  </span>
                </span>
              );
            }}
          />

          <Column
            header="Prix/U"
            body={(rowData) => (
              <span className="text-blue-700 font-semibold text-[11px]">
                {rowData.produit?.prix?.toLocaleString() ?? 'N/A'}
              </span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="montant"
            header="Cout Total"
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
            body={(rowData: Stock) => rowData.montant.toLocaleString()}
          />

          {/* <Column
            header="Valeur Marge"
            body={(rowData: MouvementStock) => {
              const prix = rowData.produit?.prix;
              const marge = rowData.produit?.marge;
              const valeur =
                prix && marge !== undefined ? ((prix * marge) / 100).toFixed(2) : 'N/A';
              return <span className="text-orange-600 font-medium text-[11px]">{valeur}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          /> */}

          <Column
            header="Prix de vente Total"
            body={(rowData: Stock) => {
              const net = rowData.produit?.netTopay ?? 0;
              const quantite = rowData.quantite ?? 0;
              const totalNet = net * quantite;
              return (
                <span className="text-purple-700 font-semibold text-[11px]">
                  {totalNet.toFixed(2)}
                </span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Valeur TVA Total"
            body={(rowData: Stock) => {
              const net = rowData.produit?.netTopay ?? 0;
              const tva = rowData.produit?.tva ?? 0;
              const quantite = rowData.quantite ?? 0;
              const valeurTVA = ((net * tva) / 100) * quantite;
              return (
                <span className="text-yellow-600 font-medium text-[11px]">
                  {valeurTVA.toFixed(2)}
                </span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="TTC"
            body={(rowData: Stock) => {
              //@ts-ignore
              const prix = ['Entrée', 'Livraison', 'Commande'].includes(rowData.type)
                ? rowData.produit?.prix
                : rowData.produit?.prixVente;
              const prixVente = rowData.produit?.prixVente ?? 0;
              const quantite = rowData.quantite ?? 0;
              const totalVente = prixVente * quantite;
              let colorClass = 'text-blue-600';
              if (prixVente > prix) colorClass = 'text-green-600 font-bold';
              else if (prixVente < prix) colorClass = 'text-red-600 font-bold';
              return <span className={`${colorClass} text-[11px]`}>{totalVente.toFixed(2)}</span>;
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="createdAt"
            filter
            header="Créé le"
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
            body={(rowData: Stock) => new Date(rowData.createdAt || '').toLocaleDateString()}
            sortable
          />
        </DataTable>
      </div>
    </div>
  );
};

export default page;
