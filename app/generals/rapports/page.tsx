/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/* eslint-disable react-hooks/rules-of-hooks */
import { OperationType } from '@/lib/operationType';
import {
  fetchMouvementsStock,
  fetchMouvementStockByPointVenteId,
  fetchMouvementStockByRegionId,
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
import React, { SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { MouvementStock } from '@/Models/mouvementStockType';
import { Badge } from 'primereact/badge';
// import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ValidationDialog } from '@/components/ui/ValidationDialog';
import { getOptionsByRole, getRoleOptionsByUser } from '@/lib/utils';
import Operations from '@/app/generals/operations/page';
import { InputText } from 'primereact/inputtext';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { saveAs } from 'file-saver';
import { Toast } from 'primereact/toast';
import { useZebraRowClassName } from '@/hooks/useZebraRowClassName';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import { Categorie } from '@/Models/produitsType';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';
import DropdownTypeFilter from '@/components/ui/dropdowns/dropDownFile-filter';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import { PointVente } from '@/Models/pointVenteType';
import { useUserRole } from '@/hooks/useUserRole';
import { API_URL } from '@/lib/apiConfig';

const typeOptions = Object.values(OperationType).map((op) => ({
  label: op,
  value: op,
}));
const page = () => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [importedFiles, setImportedFiles] = useState<{ name: string; format: string }[]>([]);
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

  const { user, isSuperAdmin, isAdminPointVente, isAdminRegion } = useUserRole();

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
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData; // 👈 on stocke ici le bon rowData
          menuRef.current.toggle(event);
        }}
        aria-haspopup
      />
    </div>
  );

  const allMvtStocks = useSelector((state: RootState) => selectAllMouvementsStock(state));

  const allowedTypes = useMemo(() => {
    const types = getOptionsByRole(user?.role).map((opt) => opt.value);
    if (user?.role === 'AdminPointVente') {
      return [...types, 'Livraison'];
    }
    return types;
  }, [user?.role]);

  const mvtStocks = useMemo(() => {
    return allMvtStocks.filter((mvt) => allowedTypes.includes(mvt.type));
  }, [allMvtStocks, allowedTypes]);

  useEffect(() => {
    if (!user?.role) return;

    if (isAdminPointVente) {
      dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id));
    } else if (isAdminRegion) {
      dispatch(fetchMouvementStockByRegionId(user?.region?._id));
    } else if (isSuperAdmin) {
      dispatch(fetchMouvementsStock());
    }
  }, [
    dispatch,
    isSuperAdmin,
    isAdminRegion,
    isAdminPointVente,
    user?.pointVente?._id,
    user?.region?._id,
  ]);

  // useEffect(() => {
  //   if (!user?.role) return;

  //   if (user?.role === 'AdminPointVente') {
  //     console.log('user role : ', user?.role);
  //     dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id)).then((resp) => {
  //       console.log('mvt = ', resp.payload);
  //     });
  //   } else if (user?.role === 'AdminRegion') {
  //     dispatch(fetchMouvementStockByRegionId(user?.region?._id)).then((resp) => {
  //       if (resp.meta.requestStatus === 'rejected') {
  //         console.error('Failed to fetch mouvements stock:', resp.payload);
  //       }
  //       console.log('Fetched mouvements stock admin region:', resp.payload);
  //     });
  //   } else {
  //     dispatch(fetchMouvementsStock()).then((resp) => {
  //       if (resp.meta.requestStatus === 'rejected') {
  //         console.error('Failed to fetch mouvements stock:', resp.payload);
  //       }
  //       console.log('Fetched mouvements stock admin super:', resp.payload);
  //     });
  //   }
  // }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  // traitement de recherche
  const [search, setSearch] = useState('');
  const [filteredMvtStocks, setFilteredMvtStocks] = useState(mvtStocks);

  useEffect(() => {
    const filtered = mvtStocks.filter((row) => {
      const q = search.toLowerCase();
      return (
        (typeof row.produit?.categorie === 'object' &&
          row.produit?.categorie?.nom?.toLowerCase().includes(q)) ||
        row.produit?.nom?.toLowerCase().includes(q) ||
        row.pointVente?.nom?.toLowerCase().includes(q) ||
        row.type?.toLowerCase().includes(q) ||
        String(row.quantite).includes(q) ||
        String(row.montant).includes(q) ||
        //@ts-ignore
        (row.statut === true ? 'validé' : 'en attente').toLowerCase().includes(q) ||
        new Date(row?.createdAt || '').toLocaleDateString().toLowerCase().includes(q)
      );
    });
    setFilteredMvtStocks(filtered);
  }, [search, mvtStocks]);

  const mvtOptions = getOptionsByRole(user?.role);
  const mvtDefault = mvtOptions[0]?.value || null;

  useEffect(() => {
    if (mvtDefault) {
      setSelectedType(mvtDefault);
      setFilteredMvtStocks(mvtStocks.filter((s) => s.type === mvtDefault));
    }
  }, [mvtStocks, mvtDefault]);

  //file management
  const toast = useRef<Toast>(null);
  const [categorie, setCategorie] = useState<Categorie | null>(null);

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
          url: '/export/rapport-mouvement-stock',
          mouvements: filteredMvtStocks,
          fileType: exportFileType,
        })
      );

      if (exportFile.fulfilled.match(result)) {
        const filename = `rapport.${format === 'csv' ? 'csv' : 'xlsx'}`;
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

  const handlePointVenteSelect = (pointVente: PointVente | null) => {
    setSelectedPointVente(pointVente);
  };

  const [selectedPointVente, setSelectedPointVente] = useState<any>(null);

  useEffect(() => {
    const filtered = mvtStocks.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        (typeof row.produit?.categorie === 'object' &&
          row.produit?.categorie?.nom?.toLowerCase().includes(q)) ||
        row.produit?.nom?.toLowerCase().includes(q) ||
        row.pointVente?.nom?.toLowerCase().includes(q) ||
        row.type?.toLowerCase().includes(q) ||
        String(row.quantite).includes(q) ||
        String(row.montant).includes(q) ||
        //@ts-ignore
        (row.statut === true ? 'validé' : 'en attente').includes(q) ||
        new Date(row?.createdAt || '').toLocaleDateString().toLowerCase().includes(q);

      const matchCategorie =
        !categorie ||
        (typeof row.produit?.categorie === 'object' &&
          row.produit?.categorie?._id === categorie._id);
      const matchPointVente = !selectedPointVente || row.pointVente?._id === selectedPointVente._id;
      const matchType = !selectedType || selectedType === 'Tout' || row.type === selectedType;

      return matchSearch && matchCategorie && matchPointVente && matchType;
    });

    setFilteredMvtStocks([...filtered]);
  }, [mvtStocks, search, categorie, selectedPointVente, selectedType]);
  // console.log("user",user)
  //console.log('Filtered Mvt Stocks:', filteredMvtStocks);

  return (
    <div className=" min-h-screen ">
      <div className="flex items-center justify-between pt-6 pb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Rapports' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-5000">Gestion des Rapports</h2>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex mb-4 gap-4">
          {/* Partie gauche : 50% de la largeur */}
          <div className="w-4/5 flex flex-row gap-2">
            {/* Champ de recherche */}

            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <DropdownTypeFilter
              mvtStocks={mvtStocks}
              onChange={(_, type) => {
                setSelectedType(type); // ✅ délègue le filtrage au useEffect
              }}
            />
            <DropdownCategorieFilter onSelect={(categorie) => setCategorie(categorie)} />

            <DropdownPointVenteFilter onSelect={handlePointVenteSelect} />
          </div>

          {/* Partie droite : 50% de la largeur, alignée à droite */}

          <div className="w-1/5 flex justify-end items-end gap-2">
            <DropdownImportExport onAction={handleFileManagement} />
          </div>
        </div>

        {/* datatable zone */}
        <DataTable
          // value={Array.isArray(filteredMvtStocks[0]) ? filteredMvtStocks.flat() : filteredMvtStocks}
          value={
            Array.isArray(filteredMvtStocks?.[0])
              ? (filteredMvtStocks ?? []).flat()
              : (filteredMvtStocks ?? [])
          }
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
          rowClassName={(rowData, options) => {
            //@ts-ignore
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
            body={(_, options) => <span className="text-[11px]">{options.rowIndex + 1}</span>}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field=""
            header=""
            body={(rowData: MouvementStock) => {
              const categorie = rowData?.produit?.categorie;
              if (!categorie || typeof categorie !== 'object')
                return <span className="text-[11px]">—</span>;
              const imageUrl = categorie.image
                ? `${API_URL}/${categorie.image.replace('../', '')}`
                : '';
              return (
                <div className="flex items-center  text-[11px]">
                  {typeof categorie === 'object' && categorie.image && (
                    <div className="w-10 h-10">
                      <img
                        src={imageUrl}
                        alt={categorie.nom || ''}
                        className="rounded-full w-full h-full object-cover border border-gray-100"
                      />
                    </div>
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
            body={(rowData: MouvementStock) => (
              <span className="text-[11px]">{rowData.produit?.nom}</span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
          {/* <Column
            field="type"
            header="operation"
            body={(rowData: MouvementStock) => <span className="text-[11px]">{rowData.type}</span>}
            filter
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          /> */}
          <Column
            field="produit.categorie.nom"
            header="Catégorie"
            body={(rowData: MouvementStock) => (
              <span className="text-[11px]">
                {typeof rowData.produit?.categorie === 'object'
                  ? rowData.produit?.categorie?.nom
                  : rowData.produit?.categorie || '—'}
              </span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
          <Column
            field=" "
            header="stock"
            body={(rowData: MouvementStock) => (
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
            filter
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix/U"
            body={(rowData: MouvementStock) => {
              const prix = ['Entrée', 'Livraison', 'Commande'].includes(rowData.type)
                ? rowData.produit?.prix
                : rowData.produit?.prixVente;
              return (
                <span className="text-blue-700 font-medium text-[11px]">
                  {prix?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) ?? 'N/A'}
                </span>
              );
            }}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            header="Prix de vente Total"
            body={(rowData: MouvementStock) => {
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
            body={(rowData: MouvementStock) => {
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
            body={(rowData: MouvementStock) => {
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
            field="statut"
            header="Statut"
            filter
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
            body={(rowData) => {
              const isValide = rowData.statut === true;
              return (
                <Badge
                  value={isValide ? 'Validé' : 'En attente'}
                  severity={isValide ? 'success' : 'warning'}
                  className="text-sm px-2 py-1 text-[11px]"
                />
              );
            }}
          />
          <Column
            field="mouvementstock.user.nom"
            header="utilisateur"
            body={(rowData: MouvementStock) => (
              <span className="text-[11px]">
                {typeof rowData?.user === 'object' ? rowData?.user?.nom : rowData?.user || '—'}
              </span>
            )}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />

          <Column
            field="createdAt"
            filter
            header="Créé le"
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
            body={(rowData) => (
              <span className="text-[11px]">
                {new Date(rowData.createdAt || '').toLocaleDateString()}
              </span>
            )}
          />

          <Column
            header="Actions"
            body={actionBodyTemplate}
            className="px-4 py-1 text-[11px]"
            headerClassName="text-[11px] !bg-green-900 !text-white"
          />
        </DataTable>
      </div>

      {/* dialog de validation */}

      <ValidationDialog
        visible={isValidateMvt}
        onHide={() => setIsValidateMvt(false)}
        onConfirm={(item) => {
          dispatch(validateMouvementStock(item?._id)).then((resp) => {
            console.log('mvt updated', resp.payload);
            if (user?.role !== 'SuperAdmin' && user?.role !== 'AdminRegion') {
              console.log('user role : ', user?.role);
              dispatch(fetchMouvementStockByPointVenteId(user?.pointVente?._id)).then((resp) => {
                console.log('mvt = ', resp.payload);
              });
            } else {
              dispatch(fetchMouvementsStock());
            }
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
