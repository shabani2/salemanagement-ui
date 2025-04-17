"use client";
import React, { useRef, useState } from "react";
import { InputSwitch } from "primereact/inputswitch";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import { Categorie } from "@/Models/produitsType";

interface Props {
  categories: Categorie[];
  filterProduitByCategorie: (categorie: Categorie | null) => void;
}

const CategorieList: React.FC<Props> = ({
  categories,
  filterProduitByCategorie,
}) => {
  const menuRefs = useRef<Record<string, Menu | null>>({});
  const [activeSwitches, setActiveSwitches] = useState<Record<string, boolean>>(
    {
      all: true,
    },
  );

  const menuItems = [
    { label: "Modifier", icon: "pi pi-pencil" },
    { label: "Supprimer", icon: "pi pi-trash" },
  ];

  const handleSwitchChange = (categorie: Categorie | null) => {
    const id = categorie ? categorie._id : "all";

    const updated: Record<string, boolean> = { [id]: true };
    setActiveSwitches(updated);

    if (categorie) {
      filterProduitByCategorie(categorie);
    } else {
      filterProduitByCategorie(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        key="all"
        className="flex items-center justify-between bg-white shadow p-4 rounded-xl"
      >
        <div className="flex items-center gap-4">
          <InputSwitch
            checked={!!activeSwitches["all"]}
            onChange={() => handleSwitchChange(null)}
          />
          <span className="text-lg font-medium">Tout</span>
        </div>
      </div>

      {categories.map((categorie) => (
        <div
          key={categorie._id}
          className="flex items-center justify-between bg-white shadow p-4 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <InputSwitch
              checked={!!activeSwitches[categorie._id]}
              onChange={() => handleSwitchChange(categorie)}
            />

            <div className="relative w-12 h-12 rounded-full overflow-hidden">
              {categorie.image && (
                <img
                  src={`http://localhost:8000/${categorie.image.replace("../", "")}`}
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
              menuRefs.current[categorie._id] = el;
            }}
          />

          <Button
            icon="pi pi-ellipsis-h"
            className="p-button-text"
            onClick={(e) => menuRefs.current[categorie._id]?.toggle?.(e)}
          />
        </div>
      ))}
    </div>
  );
};

export default CategorieList;
