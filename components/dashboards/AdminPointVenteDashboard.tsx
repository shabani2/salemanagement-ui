/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { AppDispatch } from '@/stores/store';
import { fetchMouvementStockAggregatedByPointVente } from '@/stores/slices/mvtStock/mvtStock';
import { BreadCrumb } from 'primereact/breadcrumb';
import { format } from 'date-fns';
import { MouvementStock } from '@/Models/mouvementStockType';

const AdminPVDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Récupération de l'utilisateur depuis localStorage
  const user = useMemo(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user-agricap');
      return userData ? JSON.parse(userData) : {};
    }
    return {};
  }, []);

  const loadData = useCallback(async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      //@ts-expect-error --hello here
      const result = await dispatch(
        //@ts-expect-error   --hello here
        fetchMouvementStockAggregatedByPointVente({
          pointVenteId: user?.pointVente?._id,
          page: currentPage,
        })
      ).unwrap();

      setTableData(result.mouvements);
      setTotalRecords(result.total);

      // Nouveaux calculs pour ventes et commandes
      let totalEntrees = 0;
      let totalSorties = 0;
      let totalVentes = 0;
      let totalCommandes = 0;

      result.mouvements.forEach((mvt: any) => {
        if (mvt.type === 'entree') {
          totalEntrees += mvt.totalQuantite;
        } else if (mvt.type === 'sortie') {
          totalSorties += mvt.totalQuantite;

          // VENTES = somme des montants des sorties
          totalVentes += mvt.totalMontant;

          // COMMANDES = somme des occurrences des sorties
          totalCommandes += mvt.count;
        } else if (mvt.type === 'Vente') {
          // totalSorties += mvt.totalQuantite;

          // VENTES = somme des montants des sorties
          totalVentes += mvt.totalMontant;

          // COMMANDES = somme des occurrences des sorties
          // totalCommandes += mvt.count;
        } else if (mvt.type === 'Commande') {
          // COMMANDES = somme des occurrences des sorties
          totalCommandes += mvt.totalMontant;
        }
      });

      setDashboardData({
        ventes: totalVentes, // Correction ici
        stock: totalEntrees - totalSorties,
        commandes: totalCommandes, // Correction ici
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CDF', // code ISO officiel du Franc Congolais
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Templates optimisés avec useMemo
  const typeBodyTemplate = useCallback(
    (rowData: any) => (
      <Tag
        value={rowData?.type?.toUpperCase()}
        severity={
          rowData?.type === 'Livraison' ? 'success' : rowData?.type === 'Vente' ? 'danger' : 'info'
        }
      />
    ),
    []
  );

  const montantBodyTemplate = useCallback(
    (rowData: any) => formatCurrency(rowData.totalMontant),
    []
  );

  const produitBodyTemplate = useCallback(
    (rowData: any) => rowData.produit?.nom || 'Produit inconnu',
    []
  );
  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');
  console.log('donnees aggregee : ', tableData);
  // const indexBodyTemplate = useCallback((rowData: any) => <span>{rowData.globalIndex}</span>, []);

  // Style conditionnel pour les lignes
  // const rowClass = (data: any, index: number) => {
  //   return index % 2 === 0 ? '!bg-green-700 text-white' : '!bg-gray-500 text-white';
  // };
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Tableau de bord' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-5000">du {formattedDate}</h2>
      </div>
      {/* Section Cartes - Design responsive amélioré */}
      <div className="flex flex-row gap-5  mb-6">
        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                        Total Ventes
                      </h3>
                      {/* Vous pouvez ajouter une tendance ici si nécessaire */}
                      <span className="text-green-600 text-xs font-medium px-2 py-1 rounded-full">
                        ↗ 2.5%
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xl font-bold text-green-900">
                        {formatCurrency(dashboardData?.ventes || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-euro text-white text-xl" />
                  </div>
                </div>
              </div>
            )}

            {/* Barre de progression subtile */}
            <div className="h-1 w-full bg-green-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>

        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-red-50 to-white rounded-xl shadow-lg overflow-hidden border border-red-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                        Total Stock
                      </h3>
                      <span className="text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                        ↗ 8.2%
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xl font-bold text-red-900">
                        {(dashboardData?.stock || 0).toLocaleString('fr-FR')} unités
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-box text-white text-xl" />
                  </div>
                </div>
              </div>
            )}

            <div className="h-1 w-full bg-red-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>

        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-lg overflow-hidden border border-orange-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                        Total Commandes
                      </h3>

                      {/* Exemple de tendance rouge */}
                      <span className="text-red-600 text-xs font-medium px-2 py-1 rounded-full">
                        ↗ 8.2%
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-2xl font-bold text-orange-900">
                        {(dashboardData?.commandes || 0).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-shopping-cart text-white text-xl" />
                  </div>
                </div>
              </div>
            )}

            <div className="h-1 w-full bg-orange-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DataTable - Pleine largeur avec design optimisé */}
      <div className="w-full ">
        <Card title="Mouvements de Stock" className="shadow-2 border-round-lg w-full p-3">
          <DataTable
            value={tableData ?? []}
            paginator
            rows={10}
            totalRecords={totalRecords}
            lazy
            first={(currentPage - 1) * 10}
            onPage={(e) => setCurrentPage(e.first / 10 + 1)}
            loading={loading}
            // rowClassName={rowClass}
            emptyMessage="Aucun mouvement trouvé"
            stripedRows
            scrollable
            className="w-full"
            rowHover
          >
            {/* <Column 
              header="#" 
              body={indexBodyTemplate} 
              align="center"
              style={{ width: '50px' }} 
            /> */}
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              className="px-4 py-1 text-[11px]"
              //headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column
              field=""
              header=""
              body={(rowData: MouvementStock) => {
                const categorie = rowData?.produit?.categorie;
                if (!categorie || typeof categorie !== 'object')
                  return <span className="text-[11px]">—</span>;
                const imageUrl = categorie.image
                  ? `http://localhost:8000/${categorie.image.replace('../', '')}`
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
              // headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="produit.nom"
              header="Produit"
              body={produitBodyTemplate}
              sortable
              style={{ minWidth: '200px' }}
            />
            <Column
              field="type"
              header="operations"
              body={typeBodyTemplate}
              align="center"
              style={{ width: '120px' }}
            />
            <Column
              field="totalQuantite"
              header="Quantité"
              align="center"
              sortable
              style={{ width: '120px' }}
            />
            <Column
              field="totalMontant"
              header="Montant Total"
              body={montantBodyTemplate}
              align="right"
              sortable
              style={{ minWidth: '150px' }}
            />
            <Column
              field="count"
              header="Occurrences"
              align="center"
              sortable
              style={{ width: '140px' }}
            />
          </DataTable>
        </Card>
      </div>
    </div>
  );
};

export default AdminPVDashboard;
