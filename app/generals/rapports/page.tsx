/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
/* eslint-disable react-hooks/rules-of-hooks */
import { OperationType } from '@/lib/operationType';
import {
  fetchMouvementsStock,
  selectAllMouvementsStock,
  validateMouvementStock,
} from '@/stores/slices/mvtStock/mvtStock';
import { AppDispatch, RootState } from '@/stores/store';
//import error from 'next/error';

import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Menu } from 'primereact/menu';
import React, { SetStateAction, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { MouvementStock } from '@/Models/mouvementStockType';
import { Badge } from 'primereact/badge';
// import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ValidationDialog } from '@/components/ui/ValidationDialog';

const typeOptions = Object.values(OperationType).map((op) => ({
  label: op,
  value: op,
}));
const page = () => {
  const [selectedType, setSelectedType] = useState(null);
  const dispatch = useDispatch<AppDispatch>();
  const mvtStocks = useSelector((state: RootState) => selectAllMouvementsStock(state));
  const [selectedMvt, setSelectedMvt] = useState<MouvementStock | null>(null);
  const [isValidateMvt, setIsValidateMvt] = useState<boolean>(false);
  const selectedRowDataRef = useRef<any>(null);
  const menuRef = useRef<any>(null);
  //@ts-ignore
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(10);
  // const [rowIndexes, setRowIndexes] = useState<{ [key: string]: number }>({});
  const [first, setFirst] = useState(0);
  const onPageChange = (event: { first: SetStateAction<number>; rows: SetStateAction<number> }) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const handleAction = (action: string, rowData: MouvementStock) => {
    setSelectedMvt(rowData);
    console.log('selected row data : ', rowData);
    if (action == 'valider') {
      setIsValidateMvt(true);
    }
  };

  const actionBodyTemplate = (rowData: MouvementStock) => (
    <div>
      <Menu
        model={[
          {
            label: 'valider',
            command: () => handleAction('valider', selectedRowDataRef.current),
          },
          {
            label: 'Modifier',
            command: () => handleAction('edit', selectedRowDataRef.current),
          },
          {
            label: 'Supprimer',
            command: () => handleAction('delete', selectedRowDataRef.current),
          },
        ]}
        popup
        ref={menuRef}
      />
      <Button
        icon="pi pi-bars"
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData; // 👈 on stocke ici le bon rowData
          menuRef.current.toggle(event);
        }}
        aria-haspopup
      />
    </div>
  );

  useEffect(() => {
    dispatch(fetchMouvementsStock());
  }, [dispatch]);

  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Rapports' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des Rapports</h2>
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
        {/* datatable zone */}
        <DataTable
          value={mvtStocks}
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          stripedRows
          first={first}
          onPage={onPageChange}
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
            body={(rowData: MouvementStock) => {
              const categorie = rowData?.produit?.categorie;
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
                        alt={
                          // @ts-ignore
                          categorie.nom
                        }
                        className="w-8 h-8 rounded-full object-cover border border-gray-300"
                      />
                    )
                  }
                  <span>
                    {
                      // @ts-ignore
                      categorie.nom
                    }
                  </span>
                </div>
              );
            }}
            className="px-4 py-1"
          />

          <Column
            field="produit.nom"
            header="Produit"
            filter
            body={(rowData) => rowData.produit?.nom}
            className="px-4 py-1"
          />

          <Column
            field="pointVente.nom"
            header="Point de Vente"
            filter
            body={(rowData) => rowData.pointVente?.nom || 'Depot Central'}
            className="px-4 py-1"
          />

          <Column field="type" header="Type" filter className="px-4 py-1" />

          <Column field="quantite" header="Quantité" filter className="px-4 py-1" />

          <Column
            field="montant"
            header="Montant"
            filter
            className="px-4 py-1"
            body={(rowData) => `${rowData.montant.toLocaleString()} FC`}
          />

          <Column
            field="statut"
            header="Statut"
            filter
            className="px-4 py-1"
            body={(rowData) => {
              const isValide = rowData.statut === true;
              return (
                <Badge
                  value={isValide ? 'Validé' : 'En attente'}
                  severity={isValide ? 'success' : 'warning'}
                  className="text-sm px-2 py-1"
                />
              );
            }}
          />

          <Column
            field="createdAt"
            filter
            header="Créé le"
            className="px-4 py-1"
            body={(rowData) => new Date(rowData.createdAt || '').toLocaleDateString()}
          />

          <Column header="Actions" body={actionBodyTemplate} className="px-4 py-1" />
        </DataTable>
      </div>

      {/* dialog de validation */}

      <ValidationDialog
        visible={isValidateMvt}
        onHide={() => setIsValidateMvt(false)}
        onConfirm={(item) => {
          dispatch(validateMouvementStock(item?._id)).then((resp) => {
            console.log('mvt updated', resp.payload);
            dispatch(fetchMouvementsStock());
            setIsValidateMvt(false);
          });
        }}
        item={selectedMvt}
        objectLabel="l'operation "
        displayField="nom"
      />
    </div>
  );
};

export default page;
