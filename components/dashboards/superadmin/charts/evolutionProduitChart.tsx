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
import type { MouvementStock } from '@/Models/mouvementStockType';
import type { UserRole } from '@/lib/utils';
import type { Region } from '@/Models/regionTypes';
import type { PointVente } from '@/Models/pointVenteType';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { motion } from 'framer-motion';

/* ----------------------------- Constantes ----------------------------- */
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
] as const;

/* ----------------------------- Helpers ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toNumber = (v: unknown, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
const idOf = (obj: any | undefined | null) =>
  obj && typeof obj === 'object' ? (obj._id as string | undefined) : undefined;

const getRegionObj = (item: MouvementStock): Region | undefined => {
  const direct = item?.region as any;
  if (direct && typeof direct === 'object') return direct as Region;
  const pv = item?.pointVente as any;
  const pvRegion = pv?.region;
  if (pvRegion && typeof pvRegion === 'object') return pvRegion as Region;
  return undefined;
};

const getPvObj = (item: MouvementStock): PointVente | undefined => {
  const pv = item?.pointVente as any;
  return pv && typeof pv === 'object' ? (pv as PointVente) : undefined;
};

/* ----------------------------- KPI card ----------------------------- */
const KPIIndicator: React.FC<{
  label: string;
  value: string;
  quantity: number;
  icon: string;
  color: string; // bg-...-50
  iconColor: string; // text-...
}> = ({ label, value, quantity, icon, color, iconColor }) => (
  <div
    className={classNames(
      'bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden',
      'border border-green-100 transition-all duration-300 p-5'
    )}
  >
    <div className="flex items-center gap-4">
      <div
        className={classNames(
          'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
          color
        )}
      >
        <i className={classNames(icon, iconColor, 'text-2xl')}></i>
      </div>
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-gray-900">{quantity.toLocaleString()}</span>
          <span className="text-sm text-gray-400 truncate" style={{ maxWidth: 140 }}>
            {value}
          </span>
        </div>
      </div>
    </div>
  </div>
);

/* ----------------------------- Filtres UI ----------------------------- */
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

  const showRegionDd = userRole === 'SuperAdmin';
  const showPvDd = userRole === 'SuperAdmin' || userRole === 'AdminRegion';
  const disablePvDd = userRole === 'SuperAdmin' && !selectedRegion;

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <Dropdown
        value={operationType}
        options={OPERATION_TYPES as any}
        optionLabel="label"
        onChange={(e) => onOperationChange(e.value)}
        placeholder="Type d'opération"
        className="min-w-[200px]"
        itemTemplate={(opt: any) => (
          <div className="flex items-center gap-2">
            <i className={opt.icon}></i>
            <span>{opt.label}</span>
          </div>
        )}
      />

      {showRegionDd && (
        <Dropdown
          value={selectedRegion}
          options={[{ nom: 'Toutes les régions', _id: 'all' } as any, ...regions]}
          optionLabel="nom"
          onChange={(e) => {
            onRegionChange(e.value?._id === 'all' ? null : e.value);
            onPointVenteChange(null);
          }}
          placeholder="Sélectionner une région"
          className="min-w-[220px]"
          itemTemplate={(opt: any) => (
            <div>{opt._id === 'all' ? 'Toutes les régions' : opt.nom}</div>
          )}
        />
      )}

      {showPvDd && (
        <Dropdown
          value={selectedPointVente}
          options={[{ nom: 'Tous les points de vente', _id: 'all' } as any, ...filteredPointVentes]}
          optionLabel="nom"
          onChange={(e) => onPointVenteChange(e.value?._id === 'all' ? null : e.value)}
          placeholder="Sélectionner un point de vente"
          className="min-w-[240px]"
          disabled={disablePvDd}
          itemTemplate={(opt: any) => (
            <div>{opt._id === 'all' ? 'Tous les points de vente' : opt.nom}</div>
          )}
        />
      )}
    </div>
  );
};

