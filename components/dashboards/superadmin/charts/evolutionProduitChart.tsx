/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useMemo, useState, useEffect } from 'react';
import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import { PrimeIcons } from 'primereact/api';
import { classNames } from 'primereact/utils';
import { MouvementStock } from '@/Models/mouvementStockType';
import { UserRole } from '@/lib/utils';
import { Region } from '@/Models/regionTypes';
import { PointVente } from '@/Models/pointVenteType';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { motion } from 'framer-motion';

// Constantes pour la cohérence visuelle
const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#0EA5E9',
  '#F97316',
];

const OPERATION_TYPES = [
  { label: 'Entrée', icon: PrimeIcons.ARROW_DOWN, value: 'Entrée' },
  { label: 'Sortie', icon: PrimeIcons.ARROW_UP, value: 'Sortie' },
  { label: 'Vente', icon: PrimeIcons.SHOPPING_CART, value: 'Vente' },
  { label: 'Livraison', icon: PrimeIcons.CAR, value: 'Livraison' },
  { label: 'Commande', icon: PrimeIcons.SHOPPING_BAG, value: 'Commande' },
];

// Composant pour les indicateurs KPI

const KPIIndicator: React.FC<{
  label: string;
  value: string;
  quantity: number;
  icon: string;
  color: string; // e.g., 'bg-blue-100'
  iconColor: string; // e.g., 'text-blue-500'
}> = ({ label, value, quantity, icon, color, iconColor }) => (
  <div
    className={classNames(
      'bg-gradient-to-br  from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 rounded-2xl shadow-md p-5 ',
      'border border-gray-200 '
    )}
  >
    <div className="flex items-center gap-4">
      {/* Icon Container */}
      <div
        className={classNames(
          'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
          color
        )}
      >
        <i className={classNames(icon, iconColor, 'text-2xl')}></i>
      </div>

      {/* Textual Data */}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-gray-900">{quantity.toLocaleString()}</span>
          <span className="text-sm text-gray-400 truncate" style={{ maxWidth: '140px' }}>
            {value}
          </span>
        </div>
      </div>
    </div>
  </div>
);

// Composant pour les filtres
const FilterControls: React.FC<{
  operationType: string;
  onOperationChange: (value: string) => void;
  selectedRegion: Region | null;
  onRegionChange: (value: Region | null) => void;
  selectedPointVente: PointVente | null;
  onPointVenteChange: (value: PointVente | null) => void;
  regions: Region[];
  pointsVente: PointVente[];
  userRole: UserRole;
}> = ({
  operationType,
  onOperationChange,
  selectedRegion,
  onRegionChange,
  selectedPointVente,
  onPointVenteChange,
  regions,
  pointsVente,
  userRole,
}) => {
  const filteredPointVentes = useMemo(() => {
    if (!selectedRegion) return pointsVente;
    return pointsVente.filter(
      (pv) => typeof pv.region !== 'string' && pv.region?._id === selectedRegion._id
    );
  }, [pointsVente, selectedRegion]);

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <Dropdown
        value={operationType}
        options={OPERATION_TYPES}
        optionLabel="label"
        onChange={(e) => onOperationChange(e.value)}
        placeholder="Type d'opération"
        className="min-w-[200px]"
        itemTemplate={(opt) => (
          <div className="flex align-items-center gap-2">
            <i className={opt.icon}></i>
            <span>{opt.label}</span>
          </div>
        )}
      />

      {userRole === 'SuperAdmin' && (
        <Dropdown
          value={selectedRegion}
          options={[{ nom: 'Toutes les régions', _id: 'all' }, ...regions]}
          optionLabel="nom"
          onChange={(e) => {
            onRegionChange(e.value?._id === 'all' ? null : e.value);
            onPointVenteChange(null);
          }}
          placeholder="Sélectionner une région"
          className="min-w-[200px]"
          itemTemplate={(opt) => <div>{opt._id === 'all' ? 'Toutes les régions' : opt.nom}</div>}
        />
      )}

      {(userRole === 'SuperAdmin' || userRole === 'AdminRegion') && (
        <Dropdown
          value={selectedPointVente}
          options={[{ nom: 'Tous les points de vente', _id: 'all' }, ...filteredPointVentes]}
          optionLabel="nom"
          onChange={(e) => onPointVenteChange(e.value?._id === 'all' ? null : e.value)}
          placeholder="Sélectionner un point de vente"
          className="min-w-[220px]"
          disabled={!selectedRegion && userRole === 'SuperAdmin'}
          itemTemplate={(opt) => (
            <div>{opt._id === 'all' ? 'Tous les points de vente' : opt.nom}</div>
          )}
        />
      )}
    </div>
  );
};

