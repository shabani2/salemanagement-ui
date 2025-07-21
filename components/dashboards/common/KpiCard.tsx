import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon?: React.ElementType;
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
  trend?: number;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  format = 'number',
  currency = 'FC',
  trend = 0,
  description,
}) => {
  // Formater la valeur avec séparation des milliers et décimales
  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      const formatter = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: format === 'percent' ? 2 : 0,
      });

      const parts = formatter.formatToParts(value);

      switch (format) {
        case 'currency':
          return (
            <div className="flex items-baseline">
              {parts.map((part, index) => (
                <span
                  key={index}
                  className={
                    part.type === 'group'
                      ? 'text-green-700'
                      : part.type === 'decimal'
                        ? 'text-sm text-green-600'
                        : 'text-green-800'
                  }
                >
                  {part.value}
                </span>
              ))}
              <span className="ml-1 text-sm text-green-600">{currency}</span>
            </div>
          );

        case 'percent':
          return (
            <div className="flex items-baseline">
              {parts.map((part, index) => (
                <span
                  key={index}
                  className={
                    part.type === 'group'
                      ? 'text-green-700'
                      : part.type === 'decimal'
                        ? 'text-sm text-green-600'
                        : 'text-green-800'
                  }
                >
                  {part.value}
                </span>
              ))}
              <span className="ml-1 text-sm text-green-600">%</span>
            </div>
          );

        default:
          return (
            <div className="flex items-baseline">
              {parts.map((part, index) => (
                <span
                  key={index}
                  className={
                    part.type === 'group'
                      ? 'text-green-700'
                      : part.type === 'decimal'
                        ? 'text-sm text-green-600'
                        : 'text-green-800'
                  }
                >
                  {part.value}
                </span>
              ))}
            </div>
          );
      }
    }
    return <span className="text-green-800">{value}</span>;
  }, [value, format, currency]);

  // Déterminer la couleur en fonction de la tendance
  const trendColor =
    trend > 0
      ? 'bg-green-100 text-green-800'
      : trend < 0
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800';
  const trendIcon = trend > 0 ? '▲' : trend < 0 ? '▼' : '';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg overflow-hidden border border-green-100 transition-all duration-300"
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                {title}
              </h3>

              {(trend !== 0 || trendIcon) && (
                <span className={`${trendColor} text-xs font-medium px-2 py-1 rounded-full`}>
                  {trendIcon} {Math.abs(trend).toFixed(1)}%
                </span>
              )}
            </div>

            <div className="mt-2 flex items-end">
              <div className="text-2xl font-bold text-green-900">{formattedValue}</div>
            </div>

            {description && <p className="mt-1 text-xs text-green-600">{description}</p>}
          </div>

          {Icon && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl ml-3">
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Barre de progression subtile */}
      <div className="h-1 w-full bg-green-100 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000`}
          style={{ width: `${Math.min(Math.abs(trend) + 30, 100)}%` }}
        />
      </div>
    </motion.div>
  );
};

export default KpiCard;
