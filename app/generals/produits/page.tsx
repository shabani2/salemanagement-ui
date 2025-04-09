"use client";
import CategorieList from "@/components/ui/produitComponent/CategoriesList";
import { Categorie, Produit } from "@/Models/produitsType";
import {
  fetchCategories,
  selectAllCategories,
} from "@/stores/slices/produits/categoriesSlice";
import {
  fetchProduits,
  selectAllProduits,
} from "@/stores/slices/produits/produitsSlice";
import { AppDispatch, RootState } from "@/stores/store";
import { BreadCrumb } from "primereact/breadcrumb";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const produits = useSelector((state: RootState) => selectAllProduits(state));
  const categories = useSelector((state: RootState) =>
    selectAllCategories(state),
  );
  const [search, setSearch] = useState("");
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Categorie | null>(
    null,
  );
  const [newProduit, setNewProduit] = useState<Produit | null>(null);
  const [newCategory, setNewCategory] = useState<Categorie | null>(null);
  useEffect(() => {
     dispatch(fetchCategories())//.then((resp) => {
    //   console.log("categories : ", resp.payload);
    // });
    dispatch(fetchProduits());
  }, [dispatch]);
  const filterProduitByCategorie = (categorie: Categorie) => {
    const filtered = produits.filter((p) => p.categorie === categorie._id);
    console.log("Produits filtrés pour:", categorie.nom, filtered);
    // Tu peux stocker ces produits dans un state ou les dispatcher
  };
  console.log('categories : ',categories)
  console.log('produits : ',produits)

  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[
            { label: "Accueil", url: "/" },
            { label: "Gestion des Produits" },
          ]}
          home={{ icon: "pi pi-home", url: "/" }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des Produits</h2>
      </div>
      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row">
        <div className=" w-3/12 bg-white p-2 rounded-lg">
          <h3>categories</h3>
          <CategorieList
            categories={categories}
            filterProduitByCategorie={filterProduitByCategorie}
          />
        </div>
        <div className="w-9/12 bg-white p-2 rounded-lg">
          <div className="gap-4 mb-4   flex justify-between">
            <div className="relative w-2/3 flex flex-row ">
              <InputText
                className="p-2 border rounded flex-grow"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="ml-3 flex gap-2 w-2/5">
                <Button
                  label="up"
                  icon="pi pi-upload"
                  className="p-button-primary text-[16px]"
                />
                <Button
                  label="down"
                  icon="pi pi-download"
                  className="p-button-success text-[16px]"
                />
              </div>
            </div>
            <Button
              label="Créer un point de vente"
              className="bg-blue-500 text-white p-2 rounded"
              onClick={() => setDialogType("create")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
