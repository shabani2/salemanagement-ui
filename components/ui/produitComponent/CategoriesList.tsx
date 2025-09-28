/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Paginator } from 'primereact/paginator';
import { Categorie } from '@/Models/produitsType';
import { useRef, useState } from 'react';
import { API_URL } from '@/lib/apiConfig';
import { resolveFinalImagePath } from '@/lib/utils/baseUrl';

interface Props {
  categories: Categorie[];
  // filterProduitByCategorie: (categorie: Categorie | null) => void;
  onAction: (action: 'edit' | 'delete', categorie: Categorie) => void;
}

const CategorieList: React.FC<Props> = ({ categories, onAction }) => {
  const menuRefs = useRef<Record<string, Menu | null>>({});
  const [activeSwitches, setActiveSwitches] = useState<Record<string, boolean>>({ all: true });

  // pagination
  const [first, setFirst] = useState(0);
  const rows = 12;
  const paginatedCategories = categories.slice(first, first + rows);

  const handleSwitchChange = (categorie: Categorie | null) => {
    const id = categorie ? categorie._id : 'all';
    // @ts-expect-error - compat: external lib types mismatch
    const updated: Record<string, boolean> = { [id]: true };
    setActiveSwitches(updated);

    // filterProduitByCategorie(categorie);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Pagination des catégories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {paginatedCategories.map((categorie) => {
          const menuItems = [
            {
              label: 'Modifier',
              icon: 'pi pi-pencil',
              command: () => onAction('edit', categorie),
            },
            {
              label: 'Supprimer',
              icon: 'pi pi-trash',
              command: () => onAction('delete', categorie),
            },
          ];

          return (
            <div
              key={categorie._id}
              className="flex items-center justify-between  shadow p-4 rounded-xl !bg-gray-300"
            >
              <div className="flex items-center gap-4">
                {/* <InputSwitch
                  // @ts-expect-error - compat: external lib types mismatch
                  checked={!!activeSwitches[categorie._id]}
                  onChange={() => handleSwitchChange(categorie)}
                /> */}

                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  
                    <img
                      src={resolveFinalImagePath(categorie?.image, '2')}
                      alt={categorie.nom}
                      className="object-cover w-full h-full"
                    />
                
                </div>

                <span className="text-lg font-medium">{categorie.nom}</span>
              </div>

              <Menu
                model={menuItems}
                popup
                ref={(el) => {
                  // @ts-expect-error - compat: external lib types mismatch
                  menuRefs.current[categorie?._id] = el;
                }}
              />

              <Button
                icon="pi pi-ellipsis-h"
                className="p-button-text"
                onClick={(e) =>
                  // @ts-expect-error - compat: external lib types mismatch
                  menuRefs.current[categorie._id]?.toggle?.(e)
                }
                severity={undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Pagination en bas */}
      <Paginator
        first={first}
        rows={rows}
        totalRecords={categories.length}
        onPageChange={(e) => setFirst(e.first)}
        className="mt-4"
        template="PrevPageLink PageLinks NextPageLink"
      />
    </div>
  );
};

export default CategorieList;
