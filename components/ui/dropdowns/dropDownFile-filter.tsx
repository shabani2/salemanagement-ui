/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Filter } from 'lucide-react';
import { getOptionsByRole } from '@/lib/utils';

interface DropdownTypeFilterProps {
  mvtStocks: any[];
  onChange: (filtered: any[], selected: string | null) => void;
}

const DropdownTypeFilter: React.FC<DropdownTypeFilterProps> = ({ mvtStocks, onChange }) => {
  const [selectedType, setSelectedType] = useState<string | null>('Tout');
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const filteredTypeOptions = useMemo(() => user && getOptionsByRole(user?.role), [user]);
  const safeTypeOptions = Array.isArray(filteredTypeOptions) ? filteredTypeOptions : [];

  const mvtOptions = [{ label: 'Tout', value: 'Tout' }, ...safeTypeOptions];

  useEffect(() => {
    if (selectedType === 'Tout') {
      onChange(mvtStocks, null);
    } else {
      const filtered = mvtStocks.filter((s) => s.type === selectedType);
      onChange(filtered, selectedType);
    }
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
        placeholder="Sélectionner le type d'opération"
        className="w-full !bg-green-700 !text-gray-100 font-semibold rounded-md border-none"
        showClear
        valueTemplate={valueTemplate}
      />
    </div>
  );
};

export default DropdownTypeFilter;
