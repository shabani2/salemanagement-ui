/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { CalendarDays } from 'lucide-react';

interface DropdownTimeFilterProps {
  data: any[];
  onChange: (filtered: any[], range: string | null) => void;
}

const DropdownTimeFilter: React.FC<DropdownTimeFilterProps> = ({ data, onChange }) => {
  const [selectedRange, setSelectedRange] = useState<string>('Tout');

  const timeOptions = [
    { label: 'Tout', value: 'Tout' },
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Cette semaine', value: 'week' },
    { label: 'Ce mois', value: 'month' },
    { label: 'Cette année', value: 'year' },
  ];

  const filterByTime = (range: string) => {
    const now = new Date();

    return data.filter((item) => {
      const createdAt = new Date(item.createdAt);
      if (range === 'today') {
        return createdAt.toDateString() === now.toDateString();
      }
      if (range === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return createdAt >= startOfWeek && createdAt <= endOfWeek;
      }
      if (range === 'month') {
        return (
          createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
        );
      }
      if (range === 'year') {
        return createdAt.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  useEffect(() => {
    if (selectedRange === 'Tout') {
      onChange(data, null);
    } else {
      const filtered = filterByTime(selectedRange);
      onChange(filtered, selectedRange);
    }
  }, [selectedRange, data]);

  const valueTemplate = (option: any, props: any) => (
    <div className="flex items-center gap-2 text-white">
      <CalendarDays className="w-4 h-4" />
      <span>{option ? option.label : props.placeholder}</span>
    </div>
  );

  return (
    <div className="w-full md:w-64">
      <Dropdown
        value={selectedRange}
        onChange={(e) => setSelectedRange(e.value)}
        options={timeOptions}
        optionLabel="label"
        placeholder="Filtrer par période"
        className="w-full !bg-green-700 !text-gray-100 font-semibold rounded-md border-none"
        showClear
        valueTemplate={valueTemplate}
      />
    </div>
  );
};

export default DropdownTimeFilter;
