/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useEffect, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useForm, useFieldArray } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { classNames } from 'primereact/utils';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';
import { Produit } from '@/Models/produitsType';
import { fetchProduits } from '@/stores/slices/produits/produitsSlice';
import { MouvementStockModel } from '@/Models/mouvementStockType';
import { createMouvementStock } from '@/stores/slices/mvtStock/mvtStock';
import { PointVente } from '@/Models/pointVenteType';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { Controller } from 'react-hook-form';

interface FormValues {
  type: string;
  depotCentral?: boolean;
  pointVente?: PointVente;
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
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);

  const [selectedType, setSelectedType] = useState<string>('');

  const toast = React.useRef<Toast>(null);

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  const defaultValues: FormValues = {
    type: '',
    depotCentral: false,
    pointVente: undefined,
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
  } = useForm<FormValues>({
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'produits' });

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      setAllProduits(resp.payload);
      setProduits(resp.payload);
    });
    dispatch(fetchPointVentes());
  }, [dispatch]);

  useEffect(() => {
    console.log('🔥 Form errors:', errors);
  }, [errors]);

  const totalMontant = watch('produits').reduce((acc, item) => {
    const produit = allProduits.find((p) => p._id === item.produit);
    return acc + (produit ? produit.prix * item.quantite : 0);
  }, 0);

  // code source de la fonction onsubmit
  const onSubmit = async (data: FormValues) => {
    try {
      const mouvements = data.produits.map((item) => {
        const produitObj = allProduits.find((p) => p._id === item.produit);
        if (!produitObj) throw new Error('Produit introuvable');

        const prix = ['Entrée', 'Livraison'].includes(data.type)
          ? produitObj.prix
          : produitObj.prixVente;

        return {
          produit: produitObj._id,
          produitNom: produitObj.nom,
          quantite: item.quantite,
          montant: prix * item.quantite,
          type: data.type,
          depotCentral: data.depotCentral ?? false,
          pointVente: data.pointVente,
          statut: false,
        };
      });
      console.log('mouvements => ', mouvements);

      const results = await Promise.allSettled(
        mouvements.map((m) =>
          dispatch(
            createMouvementStock({
              //@ts-ignore
              produit: m.produit,
              quantite: m.quantite,
              montant: m.montant,
              //@ts-ignore
              type: m.type,
              depotCentral: m.depotCentral,
              pointVente: m.pointVente,
              //@ts-ignore
              statut: m.statut,
            })
          )
        )
      );

      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          const produitNom = mouvements[i].produitNom;
          toast.current?.show({
            severity: 'error',
            summary: `Erreur: ${produitNom}`,
            detail: res.reason || 'Échec de l’enregistrement',
            life: 5000,
          });
        }
      });

      const allOk = results.every((res) => res.status === 'fulfilled');
      console.log('resultat : ', results);

      if (allOk) {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Tous les mouvements ont été enregistrés',
          life: 3000,
        });
        reset(defaultValues);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur critique',
        detail: 'Une erreur globale est survenue',
        life: 4000,
      });
    }
  };

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
              <Controller
                name="type"
                control={control}
                rules={{ required: 'Type est requis' }}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={typeOptions}
                    onChange={(e) => {
                      field.onChange(e.value);
                      setSelectedType(e.value);
                    }}
                    placeholder="Sélectionner un type"
                    className={classNames('w-full', { 'p-invalid': !!errors.type })}
                  />
                )}
              />
              {errors.type && <small className="text-red-500">{errors.type.message}</small>}
            </div>

            {watch('type') === 'Entrée' && (
              <div>
                <label>
                  <input
                    type="checkbox"
                    {...register('depotCentral', {
                      validate: (value) =>
                        watch('type') !== 'Entrée' ||
                        value === true ||
                        'Vous devez cocher "Dépôt central"',
                    })}
                  />{' '}
                  Dépôt central
                </label>
                {errors.depotCentral && (
                  <small className="text-red-500">{errors.depotCentral.message}</small>
                )}
              </div>
            )}

            {watch('type') !== 'Entrée' && (
              <div>
                <label>Point de vente</label>
                <Dropdown
                  value={watch('pointVente')}
                  options={pointsVente}
                  optionLabel="nom"
                  onChange={(e) => setValue('pointVente', e.value)}
                  placeholder="Sélectionner un point de vente"
                  className="w-full"
                />
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
                const prix = produit
                  ? ['Livraison', 'Entrée'].includes(type)
                    ? produit.prix
                    : produit.prixVente
                  : 0;
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
            Opérateur : {user?.name || 'Utilisateur inconnu'}
          </div>

          <Button label="Valider l'opération" icon="pi pi-check" onClick={handleSubmit(onSubmit)} />
        </div>
      </div>
    </div>
  );
};

export default Page;
