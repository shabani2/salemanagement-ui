/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: components/DropdownPointVenteFilter.tsx

import React, { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import { PointVente } from '@/Models/pointVenteType';
import {
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
//import { fetchRegions } from '@/stores/slices/regions/regionSlice';

interface DropdownPointVenteFilterProps {
  onSelect: (pointVente: PointVente | null) => void;
}

const DropdownPointVenteFilter: React.FC<DropdownPointVenteFilterProps> = ({ onSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  useEffect(() => {
    if (user?.role === 'AdminRegion') {
      dispatch(fetchPointVentesByRegionId(user?.region?._id));
    } else {
      dispatch(fetchPointVentes()).then((resp) => {
        console.log('all pv : ', resp.payload);
      });
    }
    // dispatch(fetchRegions());
  }, [dispatch, user?.role, user?.region?._id]);

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
  //console.log("Selected Point de Vente:", selectedPointVente);
  //console.log("Available Points de Vente:", pointsVente);
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
