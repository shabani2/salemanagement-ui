/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// MouvementRegionMontantChart.tsx - Version synchronisée avec le dashboard (time-filter friendly)

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ArrowUp, ArrowDown, BarChart2, DollarSign, TrendingUp, Award } from 'react-feather';

import type { MouvementStock } from '@/Models/mouvementStockType';
import type { PointVente } from '@/Models/pointVenteType';
import type { Region } from '@/Models/regionTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

/* ----------------------------- Utils ----------------------------- */

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const GRADIENT_STOPS = [
  ['#6366F133', '#6366F100'],
  ['#10B98133', '#10B98100'],
  ['#F59E0B33', '#F59E0B00'],
  ['#EF444433', '#EF444400'],
  ['#8B5CF633', '#8B5CF600'],
  ['#06B6D433', '#06B6D400'],
] as const;

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toNumber = (v: unknown, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
const idOf = (obj: any | undefined | null) =>
  obj && typeof obj === 'object' ? (obj._id as string | undefined) : undefined;

/** Récupère Region (si présente directement ou via pointVente.region) */
const getRegionObj = (item: MouvementStock): Region | undefined => {
  const direct = item?.region as any;
  if (direct && typeof direct === 'object') return direct as Region;
  const pv = item?.pointVente as any;
  const pvRegion = pv?.region;
  if (pvRegion && typeof pvRegion === 'object') return pvRegion as Region;
  return undefined;
};

/** Récupère PointVente si peuplé */
const getPvObj = (item: MouvementStock): PointVente | undefined => {
  const pv = item?.pointVente as any;
  if (pv && typeof pv === 'object') return pv as PointVente;
  return undefined;
};

type Role = 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente';

type Props = {
  data: MouvementStock[]; // déjà filtré par dateFrom/dateTo côté dashboard
  userRole: Role;
  region?: Region; // requis si AdminRegion (fourni par le dashboard)
  pointVente?: PointVente; // requis si AdminPointVente
  /** Permet de limiter les séries si besoin. Par défaut on affiche toutes. */
  enabledTypes?: Array<'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande'>;
};

const MouvementRegionMontantChart: React.FC<Props> = ({
  data,
  userRole,
  region,
  pointVente,
  enabledTypes,
}) => {
  // Types d’opérations (dash utilise tous pour ce widget)
  const operationTypes = (
    enabledTypes && enabledTypes.length > 0
      ? enabledTypes
      : (['Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'] as const)
  ).filter(Boolean);

  /* ----------------------------- Labels (x-axis) ----------------------------- */
  // SuperAdmin  -> labels = régions présentes dans data (hors dépôt central)
  // AdminRegion -> labels = points de vente de la région
  // AdminPV     -> label unique = nom du PV
  const labels = useMemo(() => {
    const set = new Set<string>();
    asArray<MouvementStock>(data).forEach((item) => {
      if (item.depotCentral) return; // on exclut le dépôt central pour ce graphe

      const rg = getRegionObj(item);
      const pv = getPvObj(item);

      if (userRole === 'SuperAdmin' && rg?.nom) {
        set.add(rg.nom);
      } else if (userRole === 'AdminRegion' && region && idOf(rg) === region._id && pv?.nom) {
        set.add(pv.nom);
      } else if (userRole === 'AdminPointVente' && pointVente && idOf(pv) === pointVente._id) {
        // pour un PV, on force un label unique et stable
        set.add(pointVente.nom ?? pv?.nom ?? 'Point de vente');
      }
    });
    const arr = Array.from(set);
    // fallback : éviter un chart vide si data filtrée mais aucun label détecté
    return arr.length > 0
      ? arr
      : userRole === 'AdminPointVente'
        ? [pointVente?.nom ?? 'Point de vente']
        : userRole === 'AdminRegion'
          ? ['(aucun PV)']
          : ['(aucune région)'];
    //@ts-ignore
  }, [data, userRole, region?._id, pointVente?._id, pointVente?.nom]);

  /* ----------------------------- Datasets (y-values) ----------------------------- */
  const chartData = useMemo(() => {
    const datasets = operationTypes.map((type, idx) => {
      const points = labels.map((label) => {
        const sum = asArray<MouvementStock>(data)
          .filter((item) => {
            if (item.depotCentral || item.type !== type) return false;

            const rg = getRegionObj(item);
            const pv = getPvObj(item);

            if (userRole === 'SuperAdmin') return rg?.nom === label;
            if (userRole === 'AdminRegion') return idOf(rg) === region?._id && pv?.nom === label;
            if (userRole === 'AdminPointVente')
              return idOf(pv) === pointVente?._id && label === (pointVente?.nom ?? pv?.nom);
            return false;
          })
          .reduce((acc, it) => acc + toNumber(it.montant, 0), 0);

        return sum;
      });

      return {
        label: type,
        data: points,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context?.chart;
          const { ctx, chartArea } = chart || {};
          if (!chartArea) return undefined;
          const grad = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          const pair = GRADIENT_STOPS[idx % GRADIENT_STOPS.length];
          grad.addColorStop(0, pair[0]);
          grad.addColorStop(1, pair[1]);
          return grad;
        },
        borderColor: COLORS[idx % COLORS.length],
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
      };
    });

    return { labels, datasets };
  }, [operationTypes, labels, data, userRole, region?._id, pointVente?._id, pointVente?.nom]);

  /* ----------------------------- Options Chart.js ----------------------------- */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#4B5563',
          font: { weight: '600' as const },
          usePointStyle: true,
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        titleFont: { weight: 'bold' as const, size: 14 },
        bodyFont: { size: 13 },
        padding: 12,
        borderColor: '#E5E7EB',
        borderWidth: 1,
        usePointStyle: true,
        callbacks: {
          label: (ctx: any) =>
            ` ${ctx.dataset.label}: ${toNumber(ctx.parsed.y).toLocaleString()} FC`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6B7280', font: { weight: '500' as const } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: {
          color: '#6B7280',
          callback: (value: any) => `${toNumber(value).toLocaleString()} FC`,
        },
      },
    },
  };

  /* ----------------------------- Indicateurs ----------------------------- */
  const title = useMemo(() => {
    if (userRole === 'SuperAdmin') return 'Analyse financière par région';
    if (userRole === 'AdminRegion') return `Performance financière — ${region?.nom ?? 'Région'}`;
    if (userRole === 'AdminPointVente') return `Activité financière — ${pointVente?.nom ?? 'PV'}`;
    return 'Analyse des mouvements financiers';
  }, [userRole, region?.nom, pointVente?.nom]);

  const indicators = useMemo(() => {
    let total = 0;
    const byLabel: Record<string, number> = {};
    chartData.labels.forEach((label, i) => {
      const sum = chartData.datasets.reduce(
        (acc, ds) => acc + toNumber((ds.data as number[])[i]),
        0
      );
      byLabel[label] = sum;
      total += sum;
    });
    const avg = chartData.labels.length ? total / chartData.labels.length : 0;
    const [maxLabel, maxVal] = Object.entries(byLabel).reduce<[string, number]>(
      (acc, cur) => (cur[1] > acc[1] ? [cur[0], cur[1]] : acc),
      ['', 0]
    ) || ['', 0];

    let evolution = 0;
    if (chartData.labels.length > 1) {
      const firstSum = chartData.datasets.reduce(
        (acc, ds) => acc + toNumber((ds.data as number[])[0]),
        0
      );
      const lastSum = chartData.datasets.reduce(
        (acc, ds) => acc + toNumber((ds.data as number[])[chartData.labels.length - 1]),
        0
      );
      if (firstSum !== 0) evolution = ((lastSum - firstSum) / firstSum) * 100;
    }

    return { total, avg, maxRegion: maxLabel || '(n/a)', evolution, maxVal };
  }, [chartData]);

  /* ----------------------------- Render ----------------------------- */
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
    >
      <div className="w-full rounded-xl shadow-lg p-5 border border-gray-100">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Montants agrégés par entité visible (selon rôle)
            </p>
          </div>
          <div className="mt-3 md:mt-0">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>
              Données filtrées (temps & rôle)
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <DollarSign size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total montant</p>
                <p className="text-lg font-bold text-gray-800">
                  {indicators.total.toLocaleString()} FC
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                <BarChart2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Moyenne par {userRole === 'SuperAdmin' ? 'région' : 'point de vente'}
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {indicators.avg.toLocaleString()} FC
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <Award size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Meilleure performance</p>
                <p className="text-lg font-bold text-gray-800 truncate">{indicators.maxRegion}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-100">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-100 rounded-lg mr-3">
                <TrendingUp size={20} className="text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Évolution totale</p>
                <div className="flex items-center">
                  {indicators.evolution >= 0 ? (
                    <ArrowUp size={16} className="text-green-500 mr-1" />
                  ) : (
                    <ArrowDown size={16} className="text-red-500 mr-1" />
                  )}
                  <p
                    className={`text-lg font-bold ${indicators.evolution >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {Math.abs(indicators.evolution).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative" style={{ height: '340px' }}>
          <Line
            data={chartData}
            // @ts-expect-error - compat: external lib types mismatch
            options={options}
          />
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Lecture basée sur les mouvements reçus (filtrés par période côté dashboard) • FC = Franc
            congolais
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MouvementRegionMontantChart;
