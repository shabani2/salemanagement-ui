/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { AppDispatch } from '@/stores/store';
import { fetchMouvementStockAggregatedByUserId } from '@/stores/slices/mvtStock/mvtStock';
import { BreadCrumb } from 'primereact/breadcrumb';
import { format } from 'date-fns';
import { MouvementStock } from '@/Models/mouvementStockType';

const VendeurDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const getUser = () => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('user-agricap') || '{}');
    }
    return {};
  };

  const user = getUser();

  useEffect(() => {
    if (user?._id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, user?._id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await dispatch(
        fetchMouvementStockAggregatedByUserId({
          userId: user._id,
          page: currentPage,
        })
      ).unwrap();

      setTableData(result.mouvements);
      setTotalRecords(result.total);

      // Calcul des données pour les cartes
      const totalVentes = result.mouvements.reduce(
        (acc: number, curr: any) => acc + curr.totalMontant,
        0
      );

      // Trouver le produit le plus et le moins vendu
      let mostSoldProduct = null;
      let leastSoldProduct = null;

      if (result.mouvements.length > 0) {
        mostSoldProduct = result.mouvements.reduce((max: any, curr: any) =>
          curr.totalQuantite > max.totalQuantite ? curr : max
        );

        leastSoldProduct = result.mouvements.reduce((min: any, curr: any) =>
          curr.totalQuantite < min.totalQuantite ? curr : min
        );
      }

      setDashboardData({
        ventes: totalVentes,
        mostSold: mostSoldProduct,
        leastSold: leastSoldProduct,
        totalProducts: result.mouvements.length,
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CDF', // code ISO officiel du Franc Congolais
      minimumFractionDigits: 0,
    }).format(value);
  };

  const produitBodyTemplate = (rowData: any) => {
    return rowData.produit?.nom || 'Produit inconnu';
  };

  const quantiteBodyTemplate = (rowData: any) => {
    return (
      <Tag
        value={rowData.totalQuantite.toLocaleString('fr-FR')}
        severity="info"
        className="font-bold"
      />
    );
  };

  const montantBodyTemplate = (rowData: any) => {
    return formatCurrency(rowData.totalMontant);
  };
  const now = new Date();
  const formattedDate = format(now, 'dd/MM/yy HH:mm');
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
      {/* Section 1: Cartes de résumé */}
      {/* <div className="flex flex-row gap-5  mb-6">
        <div className="md:w-1/3">
          <Card className="shadow-3 border-round-lg h-full">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : (
              <div className="flex align-items-center">
                <div className="mr-4 bg-blue-100 p-3 border-circle">
                  <span className="text-blue-500 text-2xl font-bold">FC</span>
                </div>
                <div>
                  <span className="block text-500 font-medium">Total Ventes</span>
                  <div className="text-900 font-bold text-2xl">
                    {formatCurrency(dashboardData?.ventes || 0)}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="md:w-1/3">
          <Card className="shadow-3 border-round-lg h-full">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : dashboardData?.mostSold ? (
              <div className="flex align-items-center">
                <div className="mr-4 bg-green-100 p-3 border-circle">
                  <i className="pi pi-arrow-up text-green-500 text-2xl" />
                </div>
                <div>
                  <span className="block text-500 font-medium">Produit le plus vendu</span>
                  <div className="text-900 font-bold text-xl">
                    {dashboardData.mostSold.produit?.nom || 'N/A'}
                  </div>
                  <div className="text-700 mt-1">
                    {dashboardData.mostSold.totalQuantite.toLocaleString('fr-FR')} unités
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <i className="pi pi-info-circle text-500 mr-2" />
                <span>Aucun produit vendu</span>
              </div>
            )}
          </Card>
        </div>

        <div className="md:w-1/3">
          <Card className="shadow-3 border-round-lg h-full">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : dashboardData?.leastSold ? (
              <div className="flex align-items-center">
                <div className="mr-4 bg-orange-100 p-3 border-circle">
                  <i className="pi pi-arrow-down text-orange-500 text-2xl" />
                </div>
                <div>
                  <span className="block text-500 font-medium">Produit le moins vendu</span>
                  <div className="text-900 font-bold text-xl">
                    {dashboardData.leastSold.produit?.nom || 'N/A'}
                  </div>
                  <div className="text-700 mt-1">
                    {dashboardData.leastSold.totalQuantite.toLocaleString('fr-FR')} unités
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4">
                <i className="pi pi-info-circle text-500 mr-2" />
                <span>Aucun produit vendu</span>
              </div>
            )}
          </Card>
        </div>
      </div> */}

      <div className="flex flex-row gap-5 mb-6">
        {/* Total Ventes */}
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
            <div className="h-1 w-full bg-green-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
                style={{ width: '30%' }}
              />
            </div>
          </div>
        </div>

        {/* Produit le plus vendu */}
        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : dashboardData?.mostSold ? (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                        Produit le plus vendu
                      </h3>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-bold text-green-900">
                        {dashboardData.mostSold.produit?.nom || 'N/A'}
                      </div>
                      <div className="text-green-700 text-sm mt-1">
                        {dashboardData.mostSold.totalQuantite.toLocaleString('fr-FR')} unités
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-arrow-up text-white text-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-gray-500">
                <i className="pi pi-info-circle mr-2" />
                Aucun produit vendu
              </div>
            )}
            <div className="h-1 w-full bg-green-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
                style={{ width: '45%' }}
              />
            </div>
          </div>
        </div>

        {/* Produit le moins vendu */}
        <div className="md:w-1/3">
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-lg overflow-hidden border border-orange-100 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
            {loading ? (
              <Skeleton width="100%" height="120px" />
            ) : dashboardData?.leastSold ? (
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                        Produit le moins vendu
                      </h3>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-bold text-orange-900">
                        {dashboardData.leastSold.produit?.nom || 'N/A'}
                      </div>
                      <div className="text-orange-700 text-sm mt-1">
                        {dashboardData.leastSold.totalQuantite.toLocaleString('fr-FR')} unités
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-xl ml-3">
                    <i className="pi pi-arrow-down text-white text-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-gray-500">
                <i className="pi pi-info-circle mr-2" />
                Aucun produit vendu
              </div>
            )}
            <div className="h-1 w-full bg-orange-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                style={{ width: '15%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: DataTable */}
      <div className="col-12 mt-5">
        <Card
          title={`Produits (${totalRecords})`}
          className="shadow-2 border-round-lg p-3"
          subTitle="Statistiques de vente par produit"
        >
          <DataTable
            value={tableData}
            paginator
            rows={10}
            totalRecords={totalRecords}
            lazy
            first={(currentPage - 1) * 10}
            onPage={
              //@ts-ignore
              (e) => setCurrentPage(e?.page + 1)
            }
            loading={loading}
            emptyMessage="Aucun produit trouvé"
            stripedRows
            scrollable
            scrollHeight="flex"
            className="mt-3"
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              className="px-4 py-1 text-[11px]"
              // headerClassName="text-[11px] !bg-green-900 !text-white"
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
              //headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="produit.nom"
              header="Produit"
              body={produitBodyTemplate}
              sortable
              filter
              filterPlaceholder="Rechercher"
            />
            <Column
              field="totalQuantite"
              header="Quantité Vendue"
              body={quantiteBodyTemplate}
              align="center"
              sortable
            />
            <Column
              field="totalMontant"
              header="Montant Total"
              body={montantBodyTemplate}
              align="right"
              sortable
            />
            <Column field="count" header="Transactions" align="center" sortable />
          </DataTable>
        </Card>
      </div>
    </div>
  );
};

export default VendeurDashboard;
