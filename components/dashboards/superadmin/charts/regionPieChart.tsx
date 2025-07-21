/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// RegionDistributionPieChart.tsx
import { MouvementStock } from '@/Models/mouvementStockType';
import { PointVente } from '@/Models/pointVenteType';
import { Region } from '@/Models/regionTypes';
import React, { useState, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PieChart, Filter } from 'react-feather';
import { ChevronDown } from 'react-feather';
import { motion } from 'framer-motion';

ChartJS.register(ArcElement, Tooltip, Legend);

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

const RegionDistributionPieChart: React.FC<{
  data: MouvementStock[];
  userRole: 'SuperAdmin' | 'AdminRegion' | 'AdminPointVente';
  region?: Region;
  pointVente?: PointVente;
}> = ({ data, userRole, region, pointVente }) => {
  const [selectedOperationType, setSelectedOperationType] = useState<string>('Tous');
  const operationTypes = ['Tous', 'Entrée', 'Sortie', 'Vente', 'Livraison', 'Commande'];

  const chartData = useMemo(() => {
    const distribution: Record<string, number> = {};

    data.forEach((item) => {
      if (item.depotCentral) return;

      // Filtrer par type d'opération
      if (selectedOperationType !== 'Tous' && item.type !== selectedOperationType) return;

      const pv = item.pointVente;
      const rg =
        item.region && typeof item.region === 'object'
          ? item.region
          : pv?.region && typeof pv.region === 'object'
            ? pv.region
            : undefined;

      let key = '';
      if (userRole === 'SuperAdmin' && rg) {
        key = rg.nom;
      } else if (userRole === 'AdminRegion' && region && rg?._id === region._id && pv) {
        key = pv.nom;
      } else if (userRole === 'AdminPointVente' && pointVente && pv?._id === pointVente._id) {
        key = pv.nom;
      }

      if (key) {
        distribution[key] = (distribution[key] || 0) + Number(item.montant || 0);
      }
    });

    const labels = Object.keys(distribution);
    const values = Object.values(distribution);
    const total = values.reduce((sum, val) => sum + val, 0);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 15,
          hoverBorderColor: '#fff',
          hoverBorderWidth: 3,
        },
      ],
      total,
    };
  }, [data, userRole, region, pointVente, selectedOperationType]);

  const title = useMemo(() => {
    if (userRole === 'SuperAdmin') return 'Répartition par Région';
    if (userRole === 'AdminRegion') return `Répartition - ${region?.nom}`;
    if (userRole === 'AdminPointVente') return `Répartition - ${pointVente?.nom}`;
    return 'Répartition des Montants';
  }, [userRole, region, pointVente]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#4B5563',
          font: {
            weight: '500',
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = Math.round((value / chartData.total) * 100);
            return `${label}: ${value.toLocaleString()} FC (${percentage}%)`;
          },
        },
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
        displayColors: true,
        usePointStyle: true,
      },
    },
  };

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

        {/* Filtre sur toute la largeur sous le titre */}
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        <div className="relative flex-grow" style={{ minHeight: '250px' }}>
          {chartData.labels.length > 0 ? (
            <Pie
              data={chartData}
              //@ts-ignore
              options={options}
            />
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
              {chartData.total.toLocaleString()} FC
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Type sélectionné:</span>
            <span className="text-sm font-medium text-gray-800 bg-gray-100 px-2 py-1 rounded">
              {selectedOperationType}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {Object.keys(chartData.labels).length}{' '}
            {userRole === 'SuperAdmin' ? 'régions' : 'points'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default RegionDistributionPieChart;
