/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: components/DropdownPointVenteFilter.tsx

import React, { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import { PointVente } from '@/Models/pointVenteType';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { fetchRegions } from '@/stores/slices/regions/regionSlice';

interface DropdownPointVenteFilterProps {
  onSelect: (pointVente: PointVente | null) => void;
}

const DropdownPointVenteFilter: React.FC<DropdownPointVenteFilterProps> = ({ onSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));

  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  useEffect(() => {
    dispatch(fetchPointVentes());
    dispatch(fetchRegions());
  }, [dispatch]);

  const options: PointVente[] = [
    { _id: '', nom: 'Tous les points de vente' } as PointVente,
    ...pointsVente,
  ];

  const valueTemplate = (option: any, props: any) => {
    return (
      <div className="flex items-center gap-2 text-white">
        <i className="pi pi-building" />
        <span>{option ? option.nom : props.placeholder}</span>
      </div>
    );
  };

  const handleChange = (e: { value: PointVente | null }) => {
    setSelectedPointVente(e.value);
    if (!e.value || !e.value._id) {
      onSelect(null);
    } else {
      onSelect(e.value);
    }
  };

  return (
    <div className="w-full md:w-52">
      <Dropdown
        value={selectedPointVente}
        options={options}
        onChange={handleChange}
        optionLabel="nom"
        placeholder="Filtrer par point de vente"
        className="w-full text-sm"
        showClear
        valueTemplate={valueTemplate}
      />
    </div>
  );
};

export default DropdownPointVenteFilter;
