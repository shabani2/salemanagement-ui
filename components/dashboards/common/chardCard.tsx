import React from 'react';
import { Card } from 'primereact/card';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
  return (
    <Card title={title} className="shadow-md rounded-lg h-full p-5">
      {children}
    </Card>
  );
};

export default ChartCard;
