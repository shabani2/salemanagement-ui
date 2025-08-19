/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// RegionDistributionPieChart.tsx
import React, { useMemo, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PieChart, Filter, ChevronDown } from 'react-feather';
import { motion } from 'framer-motion';

import type { MouvementStock } from '@/Models/mouvementStockType';
import type { PointVente } from '@/Models/pointVenteType';
import type { Region } from '@/Models/regionTypes';

ChartJS.register(ArcElement, Tooltip, Legend);

/* -------------------------------- Helpers -------------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toNumber = (v: unknown, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
const getRegionObj = (m: MouvementStock): Region | undefined => {
  const rg = m?.region as any;
  if (rg && typeof rg === 'object') return rg as Region;
  const pv: any = m?.pointVente;
  if (pv?.region && typeof pv.region === 'object') return pv.region as Region;
  return undefined;
};
const getPvObj = (m: MouvementStock): PointVente | undefined => {
  const pv = m?.pointVente as any;
  return pv && typeof pv === 'object' ? (pv as PointVente) : undefined;
};

/* ------------------------------ Constantes UI ----------------------------- */
const COLORS = [
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#F97316',
  '#0EA5E9',
  '#84CC16',
];

type Role = 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente';

interface Props {
  data: MouvementStock[]; // déjà filtré par dateFrom/dateTo + autres filtres au niveau du dashboard
  userRole: Role;
  region?: Region; // si AdminRegion, fourni par le dashboard
  pointVente?: PointVente; // si AdminPointVente, fourni par le dashboard
}

const RegionDistributionPieChart: React.FC<Props> = ({ data, userRole, region, pointVente }) => {
  const [selectedOperationType, setSelectedOperationType] = useState<string>('Tous');
  const operationTypes = ['Tous', 'Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'];

  const computed = useMemo(() => {
    // Agrégation montant par "clé" d’affichage selon le rôle
    // SuperAdmin: répartition par Région
    // AdminRegion: répartition par Points de Vente de la région
    // AdminPointVente: répartition sur un seul PV → on garde le libellé PV (camembert 1 part possible)
    const sums: Record<string, number> = {};

    asArray<MouvementStock>(data).forEach((m) => {
      if (m.depotCentral) return;

      if (selectedOperationType !== 'Tous' && m.type !== selectedOperationType) return;

      const rg = getRegionObj(m);
      const pv = getPvObj(m);

      let key: string | null = null;
      if (userRole === 'SuperAdmin') {
        key = rg?.nom ?? null;
      } else if (userRole === 'AdminRegion') {
        if (!region || !rg || rg._id !== region._id) return;
        key = pv?.nom ?? null;
      } else if (userRole === 'AdminPointVente') {
        if (!pointVente || !pv || pv._id !== pointVente._id) return;
        key = pv?.nom ?? null;
      }

      if (!key) return;

      sums[key] = (sums[key] || 0) + toNumber(m.montant, 0);
    });

    const labels = Object.keys(sums);
    const values = labels.map((k) => sums[k]);
    const total = values.reduce((a, b) => a + b, 0);

    return { labels, values, total };
  }, [data, userRole, region?._id, pointVente?._id, selectedOperationType]);

  const chartData = useMemo(
    () => ({
      labels: computed.labels,
      datasets: [
        {
          data: computed.values,
          backgroundColor: computed.labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 15,
          hoverBorderColor: '#fff',
          hoverBorderWidth: 3,
        },
      ],
    }),
    [computed.labels, computed.values]
  );

  const title = useMemo(() => {
    if (userRole === 'SuperAdmin') return 'Répartition des montants par région';
    if (userRole === 'AdminRegion') return `Répartition des montants — ${region?.nom ?? 'Région'}`;
    if (userRole === 'AdminPointVente')
      return `Répartition des montants — ${pointVente?.nom ?? 'Point de vente'}`;
    return 'Répartition des Montants';
  }, [userRole, region?.nom, pointVente?.nom]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: '#4B5563',
            font: { weight: '500' as const },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle' as const,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const label = ctx.label || '';
              const value = toNumber(ctx.raw, 0);
              const p = computed.total > 0 ? Math.round((value / computed.total) * 100) : 0;
              return `${label}: ${value.toLocaleString()} FC (${p}%)`;
            },
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1F2937',
          bodyColor: '#374151',
          titleFont: { weight: 'bold' as const, size: 14 },
          bodyFont: { size: 13 },
          padding: 12,
          borderColor: '#E5E7EB',
          borderWidth: 1,
          displayColors: true,
          usePointStyle: true,
        },
      },
    }),
    [computed.total]
  );

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <div className="p-2 bg-indigo-100 rounded-lg">
            <PieChart size={20} className="text-indigo-600" />
          </div>
        </div>

        {/* Filtre type d'opération */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
            <Filter size={16} className="mr-2 text-gray-500" />
            Filtrer par type d&apos;opération
          </label>
          <div className="relative">
            <select
              value={selectedOperationType}
              onChange={(e) => setSelectedOperationType(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {operationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div className="relative flex-grow" style={{ minHeight: 250 }}>
          {chartData.labels.length > 0 ? (
            <Pie data={chartData} /* @ts-ignore */ options={options} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <PieChart size={40} />
              <p className="mt-2 text-center">
                Aucune donnée disponible
                <br />
                pour les filtres sélectionnés
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="text-base font-bold text-indigo-700">
              {computed.total.toLocaleString()} FC
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Type sélectionné:</span>
            <span className="text-sm font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">
              {selectedOperationType}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {chartData.labels.length}{' '}
            {userRole === 'SuperAdmin' ? 'région(s)' : 'point(s) de vente'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default RegionDistributionPieChart;
