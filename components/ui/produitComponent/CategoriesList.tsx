/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';
import React, { useRef, useState } from 'react';
import { InputSwitch } from 'primereact/inputswitch';
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { Paginator } from 'primereact/paginator';
import { Categorie } from '@/Models/produitsType';

interface Props {
  categories: Categorie[];
  filterProduitByCategorie: (categorie: Categorie | null) => void;
  onAction: (action: 'edit' | 'delete', categorie: Categorie) => void;
}

const CategorieList: React.FC<Props> = ({ categories, filterProduitByCategorie, onAction }) => {
  const menuRefs = useRef<Record<string, Menu | null>>({});
  const [activeSwitches, setActiveSwitches] = useState<Record<string, boolean>>({ all: true });

  // pagination
  const [first, setFirst] = useState(0);
  const rows = 5;
  const paginatedCategories = categories.slice(first, first + rows);

  const handleSwitchChange = (categorie: Categorie | null) => {
    const id = categorie ? categorie._id : 'all';
    //@ts-ignore
    const updated: Record<string, boolean> = { [id]: true };
    setActiveSwitches(updated);

    filterProduitByCategorie(categorie);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tout */}
      <div key="all" className="flex items-center justify-between bg-white shadow p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <InputSwitch
            checked={!!activeSwitches['all']}
            onChange={() => handleSwitchChange(null)}
          />
          <span className="text-lg font-medium">Tout</span>
        </div>
      </div>

      {/* Pagination des catégories */}
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
            className="flex items-center justify-between bg-white shadow p-4 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <InputSwitch
                //@ts-ignore
                checked={!!activeSwitches[categorie._id]}
                onChange={() => handleSwitchChange(categorie)}
              />

              <div className="relative w-12 h-12 rounded-full overflow-hidden">
                {categorie.image && (
                  <img
                    src={
                      //@ts-ignore
                      `http://localhost:8000/${categorie.image.replace('../', '')}`
                    }
                    alt={categorie.nom}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>

              <span className="text-lg font-medium">{categorie.nom}</span>
            </div>

            <Menu
              model={menuItems}
              popup
              ref={(el) => {
                //@ts-ignore
                menuRefs.current[categorie?._id] = el;
              }}
            />

            <Button
              icon="pi pi-ellipsis-h"
              className="p-button-text"
              onClick={(e) =>
                //@ts-ignore
                menuRefs.current[categorie._id]?.toggle?.(e)
              }
            />
          </div>
        );
      })}

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
