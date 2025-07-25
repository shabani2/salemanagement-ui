'use client';
import React from 'react';
import { Chart } from 'primereact/chart';
import { ChartData, ChartOptions } from 'chart.js';

interface CustomChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: ChartData;
  options?: ChartOptions;
}

const CustomChart: React.FC<CustomChartProps> = ({ type, data, options }) => {
  return <Chart type={type} data={data} options={options} />;
};

export default CustomChart;
