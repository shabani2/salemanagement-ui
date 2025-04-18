/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
'use client';

import React, { useEffect, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useForm, useFieldArray } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { classNames } from 'primereact/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';
import { Produit } from '@/Models/produitsType';
import { fetchProduits } from '@/stores/slices/produits/produitsSlice';
import { MouvementStock, MouvementStockModel } from '@/Models/mouvementStockType';
import { createMouvementStock } from '@/stores/slices/mvtStock/mvtStock';


interface FormValues {
  type: string;
  depotCentral?: boolean;
  pointVente?: string;
  produits: {
    categorie: string;
    produit: string;
    quantite: number;
  }[];
  remise?: number;
  rabais?: number;
}

const typeOptions = [
  { label: 'Entrée', value: 'Entrée' },
  { label: 'Sortie', value: 'Sortie' },
  { label: 'Vente', value: 'Vente' },
  { label: 'Livraison', value: 'Livraison' },
  { label: 'Commande', value: 'commande' },
];

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => selectAllCategories(state));
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);

  const [selectedType, setSelectedType] = useState<string>('');
  const { data: session } = useSession();
  const router = useRouter();
  const toast = React.useRef<Toast>(null);

  const defaultValues: FormValues = {
    type: '',
    depotCentral: false,
    pointVente: '',
    produits: [{ categorie: '', produit: '', quantite: 0 }],
    remise: 0,
    rabais: 0,
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'produits' });

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      setAllProduits(resp.payload);
      setProduits(resp.payload);
    });
  }, [dispatch]);

  const onSubmit = async (data: FormValues) => {
    console.log('hello => ')
    const mouvements: MouvementStockModel[] = data.produits.map((item) => {
      const produitObj = allProduits.find((p) => p._id === item.produit);
      if (!produitObj) throw new Error('Produit introuvable');

      const prix = ['Entrée', 'Livraison'].includes(data.type)
        ? produitObj.prix
        : produitObj.prixVente;

      return {
        produit: produitObj,
        quantite: item.quantite,
        montant: prix * item.quantite,
        type: data.type,
        depotCentral: data.depotCentral ?? false,
        pointVente: data.pointVente ? { _id: data.pointVente } : undefined,
        statut: 'En Attente',
      };
    });

    try {
      await Promise.all(mouvements.map((mouvement) =>
        dispatch(createMouvementStock(mouvement))
      ));

      toast.current?.show({
        severity: 'success',
        summary: 'Succès',
        detail: 'Mouvements enregistrés avec succès',
        life: 3000,
      });
      reset(defaultValues);
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Une erreur est survenue lors de l\'enregistrement',
        life: 4000,
      });
    }
  };

  const totalMontant = watch('produits').reduce((acc, item) => {
    const produit = allProduits.find((p) => p._id === item.produit);
    return acc + (produit ? produit.prix * item.quantite : 0);
  }, 0);

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des opérations' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des opérations</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="w-full flex items-center gap-2">
              <label className="whitespace-nowrap">Type d’opération :</label>
              <div className="flex-1">
                <Dropdown
                  value={watch('type')}
                  options={typeOptions}
                  onChange={(e) => {
                    setSelectedType(e.value);
                    reset({ ...defaultValues, type: e.value });
                  }}
                  placeholder="Sélectionner un type"
                  className={classNames({ 'p-invalid': errors.type })}
                  style={{ width: '100%' }}
                />
                {errors.type && <small className="text-red-500">Champ requis</small>}
              </div>
            </div>

            {watch('type') === 'Entrée' && (
              <div>
                <label>
                  <input type="checkbox" {...register('depotCentral')} /> Dépôt central
                </label>
              </div>
            )}

            {watch('type') !== 'Entrée' && (
              <div>
                <label>Point de vente</label>
                <InputText {...register('pointVente', { required: true })} className="w-full" />
                {errors.pointVente && <small className="text-red-500">Champ requis</small>}
              </div>
            )}

            {fields.map((field, index) => {
              const selectedCatId = watch(`produits.${index}.categorie`);
              const filteredProduits = allProduits.filter((p) => p.categorie._id === selectedCatId);
              return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label>Catégorie</label>
                    <Dropdown
                      value={watch(`produits.${index}.categorie`)}
                      options={categories.map((cat) => ({ label: cat.nom, value: cat._id }))}
                      onChange={(e) => setValue(`produits.${index}.categorie`, e.value)}
                      placeholder="Choisir une catégorie"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label>Produit</label>
                    <Dropdown
                      value={watch(`produits.${index}.produit`)}
                      options={filteredProduits.map((p) => ({ label: p.nom, value: p._id }))}
                      onChange={(e) => setValue(`produits.${index}.produit`, e.value)}
                      placeholder="Choisir un produit"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label>Quantité</label>
                    <InputText
                      type="number"
                      {...register(`produits.${index}.quantite`, { required: true, min: 1 })}
                      className="w-full"
                    />
                    {errors.produits?.[index]?.quantite && (
                      <small className="text-red-500">Quantité requise</small>
                    )}
                  </div>
                  <Button icon="pi pi-trash" severity="danger" text onClick={() => remove(index)} />
                </div>
              );
            })}

            <Button
              type="button"
              icon="pi pi-plus"
              label="Ajouter un produit"
              onClick={() => append({ categorie: '', produit: '', quantite: 0 })}
            />
          </form>
        </div>
{/* zone de recap */}
        <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
          <h3 className="text-lg font-semibold">Récapitulatif</h3>

          {watch('type') === 'Vente' && (
            <>
              <div>
                <label>Remise</label>
                <InputText type="number" {...register('remise')} className="w-full" />
              </div>
              <div>
                <label>Rabais</label>
                <InputText type="number" {...register('rabais')} className="w-full" />
              </div>
            </>
          )}

          <div>
            <h4 className="font-medium">Détails par produit</h4>
            <ul className="space-y-2">
          {watch('produits').map((item, idx) => {
            const produit = allProduits.find((p) => p._id === item.produit);
            const type = watch('type');
            const prix = produit ? (['Livraison', 'Entrée'].includes(type) ? produit.prix : produit.prixVente) : 0;
            if (!produit) return null;
            return (
              <li key={idx} className="flex justify-between">
                <span>{produit.nom}</span>
                <span>
                  {item.quantite} x {prix} = {item.quantite * prix} FC
                </span>
              </li>
            );
          })}
        </ul>
          </div>

          <div className="font-bold text-right">Montant total : {totalMontant} FC</div>

          <div className="text-sm text-gray-600">
            Opérateur : {session?.user?.name || 'Utilisateur inconnu'}
          </div>

          <Button label="Valider l'opération" icon="pi pi-check" onClick={handleSubmit(onSubmit)} />
        </div>
      </div>
    </div>
  );
};

export default Page;
