/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// MouvementRegionMontantChart.tsx - Version améliorée
import { MouvementStock } from '@/Models/mouvementStockType';
import { PointVente } from '@/Models/pointVenteType';
import { Region } from '@/Models/regionTypes';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const GRADIENT_STOPS = [
  ['#6366F133', '#6366F100'],
  ['#10B98133', '#10B98100'],
  ['#F59E0B33', '#F59E0B00'],
  ['#EF444433', '#EF444400'],
  ['#8B5CF633', '#8B5CF600'],
  ['#06B6D433', '#06B6D400'],
];

const MouvementRegionMontantChart: React.FC<{
  data: MouvementStock[];
  userRole: 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente';
  region?: Region;
  pointVente?: PointVente;
}> = ({ data, userRole, region, pointVente }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const operationTypes = ['Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'] as const;

  const labels = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.depotCentral) return;

      const pv = item.pointVente;
      const rg =
        item.region && typeof item.region === 'object'
          ? item.region
          : pv?.region && typeof pv.region === 'object'
            ? pv.region
            : undefined;

      if (userRole === 'SuperAdmin' && rg) {
        set.add(rg.nom);
      } else if (userRole === 'AdminRegion' && region && rg?._id === region._id && pv) {
        set.add(pv.nom);
      } else if (userRole === 'AdminPointVente' && pointVente && pv?._id === pointVente._id) {
        set.add(pv.nom);
      }
    });
    return Array.from(set);
  }, [data, userRole, region, pointVente]);

  const chartData = useMemo(() => {
    const datasets = operationTypes.map((type, idx) => {
      const dataPoints = labels.map((label) => {
        const sum = data
          .filter((item) => {
            if (item.depotCentral || item.type !== type) return false;

            const pv = item.pointVente;
            const rg =
              item.region && typeof item.region === 'object'
                ? item.region
                : pv?.region && typeof pv.region === 'object'
                  ? pv.region
                  : undefined;

            if (userRole === 'SuperAdmin') return rg?.nom === label;
            if (userRole === 'AdminRegion') return pv?.nom === label && rg?._id === region?._id;
            if (userRole === 'AdminPointVente')
              return pv?.nom === label && pv?._id === pointVente?._id;

            return false;
          })
          .reduce((acc, item) => acc + Number(item.montant || 0), 0);
        return sum;
      });

      return {
        label: type,
        data: dataPoints,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return;

          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, GRADIENT_STOPS[idx % GRADIENT_STOPS.length][0]);
          gradient.addColorStop(1, GRADIENT_STOPS[idx % GRADIENT_STOPS.length][1]);
          return gradient;
        },
        borderColor: COLORS[idx % COLORS.length],
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
      };
    });
    return {
      labels,
      datasets,
    };
  }, [operationTypes, labels, data, userRole, region?._id, pointVente?._id]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#4B5563',
          font: {
            weight: '600',
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        titleFont: {
          weight: 'bold',
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        borderColor: '#E5E7EB',
        borderWidth: 1,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString()} FC`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            weight: '500',
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: '#6B7280',

          callback: (value: any) => `${value.toLocaleString()} FC`,
        },
      },
    },
  };

  const title = useMemo(() => {
    if (userRole === 'SuperAdmin') return 'Analyse Financière par Région';
    if (userRole === 'AdminRegion') return `Performance Financière - ${region?.nom}`;
    if (userRole === 'AdminPointVente') return `Activité Financière - ${pointVente?.nom}`;
    return 'Analyse des Mouvements Financiers';
  }, [userRole, region, pointVente]);

  const indicators = useMemo(() => {
    let total = 0;
    const amountsByLabel: Record<string, number> = {};
    chartData.labels.forEach((label, idx) => {
      let sum = 0;
      chartData.datasets.forEach((ds) => (sum += ds.data[idx] as number));
      amountsByLabel[label] = sum;
      total += sum;
    });
    const avg = total / Math.max(chartData.labels.length, 1);
    const maxRegion = Object.entries(amountsByLabel).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ['', 0]
    );
    let evolution = 0;
    if (chartData.labels.length > 1) {
      const firstSum = chartData.datasets.reduce((acc, ds) => acc + (ds.data[0] as number), 0);
      const lastSum = chartData.datasets.reduce(
        (acc, ds) => acc + (ds.data[chartData.labels.length - 1] as number),
        0
      );
      if (firstSum !== 0) {
        evolution = ((lastSum - firstSum) / firstSum) * 100;
      }
    }
    return { total, avg, maxRegion: maxRegion[0], evolution };
  }, [chartData]);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
    >
      <div className="w-full rounded-xl shadow-lg p-5 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Évolution des flux financiers sur la période
            </p>
          </div>
          <div className="mt-3 md:mt-0">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>
              Données en temps réel
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                <DollarSign size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Montant</p>
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
                  Moyenne par {userRole === 'SuperAdmin' ? 'région' : 'point'}
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
                <p className="text-sm text-gray-600">Performance Max</p>
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
                <p className="text-sm text-gray-600">Évolution Totale</p>
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

        <div className="relative" style={{ height: '340px' }}>
          <Line
            data={chartData}
            //@ts-ignore
            options={options}
          />
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Données mises à jour en temps réel | FC = Francs Congolais
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MouvementRegionMontantChart;
