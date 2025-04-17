/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { BreadCrumb } from "primereact/breadcrumb";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useRef, useState } from "react";

type MouvementStockFormData = {
  produit: string;
  type: "Entrée" | "Sortie" | "Vente" | "Livraison" | "commande";
  quantite: number;
  reference: string;
  statut: "En Attente" | "Validée";
};

const produits = [
  { label: "Produit A", value: "produitA" },
  { label: "Produit B", value: "produitB" },
];

const types = [
  { label: "Entrée", value: "Entrée" },
  { label: "Sortie", value: "Sortie" },
  { label: "Vente", value: "Vente" },
  { label: "Livraison", value: "Livraison" },
  { label: "Commande", value: "commande" },
];

const statuts = [
  { label: "En Attente", value: "En Attente" },
  { label: "Validée", value: "Validée" },
];

const Page = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MouvementStockFormData>();

  const toast = useRef<Toast>(null);

  const onSubmit = (data: MouvementStockFormData) => {
    console.log("Soumis:", data);
    toast.current?.show({
      severity: "success",
      summary: "Succès",
      detail: "Mouvement enregistré",
      life: 3000,
    });
    reset();
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[
            { label: "Accueil", url: "/" },
            { label: "Gestion des opérations" },
          ]}
          home={{ icon: "pi pi-home", url: "/" }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des opérations</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md max-w-xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Produit */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Produit</label>
            <Controller
              name="produit"
              control={control}
              rules={{ required: "Le produit est requis" }}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={produits}
                  placeholder="Sélectionner un produit"
                  className="w-full"
                />
              )}
            />
            {errors.produit && (
              <small className="text-red-500">{errors.produit.message}</small>
            )}
          </div>

          {/* Type */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Type</label>
            <Controller
              name="type"
              control={control}
              rules={{ required: "Le type est requis" }}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={types}
                  placeholder="Sélectionner un type"
                  className="w-full"
                />
              )}
            />
            {errors.type && (
              <small className="text-red-500">{errors.type.message}</small>
            )}
          </div>

          {/* Quantité */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Quantité</label>
            <Controller
              name="quantite"
              control={control}
              rules={{
                required: "La quantité est requise",
                min: { value: 1, message: "La quantité doit être ≥ 1" },
              }}
              render={({ field }) => (
                <InputNumber
                  value={field.value}
                  onValueChange={(e) => field.onChange(e.value)}
                  inputClassName="w-full"
                  className="w-full"
                />
              )}
            />
            {errors.quantite && (
              <small className="text-red-500">{errors.quantite.message}</small>
            )}
          </div>

          {/* Référence */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Référence</label>
            <Controller
              name="reference"
              control={control}
              rules={{ required: "La référence est requise" }}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  placeholder="ID de la référence"
                />
              )}
            />
            {errors.reference && (
              <small className="text-red-500">{errors.reference.message}</small>
            )}
          </div>

          {/* Statut */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Statut</label>
            <Controller
              name="statut"
              control={control}
              rules={{ required: "Le statut est requis" }}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={statuts}
                  placeholder="Sélectionner un statut"
                  className="w-full"
                />
              )}
            />
            {errors.statut && (
              <small className="text-red-500">{errors.statut.message}</small>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end mt-6">
            <Button label="Soumettre" icon="pi pi-check" type="submit" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Page;