// Composant principal
const AnalyseMouvementStockChart: React.FC<{
  data: MouvementStock[];
  userRole: UserRole;
  initialRegion?: Region;
  initialPointVente?: PointVente;
}> = ({ data, userRole, initialRegion, initialPointVente }) => {
  const dispatch: AppDispatch = useDispatch();
  const regions = useSelector(selectAllRegions);
  const pointsVente = useSelector(selectAllPointVentes);

  const [operationType, setOperationType] = useState<
    'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande'
  >('Vente');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(initialRegion || null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(
    initialPointVente || null
  );

  useEffect(() => {
    dispatch(fetchRegions());
    dispatch(fetchPointVentes());
  }, [dispatch]);

  // Synchronisation des points de vente avec la région sélectionnée
  useEffect(() => {
    if (selectedRegion && selectedPointVente) {
      const pvRegion =
        typeof selectedPointVente.region !== 'string'
          ? selectedPointVente.region?._id
          : selectedPointVente.region;

      if (pvRegion !== selectedRegion._id) {
        setSelectedPointVente(null);
      }
    }
  }, [selectedRegion, selectedPointVente]);

  // Logique de traitement des données
  const processedData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};

    const filtered = data.filter((item) => {
      if (item.type !== operationType || !item.produit?.nom) return false;

      const pv = item.pointVente;
      const r = typeof pv?.region === 'string' ? null : pv?.region;

      if (selectedRegion) return r && r._id === selectedRegion._id;
      if (selectedPointVente) return pv?._id === selectedPointVente._id;
      return true;
    });

    filtered.forEach((item) => {
      const produit = item.produit.nom;
      let key = '';

      if (userRole === 'SuperAdmin' || selectedRegion) {
        key =
          typeof item.pointVente?.region !== 'string'
            ? item.pointVente?.region?.nom || 'Non défini'
            : 'Non défini';
      } else if (userRole === 'AdminRegion' || selectedPointVente) {
        key = item.pointVente?.nom || 'Non défini';
      } else {
        key = produit;
      }

      if (!grouped[produit]) grouped[produit] = {};
      if (!grouped[produit][key]) grouped[produit][key] = 0;
      grouped[produit][key] += item.quantite;
    });

    return grouped;
  }, [data, operationType, userRole, selectedRegion, selectedPointVente]);

  // Préparation des données pour le graphique
  const chartData = useMemo(() => {
    const keySet = new Set<string>();
    const productTotals: Record<string, number> = {};

    Object.values(processedData).forEach((map) => Object.keys(map).forEach((k) => keySet.add(k)));
    const keys = Array.from(keySet);

    const datasets = Object.entries(processedData).map(([product, map], idx) => {
      const data = keys.map((k) => map[k] || 0);
      productTotals[product] = data.reduce((a, b) => a + b, 0);
      return {
        label: product,
        backgroundColor: COLORS[idx % COLORS.length],
        borderColor: COLORS[idx % COLORS.length],
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
        data,
      };
    });

    const sorted = Object.entries(productTotals).sort((a, b) => b[1] - a[1]);

    // Déterminer le contexte pour les labels KPI
    const context = selectedRegion
      ? `dans ${selectedRegion.nom}`
      : selectedPointVente
        ? `au point de vente ${selectedPointVente.nom}`
        : '';

    const operationText = operationType.toLowerCase();

    return {
      labels: keys,
      datasets,
      indicators: [
        {
          label: `Produit le plus ${operationText} ${context}`,
          value: sorted[0]?.[0] || 'Aucune donnée',
          quantity: sorted[0]?.[1] || 0,
          //@ts-ignore
          icon: PrimeIcons.TROPHY,
          color: 'bg-green-50',
          iconColor: 'text-green-600',
        },
        {
          label: `Produit moyen ${operationText} ${context}`,
          value: sorted[Math.floor(sorted.length / 2)]?.[0] || 'Aucune donnée',
          quantity: sorted[Math.floor(sorted.length / 2)]?.[1] || 0,
          icon: PrimeIcons.CHART_BAR,
          color: 'bg-blue-50',
          iconColor: 'text-blue-600',
        },
        {
          label: `Produit le moins ${operationText} ${context}`,
          value: sorted[sorted.length - 1]?.[0] || 'Aucune donnée',
          quantity: sorted[sorted.length - 1]?.[1] || 0,
          icon: PrimeIcons.INFO_CIRCLE,
          color: 'bg-orange-50',
          iconColor: 'text-orange-600',
        },
      ],
    };
  }, [processedData, operationType, selectedRegion, selectedPointVente]);

  // Configuration du graphique
  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#4B5563',
          font: { size: 12, weight: '500' as const },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle' as const,
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        titleFont: { size: 14, weight: 'normal' as const },
        bodyFont: { size: 14, weight: '500' as const },
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6B7280', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#F3F4F6' },
        ticks: {
          color: '#6B7280',
          font: { size: 11 },
          callback: function (value: any) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          },
        },
      },
    },
    animation: { duration: 800, easing: 'easeInOutQuart' as const },
  };

  // Génération du titre dynamique
  const chartTitle = useMemo(() => {
    const baseTitle = 'Analyse des mouvements de stock';
    const operationText = operationType.toLowerCase();

    if (selectedRegion) return `${baseTitle} - ${operationText} (${selectedRegion.nom})`;
    if (selectedPointVente) return `${baseTitle} - ${operationText} (${selectedPointVente.nom})`;
    return `${baseTitle} - ${operationText}`;
  }, [operationType, selectedRegion, selectedPointVente]);

  return (
    <motion.div
      // whileHover={{ y: -3, scale: 1.02 }}
      className="bg-gradient-to-br  from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 w-full h-full"
    >
      <Card className="border-round-xl overflow-hidden w-full h-full bg-none border-none shadow-none">
        <div className="flex justify-center flex-column h-full w-full ">
          {/* En-tête moderne avec titre centré */}
          <h2 className="text-900 font-semibold text-2xl m-0 mb-2">{chartTitle}</h2>
        </div>

        <div className="p-5 pb-3 w-full gap-4">
          <FilterControls
            operationType={operationType}
            //@ts-ignore
            onOperationChange={setOperationType}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
            selectedPointVente={selectedPointVente}
            onPointVenteChange={setSelectedPointVente}
            regions={regions}
            pointsVente={pointsVente}
            userRole={userRole}
          />
        </div>
        {/* Indicateurs KPI sur une seule ligne */}
        <div className="p-5 pb-3 w-full flex-shrink-0">
          <div className="flex flex-row gap-4 flex-row w-full justify-center">
            {chartData.indicators.map((indicator, idx) => (
              <div key={idx} className="col-12 md:col-4">
                <div className={classNames(indicator.color, 'bg-opacity-50')}>
                  <KPIIndicator {...indicator} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-grow px-5 pb-5 w-full h-full">
          <div className="bg-opacity-60 border-round-lg p-3 h-full w-full border-1 border-green-100">
            <div className="relative w-full h-full " style={{ minHeight: '300px' }}>
              <Chart type="bar" data={chartData} options={chartOptions} className="min-h-[300px]" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AnalyseMouvementStockChart;
