'use client';

import React, { useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Filter } from 'lucide-react';

type DropdownTypeFilterProps = {
  /** Valeur sélectionnée (null = "Tout") */
  value: string | null;
  /** Liste des types autorisés (ex: ['Entrée','Sortie','Commande','Livraison']) */
  options: string[];
  /** Callback quand la sélection change (null = "Tout") */
  onChange: (next: string | null) => void;
  /** Afficher l’option “Tout” (par défaut: true) */
  includeAll?: boolean;
  className?: string;
};

const DropdownTypeFilter: React.FC<DropdownTypeFilterProps> = ({
  value,
  options,
  onChange,
  includeAll = true,
  className,
}) => {
  const items = useMemo(() => {
    const uniques = Array.from(new Set(options?.filter(Boolean)));
    const base = uniques.map((v) => ({ label: v, value: v }));
    return includeAll ? [{ label: 'Tout', value: 'Tout' }, ...base] : base;
  }, [options, includeAll]);

  // On affiche "Tout" côté UI quand value === null
  const uiValue = value ?? (includeAll ? 'Tout' : null);

  const valueTemplate = (option: any, props: any) => (
    <div className="flex items-center gap-2 text-white">
      <Filter className="w-4 h-4" />
      <span>{option ? option.label : props.placeholder}</span>
    </div>
  );

  return (
    <div className="w-full md:w-64">
      <Dropdown
        value={uiValue}
        options={items}
        optionLabel="label"
        placeholder="Sélectionner le type d'opération"
        className={
          className ?? 'w-full !bg-green-700 !text-gray-100 font-semibold rounded-md border-none'
        }
        valueTemplate={valueTemplate}
        showClear
        onChange={(e) => {
          // PrimeReact renvoie null quand on clique sur "clear"
          if (e.value === 'Tout' || e.value == null) onChange(null);
          else onChange(e.value as string);
        }}
      />
    </div>
  );
};

export default React.memo(DropdownTypeFilter);
