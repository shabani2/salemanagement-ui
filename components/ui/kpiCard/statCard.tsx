import React from 'react';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Chart } from 'primereact/chart';
import { classNames } from 'primereact/utils';
import { PrimeIcons } from 'primereact/api';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  type: 'stock' | 'vente';
  data: number[];
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, type, data }) => {
  const isPositive = (type === 'vente' && change >= 0) || (type === 'stock' && change < 0);
  const color = isPositive ? '#16a34a' : '#dc2626';
  const iconClass = isPositive ? PrimeIcons.ARROW_UP : PrimeIcons.ARROW_DOWN;

  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data,
        fill: true,
        borderColor: color,
        backgroundColor: `${color}33`,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: { point: { radius: 0 } },
    maintainAspectRatio: false,
    responsive: true,
  };

  return (
    <Card className="w-full shadow-md rounded-2xl p-2 !bg-gray-50">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <span className="text-gray-100 text-lg">{title}</span>
          <div className="flex items-center gap-2">
            <Tag
              className="flex items-center gap-1 text-white px-2 py-1 rounded-full"
              style={{ backgroundColor: color }}
            >
              <i className={classNames('pi', iconClass)} style={{ fontSize: '0.75rem' }}></i>
              <span className="text-xs">{Math.abs(change)}%</span>
            </Tag>
            <span className="text-xl font-semibold">{value}</span>
          </div>
        </div>
        <div className="w-24 h-12 relative overflow-hidden">
          <Chart
            type="line"
            data={chartData}
            options={chartOptions}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