/* ----------------------------- Composant principal ----------------------------- */
const AnalyseMouvementStockChart: React.FC<{
  data: MouvementStock[]; // déjà filtré par dateFrom/dateTo dans le dashboard
  userRole: UserRole;
  initialRegion?: Region;
  initialPointVente?: PointVente;
}> = ({ data, userRole, initialRegion, initialPointVente }) => {
  const dispatch: AppDispatch = useDispatch();
  const regions = useSelector(selectAllRegions);
  const pointsVente = useSelector(selectAllPointVentes);

  // Chargement référentiels si absents localement
  useEffect(() => {
    if (!regions?.length) dispatch(fetchRegions());
    if (!pointsVente?.length) dispatch(fetchPointVentes());
  }, [dispatch, regions?.length, pointsVente?.length]);

  const [operationType, setOperationType] = useState<
    'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande'
  >('Vente');

  // Forcer les sélections selon rôle
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(
    userRole === 'AdminRegion' ? (initialRegion ?? null) : (initialRegion ?? null)
  );
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(
    userRole === 'AdminPointVente' ? (initialPointVente ?? null) : (initialPointVente ?? null)
  );

  // Si AdminRegion/AdminPV : verrouiller la cohérence des sélections
  useEffect(() => {
    if (
      userRole === 'AdminRegion' &&
      initialRegion &&
      (!selectedRegion || selectedRegion._id !== initialRegion._id)
    ) {
      setSelectedRegion(initialRegion);
    }
    if (
      userRole === 'AdminPointVente' &&
      initialPointVente &&
      (!selectedPointVente || selectedPointVente._id !== initialPointVente._id)
    ) {
      setSelectedPointVente(initialPointVente);
    }
  }, [userRole, initialRegion?._id, initialPointVente?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync PV si la région change (et que le PV ne lui appartient pas)
  useEffect(() => {
    if (selectedRegion && selectedPointVente) {
      const pvRegionId =
        typeof selectedPointVente.region === 'string'
          ? selectedPointVente.region
          : selectedPointVente.region?._id;
      if (pvRegionId && pvRegionId !== selectedRegion._id) {
        setSelectedPointVente(null);
      }
    }
  }, [selectedRegion, selectedPointVente]);

  /* ----------------------------- Traitement des données ----------------------------- */
  type Grouped = Record<string /* produit */, Record<string /* label */, number /* quantite */>>;

  // Détermine le "label" d'agrégation (x-axis) pour un mouvement
  const labelFor = (item: MouvementStock): string | null => {
    const rg = getRegionObj(item);
    const pv = getPvObj(item);

    if (userRole === 'SuperAdmin') {
      // Si une région est sélectionnée -> par PVs de cette région
      if (selectedRegion) {
        return idOf(rg) === selectedRegion._id ? (pv?.nom ?? null) : null;
      }
      // Sinon par régions
      return rg?.nom ?? null;
    }

    if (userRole === 'AdminRegion') {
      // toujours par PVs de la région
      return pv?.nom ?? null;
    }

    if (userRole === 'AdminPointVente') {
      // label unique : nom du PV
      return selectedPointVente?.nom ?? pv?.nom ?? 'Point de vente';
    }

    return null;
  };

  const filtered = useMemo(() => {
    return asArray<MouvementStock>(data).filter((item) => {
      if (item.depotCentral) return false;
      if (item.type !== operationType) return false;

      const rg = getRegionObj(item);
      const pv = getPvObj(item);

      if (selectedPointVente && idOf(pv) !== selectedPointVente._id) return false;
      if (selectedRegion && idOf(rg) !== selectedRegion._id) return false;

      return true;
    });
  }, [data, operationType, selectedRegion?._id, selectedPointVente?._id]);

  const processedData = useMemo(() => {
    const grouped: Grouped = {};
    asArray<MouvementStock>(filtered).forEach((item) => {
      const produit = item?.produit?.nom ?? '(sans nom)';
      const label = labelFor(item);
      if (!label) return;
      if (!grouped[produit]) grouped[produit] = {};
      if (!grouped[produit][label]) grouped[produit][label] = 0;
      grouped[produit][label] += toNumber(item.quantite, 0);
    });
    return grouped;
  }, [filtered]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----------------------------- Préparation chart ----------------------------- */
  const chartData = useMemo(() => {
    const labelSet = new Set<string>();
    const productTotals: Record<string, number> = {};

    Object.values(processedData).forEach((map) => Object.keys(map).forEach((k) => labelSet.add(k)));
    const labels = Array.from(labelSet);

    const datasets = Object.entries(processedData).map(([product, map], idx) => {
      const serie = labels.map((k) => toNumber(map[k], 0));
      productTotals[product] = serie.reduce((a, b) => a + b, 0);
      return {
        label: product,
        backgroundColor: COLORS[idx % COLORS.length],
        borderColor: COLORS[idx % COLORS.length],
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
        data: serie,
      };
    });

    const sorted = Object.entries(productTotals).sort((a, b) => b[1] - a[1]);

    const context = selectedRegion
      ? `dans ${selectedRegion.nom}`
      : selectedPointVente
        ? `au point de vente ${selectedPointVente.nom}`
        : '';

    const operationText = operationType.toLowerCase();

    return {
      labels,
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
          label: `Produit médian ${operationText} ${context}`,
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
            return `${context.dataset.label}: ${toNumber(context.parsed.y).toLocaleString()}`;
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

  const chartTitle = useMemo(() => {
    const baseTitle = 'Analyse des mouvements de stock (quantités)';
    const op = operationType.toLowerCase();
    if (userRole === 'AdminPointVente') {
      return `${baseTitle} - ${op} (${selectedPointVente?.nom ?? 'Point de vente'})`;
    }
    if (selectedRegion) return `${baseTitle} - ${op} (${selectedRegion.nom})`;
    if (selectedPointVente) return `${baseTitle} - ${op} (${selectedPointVente.nom})`;
    return `${baseTitle} - ${op}`;
  }, [operationType, selectedRegion, selectedPointVente, userRole]);

  return (
    <motion.div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300 w-full h-full">
      <Card className="border-round-xl overflow-hidden w-full h-full bg-none border-none shadow-none">
        <div className="flex justify-center flex-col h-full w-full">
          <h2 className="text-900 font-semibold text-2xl m-0 mb-2 text-center">{chartTitle}</h2>
        </div>

        <div className="p-5 pb-3 w-full gap-4">
          <FilterControls
            operationType={operationType}
            //@ts-ignore
            onOperationChange={setOperationType}
            selectedRegion={
              userRole === 'AdminRegion' ? (initialRegion ?? selectedRegion) : selectedRegion
            }
            onRegionChange={userRole === 'AdminRegion' ? () => {} : setSelectedRegion}
            selectedPointVente={
              userRole === 'AdminPointVente'
                ? (initialPointVente ?? selectedPointVente)
                : selectedPointVente
            }
            onPointVenteChange={userRole === 'AdminPointVente' ? () => {} : setSelectedPointVente}
            regions={regions}
            pointsVente={pointsVente}
            userRole={userRole}
          />
        </div>

        {/* KPI */}
        <div className="p-5 pb-3 w-full flex-shrink-0">
          <div className="flex flex-row gap-4 w-full justify-center">
            {chartData.indicators.map((it: any, idx: number) => (
              <div key={idx} className="max-w-[360px] w-full">
                <div className={classNames(it.color, 'bg-opacity-50')}>
                  <KPIIndicator {...it} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-grow px-5 pb-5 w-full h-full">
          <div className="bg-opacity-60 rounded-lg p-3 h-full w-full border border-green-100">
            <div className="relative w-full h-full" style={{ minHeight: 300 }}>
              <Chart
                type="bar"
                data={chartData as any}
                options={chartOptions as any}
                className="min-h-[300px]"
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default AnalyseMouvementStockChart;
