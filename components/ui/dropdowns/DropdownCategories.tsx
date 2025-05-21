/* eslint-disable @typescript-eslint/no-explicit-any */
// Path: components/DropdownCategorieFilter.tsx

import React, { useEffect, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { Categorie } from '@/Models/produitsType';
import { AppDispatch, RootState } from '@/stores/store';
import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';

interface DropdownCategorieFilterProps {
  onSelect: (categorie: Categorie | null) => void;
}

const DropdownCategorieFilter: React.FC<DropdownCategorieFilterProps> = ({ onSelect }) => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => selectAllCategories(state));

  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const options: Categorie[] = [{ id: '', nom: 'Tout' } as Categorie, ...categories];

  const valueTemplate = (option: any, props: any) => {
    return (
      <div className="flex items-center gap-2 text-white">
        <i className="pi pi-filter" />
        <span>{option ? option.nom : props.placeholder}</span>
      </div>
    );
  };

  const handleChange = (e: { value: Categorie | null }) => {
    setSelectedCategorie(e.value);
    if (!e.value || !e.value._id) {
      onSelect(null); // <- déclenche le reset côté parent
    } else {
      onSelect(e.value);
    }
  };

  return (
    <div className="w-full md:w-52 ">
      <Dropdown
        value={selectedCategorie}
        options={options}
        onChange={handleChange}
        optionLabel="nom"
        placeholder="Filtrer par catégorie"
        className="w-full text-sm"
        showClear
        valueTemplate={valueTemplate}
      />
    </div>
  );
};

export default DropdownCategorieFilter;
