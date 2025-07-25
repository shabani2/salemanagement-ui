/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Filter } from 'lucide-react';
import { MouvementStock } from '@/Models/mouvementStockType';

interface DropdownTypeFilterWithoutAllProps {
  mvtStocks: MouvementStock[];
  onChange: (filtered: any[], selected: string) => void;
}

const DropdownTypeFilterWithoutAll: React.FC<DropdownTypeFilterWithoutAllProps> = ({
  mvtStocks,
  onChange,
}) => {
  const defaultType = 'Vente';
  const [selectedType, setSelectedType] = useState<string>(defaultType);

  const mvtOptions = Array.from(new Set(mvtStocks.map((m) => m.type)))
    .filter(Boolean)
    .map((type) => ({ label: type, value: type }));

  useEffect(() => {
    const filtered = mvtStocks.filter((s) => s.type === selectedType);
    onChange(filtered, selectedType);
  }, [selectedType, mvtStocks, onChange]);

  const valueTemplate = (option: any, props: any) => (
    <div className="flex items-center gap-2 text-white">
      <Filter className="w-4 h-4" />
      <span>{option ? option.label : props.placeholder}</span>
    </div>
  );

  return (
    <div className="w-full md:w-64">
      <Dropdown
        value={selectedType}
        onChange={(e) => setSelectedType(e.value)}
        options={mvtOptions}
        optionLabel="label"
        placeholder="Type d'opération"
        className="w-full !bg-blue-700 !text-white font-semibold rounded-md border-none"
        valueTemplate={valueTemplate}
      />
    </div>
  );
};

export default DropdownTypeFilterWithoutAll;
