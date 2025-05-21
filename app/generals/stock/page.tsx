/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { OperationType } from '@/lib/operationType';
import { MouvementStock } from '@/Models/mouvementStockType';
import { PointVente } from '@/Models/pointVenteType';
import { Stock } from '@/Models/stock';
import {
  fetchStockByPointVenteId,
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

  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.role]);

  // traitement de la recherche dans le stock
  const [search, setSearch] = useState('');
  const [filteredBase, setFilteredBase] = useState<Stock[]>(stocks);
  const [categorie, setCategorie] = useState<any>(null);

  const filteredStocks = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return filteredBase.filter((s) => {
      const cat = s.produit?.categorie?.nom?.toLowerCase() || '';
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

  const handleFileManagement = ({
    type,
    format,
    file,
  }: {
    type: 'import' | 'export';
    format: 'csv' | 'pdf';
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
      const content = format === 'csv' ? 'name,age\nJohn,30\nJane,25' : 'Excel simulation content';
      const blob = new Blob([content], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `export.${format === 'csv' ? 'csv' : 'xlsx'}`;
      saveAs(blob, filename);

      toast.current?.show({
        severity: 'success',
        summary: `Export ${format.toUpperCase()}`,
        detail: `File downloaded: ${filename}`,
        life: 3000,
      });
    }
  };

  // 1. Charger les données une seule fois au mount
  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
      dispatch(fetchStockByPointVenteId(user?.pointVente?._id));
    } else {
      dispatch(fetchStocks());
    }
  }, [dispatch, user?.role]);

  // 2. Initialiser filteredBase après que stocks ait été rempli
  useEffect(() => {
    if (stocks.length > 0) {
      setFilteredBase(stocks);
    }
  }, [stocks]);

  console.log('filteredBase');
  const handlePointVenteSelect = (pointVente: PointVente | null) => {
    if (!pointVente) {
      setFilteredBase(stocks);
      return;
    }

    const filtered = stocks.filter((s) => s.pointVente?._id === pointVente._id);
    setFilteredBase(filtered);
  };
  return (
    <div className=" min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des stock' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-500">Gestion des stock</h2>
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

                const filtered = stocks.filter((p) => {
                  return p.produit.categorie?._id === categorie._id;
                });

                setFilteredBase(filtered);
              }}
            />

            <DropdownImportExport onAction={handleFileManagement} />
          </div>
        </div>

        {/* dataTable */}
        <DataTable
          value={Array.isArray(filteredStocks[0]) ? filteredStocks.flat() : filteredStocks}
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          onPage={onPageChange}
          className="rounded-lg custom-datatable text-[14px]"
          tableStyle={{ minWidth: '60rem' }}
          rowClassName={(rowData, options) => {
            const index = options?.index ?? 0;
            const globalIndex = first + index;

            return globalIndex % 2 === 0
              ? '!bg-gray-300 !text-gray-900'
              : '!bg-green-900 !text-white';
          }}
        >
          <Column
            field="_id"
            header="#"
            body={(_, options) => options.rowIndex + 1}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            field="produit.categorie.nom"
            header=""
            body={(rowData: Stock) => {
              const categorie = rowData?.produit?.categorie;
              if (!categorie) return <span className="text-[14px]">—</span>;
              const imageUrl = `http://localhost:8000/${categorie.image?.replace('../', '')}`;
              return (
                <div className="flex items-center gap-2 text-[14px]">
                  {categorie.image && (
                    <img
                      src={imageUrl}
                      alt={categorie.nom}
                      className="w-8 h-8 rounded-full object-cover border border-gray-100"
                    />
                  )}
                </div>
              );
            }}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            field="produit.nom"
            header="Produit"
            filter
            body={(rowData: Stock) => rowData.produit?.nom || '—'}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          {/* <Column
    field="pointVente.nom"
    header="Point de Vente"
    filter
    body={(rowData: Stock) => rowData.pointVente?.nom || 'Depot Central'}
    className="px-4 py-1 text-[14px]"
    headerClassName="text-[14px] !bg-green-900 !text-white"
/> */}

          <Column
            field="quantite"
            header="Quantité"
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            field="montant"
            header="Montant"
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
            body={(rowData: Stock) => rowData.montant.toLocaleString()}
          />

          <Column
            header="Prix acquisition"
            body={(rowData) => (
              <span className="text-blue-700 font-semibold text-[14px]">
                {rowData.produit?.prix?.toLocaleString() ?? 'N/A'}
              </span>
            )}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            header="Valeur Marge"
            body={(rowData: MouvementStock) => {
              const prix = rowData.produit?.prix;
              const marge = rowData.produit?.marge;
              const valeur =
                prix && marge !== undefined ? ((prix * marge) / 100).toFixed(2) : 'N/A';
              return <span className="text-orange-600 font-medium text-[14px]">{valeur}</span>;
            }}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            header="Net à Payer"
            body={(rowData) => {
              const net = rowData.produit?.netTopay;
              return (
                <span className="text-purple-700 font-semibold text-[14px]">
                  {net?.toFixed(2) ?? 'N/A'}
                </span>
              );
            }}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            header="TVA (%)"
            body={(rowData: MouvementStock) => (
              <span className="text-yellow-800 font-medium text-[14px]">
                {rowData.produit?.tva ?? '—'}%
              </span>
            )}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            header="Valeur TVA"
            body={(rowData: MouvementStock) => {
              const net = rowData.produit?.netTopay;
              const tva = rowData.produit?.tva;
              const value = net && tva !== undefined ? ((net * tva) / 100).toFixed(2) : 'N/A';
              return <span className="text-yellow-600 font-medium text-[14px]">{value}</span>;
            }}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix de Vente"
            body={(rowData) => (
              <span className="text-green-600 font-bold text-[14px]">
                {rowData.produit?.prixVente?.toFixed(2) ?? 'N/A'}
              </span>
            )}
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
          />

          <Column
            field="createdAt"
            filter
            header="Créé le"
            className="px-4 py-1 text-[14px]"
            headerClassName="text-[14px] !bg-green-900 !text-white"
            body={(rowData: Stock) => new Date(rowData.createdAt || '').toLocaleDateString()}
            sortable
          />
        </DataTable>
      </div>
    </div>
  );
};

export default page;
