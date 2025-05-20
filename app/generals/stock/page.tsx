/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import { OperationType } from '@/lib/operationType';
import { MouvementStock } from '@/Models/mouvementStockType';
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

  const filteredStocks = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return stocks.filter((s) => {
      const cat = s.produit?.categorie?.nom?.toLowerCase() || '';
      const prod = s.produit?.nom?.toLowerCase() || '';
      const pv = s.pointVente?.nom?.toLowerCase() || 'depot central';
      const quantite = String(s.quantite || '').toLowerCase();
      const montant = String(s.montant || '').toLowerCase();
      const date = new Date(s.createdAt || '').toLocaleDateString().toLowerCase();
      return [cat, prod, pv, quantite, montant, date].some((field) => field.includes(lowerSearch));
    });
  }, [search, stocks]);

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
          <div className="w-1/2">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Partie droite - boutons alignés à droite */}
          <div className="w-1/2 flex justify-end items-end gap-2">
            <Button
              label="upload"
              icon="pi pi-upload"
              className="p-button-primary text-[16px] h-[46px]"
            />
            <Button
              label="download"
              icon="pi pi-download"
              className="!bg-green-900 text-[16px] h-[46px]"
            />
          </div>
        </div>

        {/* dataTable */}
        <DataTable
          value={filteredStocks}
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          onPage={onPageChange}
          
          className="rounded-lg custom-datatable text-[14px]"
          // @ts-ignore
          tableStyle={{ minWidth: '60rem' }}
          // @ts-ignore
          rowClassName={(_, index: number) =>
            index % 2 === 0 ? 'bg-gray-300 text-gray-900' : '!bg-green-700 text-white'
          }
        >
          <Column
            field="_id"
            header="#"
            body={(_, options) => options.rowIndex + 1}
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            field="produit.categorie.nom"
            header="Catégorie"
            filter
            body={(rowData: Stock) => {
              const categorie = rowData.produit?.categorie;
              if (!categorie) return '—';
              const imageUrl = `http://localhost:8000/${categorie.image?.replace('../', '')}`;

              return (
                <div className="flex items-center gap-2">
                  {categorie.image && (
                    <img
                      src={imageUrl}
                      alt={categorie.nom}
                      className="w-8 h-8 rounded-full object-cover border border-gray-300"
                    />
                  )}
                  <span>{categorie.nom}</span>
                </div>
              );
            }}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            field="produit.nom"
            header="Produit"
            filter
            body={(rowData: Stock) => rowData.produit?.nom || '—'}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            field="pointVente.nom"
            header="Point de Vente"
            filter
            body={(rowData: Stock) => rowData.pointVente?.nom || 'Depot Central'}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            field="quantite"
            sortable
            header="Quantité"
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            field="montant"
            sortable
            header="Montant"
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
            body={(rowData: Stock) => rowData.montant.toLocaleString()}
          />

          <Column
            header="Prix acquisition"
            body={(rowData) => (
              <span className="text-blue-700 font-semibold">
                {rowData.produit?.prix?.toLocaleString() ?? 'N/A'}
              </span>
            )}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            header="Valeur Marge"
            body={(rowData: MouvementStock) => {
              const prix = rowData.produit?.prix;
              const marge = rowData.produit?.marge;
              const valeur =
                prix && marge !== undefined ? ((prix * marge) / 100).toFixed(2) : 'N/A';
              return <span className="text-orange-600 font-medium">{valeur}</span>;
            }}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            header="Net à Payer"
            body={(rowData) => {
              const net = rowData.produit?.netTopay;
              return (
                <span className="text-purple-700 font-semibold">{net?.toFixed(2) ?? 'N/A'}</span>
              );
            }}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            header="TVA (%)"
            body={(rowData: MouvementStock) => (
              <span className="text-yellow-800 font-medium">{rowData.produit?.tva ?? '—'}%</span>
            )}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            header="Valeur TVA"
            body={(rowData: MouvementStock) => {
              const net = rowData.produit?.netTopay;
              const tva = rowData.produit?.tva;
              const value = net && tva !== undefined ? ((net * tva) / 100).toFixed(2) : 'N/A';
              return <span className="text-yellow-600 font-medium">{value}</span>;
            }}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            header="Prix de Vente"
            body={(rowData) => (
              <span className="text-green-600 font-bold">
                {rowData.produit?.prixVente?.toFixed(2) ?? 'N/A'}
              </span>
            )}
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
          />

          <Column
            field="createdAt"
            filter
            header="Créé le"
            className="px-4 py-1"
           headerClassName = "text-[16px] !bg-green-900 !text-white" 
            body={(rowData: Stock) => new Date(rowData.createdAt || '').toLocaleDateString()}
            sortable
          />
        </DataTable>
      </div>
    </div>
  );
};

export default page;
