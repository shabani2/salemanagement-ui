'use client';
import { Region } from '@/Models/regionTypes';
import { Dropdown } from 'primereact/dropdown';
//import { useEffect, useState } from 'react';

interface DropdownRegionFilterProps {
  regions: Region[];
  onSelect: (region: Region | null) => void;
  selectedRegion: Region | null;
}

export default function DropdownRegionFilter({
  regions,
  onSelect,
  selectedRegion,
}: DropdownRegionFilterProps) {
  return (
    <Dropdown
      value={selectedRegion}
      onChange={(e) => onSelect(e.value)}
      options={regions}
      optionLabel="nom"
      placeholder="Sélectionnez une région"
      className="w-full md:w-14rem"
    />
  );
}
