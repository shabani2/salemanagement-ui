/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import { OperationType } from '@/lib/operationType';
import { Stock } from '@/Models/stock';
import { fetchStocks, selectAllStocks } from '@/stores/slices/stock/stockSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { Badge } from 'primereact/badge';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Menu } from 'primereact/menu';
import React, { SetStateAction, useEffect, useRef, useState } from 'react';
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

  const actionBodyTemplate = (rowData: any) => {
    const menuRef = useRef<any>(null);
    console.log('stock = ', stocks);
    return (
      <div>
        <Menu
          model={[
            {
              label: 'Détails',
              // @ts-ignore
              command: () => handleAction('details', rowData),
            },
            // @ts-ignore
            { label: 'Modifier', command: () => handleAction('edit', rowData) },
            {
              label: 'Supprimer',
              // @ts-ignore
              command: () => handleAction('delete', rowData),
            },
          ]}
          popup
          ref={menuRef}
        />
        <Button
          icon="pi pi-bars"
          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white bg-green-700"
          onClick={(event) => menuRef.current.toggle(event)}
          aria-haspopup
        />
      </div>
    );
  };

  useEffect(() => {
    dispatch(fetchStocks());
  }, [dispatch]);
  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des stock' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des stock</h2>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="gap-4 mb-4   flex justify-between">
          <div className="relative w-2/3 flex flex-row items-end gap-3">
            <div className="w-full flex flex-col gap-2">
              {/* <label htmlFor="type">Type</label> */}
              <Dropdown
                id="type"
                value={selectedType}
                options={typeOptions}
                onChange={(e) => {
                  setSelectedType(e.value);
                  console.log('Type sélectionné:', e.value);
                }}
                placeholder="Sélectionner un type"
                className="w-full"
              />
            </div>

            <div className="flex gap-2 h-full items-end self-end">
              <Button
                label="upload"
                icon="pi pi-upload"
                className="p-button-primary text-[16px] h-[46px]"
              />
              <Button
                label="download"
                icon="pi pi-download"
                className="p-button-success text-[16px] h-[46px]"
              />
            </div>
          </div>
        </div>
        {/* dataTable */}
        <DataTable
          value={stocks}
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          onPage={onPageChange}
          stripedRows
          className="rounded-lg custom-datatable"
// @ts-ignore
          tableStyle={{ minWidth: '60rem' }}
          // @ts-ignore
          rowClassName={(_, index: number) =>
            index % 2 === 0 ? 'bg-gray-300 text-gray-900' : 'bg-green-700 text-white'
          }
        >
          <Column field="_id" header="#" body={(_, options) => options.rowIndex + 1} />

          <Column
            field="produit.categorie.nom"
            header="Catégorie"
            filter
            body={(rowData: Stock) => {
              const categorie = rowData.produit?.categorie;
              if (!categorie) return '—';
// @ts-ignore
              const imageUrl = `http://localhost:8000/${categorie.image?.replace('../', '')}`;

              return (
                <div className="flex items-center gap-2">
                  {
                    // @ts-ignore
                    categorie.image && (
                    <img
                        src={imageUrl}
                        // @ts-ignore
                      alt={categorie.nom}
                      className="w-8 h-8 rounded-full object-cover border border-gray-300"
                    />
                  )}
                  <span>{
                    // @ts-ignore
                    categorie.nom}</span>
                </div>
              );
            }}
            className="px-4 py-1"
          />

          <Column
            field="produit.nom"
            header="Produit"
            filter
            body={(rowData: Stock) => rowData.produit?.nom || '—'}
            className="px-4 py-1"
          />

          <Column
            field="pointVente.nom"
            header="Point de Vente"
            filter
            body={(rowData: Stock) => rowData.pointVente?.nom || 'Depot Central'}
            className="px-4 py-1"
          />

          <Column field="quantite" filter header="Quantité" className="px-4 py-1" />

          <Column
            field="montant"
            filter
            header="Montant"
            className="px-4 py-1"
            body={(rowData: Stock) => `${rowData.montant.toLocaleString()} FC`}
          />

          <Column
            field="depotCentral"
            filter
            header="Source"
            className="px-4 py-1"
            body={(rowData: Stock) => (
              <Badge
                value={rowData.depotCentral ? 'Central' : 'Point de vente'}
                severity={rowData.depotCentral ? 'info' : 'warning'}
                className="text-sm px-2 py-1"
              />
            )}
          />

          <Column
            field="createdAt"
            filter
            header="Créé le"
            className="px-4 py-1"
            body={(rowData: Stock) => new Date(rowData.createdAt || '').toLocaleDateString()}
          />

          <Column header="Actions" body={actionBodyTemplate} className="px-4 py-1" />
        </DataTable>
      </div>
    </div>
  );
};

export default page;
