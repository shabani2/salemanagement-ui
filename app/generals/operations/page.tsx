/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { MouvementStock } from '@/Models/mouvementStockType';
import { createMouvementStock } from '@/stores/slices/mvtStock/mvtStock';
import { PointVente } from '@/Models/pointVenteType';
import {
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
import { checkStock } from '@/stores/slices/stock/stockSlice';
import { User } from '@/Models/UserType';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { downloadPdfFile, generateStockPdf } from '@/stores/slices/document/pdfGenerator';
import { destinateur, organisation, serie } from '@/lib/Constants';
import { getOptionsByRole } from '@/lib/utils';
import { DataTable } from 'primereact/datatable';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Column } from 'primereact/column';
import { Divider } from 'primereact/divider';
import { fetchOrganisations, Organisation } from '@/stores/slices/organisation/organisationSlice';
import { Region } from '@/Models/regionTypes';
import { Badge } from 'primereact/badge';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';

type FormValues = {
  type: string;
  depotCentral?: boolean;
  pointVente?: PointVente;
  user?: User;
  region?: Region;
  produits: {
    categorie: string;
    produit: string;
    quantite: number;
  }[];
  formulaire: {
    categorie: string;
    produit: string;
    quantite: number;
  };
  remise?: number;
  rabais?: number;
  montantRecu?: number;
  montantDollar?: number;
  montantFranc?: number;
  tauxFranc?: number;
  tauxDollar?: number;
};

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector((state: RootState) => selectAllCategories(state));
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [org, setOrg] = useState<Organisation[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');

  const toast = React.useRef<Toast>(null);

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  const defaultValues: FormValues = {
    type: '',
    depotCentral: false,
    pointVente:
      user && user?.role && !['SuperAdmin', 'AdminRegion'].includes(user?.role)
        ? user.pointVente
        : null,
    region: undefined,
    user: user || undefined,
    produits: [],
    formulaire: {
      categorie: '',
      produit: '',
      quantite: 0,
    },
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
    setError,
    clearErrors,
    getValues,
    resetField,
    unregister,
    trigger,
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'produits' });

  const watchProduits = watch('produits');
  const selectedPointVente = watch('pointVente');
  const type = watch('type');
  const tauxFranc = watch('tauxFranc') || 0;
  const tauxDollar = watch('tauxDollar') || 0;
  const montantDollar = watch('montantDollar') || 0;
  const montantRecu = watch('montantRecu') || 0;
  const rabais = watch('rabais') || 0;
  const remise = watch('remise') || 0;
  const montantFranc = montantDollar * tauxFranc;

  const totalMontant = (watch('produits') ?? []).reduce((acc, item) => {
    const produit = allProduits.find((p) => p?._id === item.produit);
    if (!produit) return acc;

    const quantite = item.quantite ?? 0;
    const prix = produit.prix ?? 0;
    const marge = produit.marge ?? 0;
    const tva = produit.tva ?? 0;

    const montant = quantite * prix;
    const margeVal = (montant * marge) / 100;
    const netTopay = montant + margeVal;
    const tvaValeur = (netTopay * tva) / 100;
    const ttc = selectedType === 'Vente' ? netTopay + tvaValeur : montant;

    return acc + ttc;
  }, 0);

  const valeurRabais = (totalMontant * rabais) / 100;
  const valeurRemise = ((totalMontant - valeurRabais) * remise) / 100;
  const netAPayer = totalMontant - valeurRabais - valeurRemise;
  const reste = montantRecu - netAPayer;
  const pointVente = watch('pointVente');

  const rolesWithFixedPointVente = ['AdminRegion,AdminPointVente', 'Vendeur', 'Logisticien'];
  const isPointVenteLocked = user && rolesWithFixedPointVente.includes(user?.role);

  useEffect(() => {
    if (isPointVenteLocked && user?.pointVente && pointsVente.length > 0) {
      const matchedPV = pointsVente.find(
        (pv) =>
          pv?._id === (typeof user.pointVente === 'string' ? user.pointVente : user.pointVente?._id)
      );
      if (matchedPV && getValues('pointVente')?._id !== matchedPV?._id) {
        setValue('pointVente', matchedPV);
      }
    }

    if (user?.region && getValues('region')?._id !== user.region._id) {
      setValue('region', user.region);
    }

    const savedTauxDollar = localStorage.getItem('tauxDollar');
    if (savedTauxDollar) {
      const parsed = parseFloat(savedTauxDollar);
      if (getValues('tauxDollar') !== parsed) setValue('tauxDollar', parsed);
    }

    const savedTauxFranc = localStorage.getItem('tauxFranc');
    if (savedTauxFranc) {
      const parsed = parseFloat(savedTauxFranc);
      if (getValues('tauxFranc') !== parsed) setValue('tauxFranc', parsed);
    }
  }, [user?.region?._id, user]);

  const validateStock = async (value: number) => {
    const produitId = watch('formulaire.produit');
    if (!produitId || !value || value <= 0) return 'Quantité invalide';
    if (type === 'Entrée' || type === 'Commande') return true;

    const result = await dispatch(
      checkStock({
        type,
        produitId,
        quantite: value,
        pointVenteId: selectedPointVente?._id,
      })
    ).unwrap();

    if (!result.suffisant || result.quantiteDisponible < value) {
      return `Stock disponible : ${result.quantiteDisponible}`;
    }
    return true;
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.produits || data.produits.length === 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez ajouter au moins un produit avant de soumettre.',
        life: 4000,
      });
      return;
    }

    try {
      const mouvements = data.produits.map((item) => {
        const produitObj = allProduits.find((p) => p?._id === item.produit);
        if (!produitObj) throw new Error('Produit introuvable');

        const prix = ['Entrée', 'Livraison', 'Commande', 'Sortie'].includes(data.type)
          ? produitObj.prix
          : produitObj.prixVente;

        return {
          // Remplacez produitObj par son ID
          produit: produitObj?._id, // ⬅️ Chaîne ID au lieu de l'objet complet

          produitNom: produitObj.nom,
          quantite: item.quantite,
          montant: prix * item.quantite,
          type: data.type,
          depotCentral: data.depotCentral ?? false,

          // Remplacez data.pointVente par son ID si c'est un objet
          pointVente: data.pointVente?._id || data.pointVente, // ⬅️ ID string

          region: data.region?._id || data.region, // ⬅️ Même traitement pour la région
          user: data?.user?._id || data.user, // ⬅️ Gère les deux cas (objet ou ID)
          statut: ['Entrée', 'Vente', 'Sortie'].includes(data.type),
        };
      });

      const results = await Promise.allSettled(
        mouvements.map((m) => dispatch(createMouvementStock(m as any)))
      );

      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          const produitNom = mouvements[i].produitNom;
          toast.current?.show({
            severity: 'error',
            summary: `Erreur: ${produitNom}`,
            detail: 'Échec de l’enregistrement',
            life: 7000,
          });
        }
      });

      const allOk = results.every((res) => res.status === 'fulfilled');
      if (allOk) {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Tous les mouvements ont été enregistrés',
          life: 3000,
        });

        confirmDialog({
          message: 'Voulez-vous télécharger le document PDF ?',
          header: 'Téléchargement',
          icon: 'pi pi-file-pdf',
          acceptLabel: 'Oui',
          rejectLabel: 'Non',
          accept: async () => {
            const result = await dispatch(
              generateStockPdf({
                organisation: org[0] || organisation,
                user,
                mouvements,
                type: data.type,
                destinateur,
                serie,
              })
            );
            if (generateStockPdf.fulfilled.match(result)) {
              downloadPdfFile(result.payload, `${data.type}-${serie}.pdf`);
            } else {
              toast.current?.show({
                severity: 'error',
                summary: 'Erreur PDF',
                detail: 'Erreur lors de la génération du fichier PDF',
                life: 4000,
              });
            }
          },
        });
        reset(defaultValues);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur critique',
        detail: 'Échec de l’opération',
        life: 4000,
      });
    }
  };

  const filteredTypeOptions = useMemo(() => user && getOptionsByRole(user?.role), [user]);
  const selectedCatId = watch('formulaire.categorie');
  const filteredProduits = (allProduits ?? []).filter(
    (p) => (p.categorie as any)?._id === selectedCatId
  );

  useEffect(() => {
    dispatch(fetchOrganisations()).then((data) => {
      if (data) setOrg(data.payload);
    });
    dispatch(fetchCategories()).then((resp) => {
      console.log('donnees from api : ', resp.payload);
    });
    dispatch(fetchProduits()).then((resp) => {
      const produits = Array.isArray(resp.payload) ? resp.payload : [];
      setAllProduits(produits);
      setProduits(produits);
    });
    if (user && user?.role === 'SuperAdmin') {
      dispatch(fetchPointVentes());
    } else {
      dispatch(fetchPointVentesByRegionId(user?.region?._id));
    }
  }, [user?.region?._id, dispatch, user?.role, user?._id]);

  console.log('categories got :', categories);
  return (
    <div className="min-h-screen p-4 text-xs">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Opérations' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h1 className="font-bold text-gray-500 text-[14px]">Gestion des opérations</h1>
      </div>

      <div className="w-full mx-auto px-4 py-2 bg-white rounded-lg shadow-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row gap-0">
            {/* Formulaire: 2/12 */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-full md:w-2/12 p-3 bg-gradient-to-br from-blue-50 to-indigo-50"
            >
              <div className="flex items-center gap-3 mb-6">
                <i className="pi pi-pencil text-blue-600 text-xl"></i>
                <h2 className="text-xl font-bold text-gray-800">Nouvelle Operation</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="font-medium mb-2 text-gray-700 flex items-center gap-2">
                    <i className="pi pi-sitemap text-blue-500"></i>
                    Type d&apos;opération
                  </label>
                  <Controller
                    name="type"
                    control={control}
                    rules={{ required: 'Type est requis' }}
                    render={({ field }) => (
                      <Dropdown
                        {...field}
                        options={filteredTypeOptions}
                        onChange={(e) => {
                          field.onChange(e.value);
                          setSelectedType(e.value);
                        }}
                        placeholder="Sélectionner une operation"
                        className={classNames('w-full border-gray-300 rounded-xl', {
                          'p-invalid border-red-500': !!errors.type,
                        })}
                      />
                    )}
                  />
                  {errors.type && (
                    <small className="text-red-600 mt-1 flex items-center gap-1">
                      <i className="pi pi-exclamation-circle"></i>
                      {errors.type.message}
                    </small>
                  )}
                </div>

                {watch('type') === 'Entrée' && (
                  <div className="mt-4">
                    {user && user?.role === 'SuperAdmin' ? (
                      <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <label className="flex items-center gap-2 font-medium text-gray-800">
                          <input
                            type="checkbox"
                            {...register('depotCentral')}
                            disabled={!watch('type')}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <i className="pi pi-building text-blue-600"></i>
                          Dépôt central
                        </label>
                        {errors.depotCentral && (
                          <small className="text-red-600 mt-1 flex items-center gap-1">
                            <i className="pi pi-exclamation-circle"></i>
                            {errors.depotCentral.message}
                          </small>
                        )}
                      </div>
                    ) : user && user?.role === 'AdminRegion' ? (
                      <div className="flex items-center gap-3 font-bold text-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <i className="pi pi-building text-blue-600 text-xl"></i>
                        <div>
                          <div className="font-bold">Dépôt régional</div>
                          <div className="text-sm font-normal">
                            {user?.region?.nom || 'Région non définie'}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {watch('type') && watch('type') !== 'Entrée' && (
                  <div className="mt-4">
                    <label className="font-medium mb-2 text-gray-700 flex items-center gap-2">
                      <i className="pi pi-store text-blue-500"></i>
                      Point de vente
                    </label>
                    {user && ['SuperAdmin', 'AdminRegion'].includes(user?.role) ? (
                      // Mode sélection libre pour SuperAdmin et AdminRegion
                      <Controller
                        name="pointVente"
                        control={control}
                        rules={{ required: 'Point de vente est requis' }}
                        render={({ field }) => (
                          <Dropdown
                            {...field}
                            value={field.value}
                            options={pointsVente}
                            optionLabel="nom"
                            onChange={(e) => field.onChange(e.value)}
                            placeholder="Sélectionner un point de vente"
                            className="w-full border-gray-300 rounded-xl"
                            disabled={!watch('type') || isPointVenteLocked}
                          />
                        )}
                      />
                    ) : (
                      // Mode verrouillé avec valeur unique pour les autres rôles
                      <Controller
                        name="pointVente"
                        control={control}
                        render={({ field }) => (
                          <Dropdown
                            {...field}
                            value={user?.pointVente}
                            options={user?.pointVente ? [user.pointVente] : []}
                            optionLabel="nom"
                            placeholder="Votre point de vente"
                            className="w-full border-gray-300 rounded-xl"
                            disabled={true}
                            onChange={(e) => field.onChange(e.value)}
                          />
                        )}
                      />
                    )}
                    {errors.pointVente && (
                      <small className="text-red-600 mt-1 flex items-center gap-1">
                        <i className="pi pi-exclamation-circle"></i>
                        {errors.pointVente.message || 'Champ requis'}
                      </small>
                    )}
                  </div>
                )}

                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block font-medium mb-2 text-gray-700 flex items-center gap-2">
                        <i className="pi pi-tag text-blue-500"></i>
                        Catégorie
                      </label>
                      <Controller
                        name="formulaire.categorie"
                        control={control}
                        render={({ field }) => (
                          <Dropdown
                            {...field}
                            options={categories.map((cat) => ({ label: cat.nom, value: cat?._id }))}
                            onChange={(e) => field.onChange(e.value)}
                            placeholder="Choisir une catégorie"
                            className="w-full border-gray-300 rounded-xl"
                            disabled={!watch('type')}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-2 text-gray-700 flex items-center gap-2">
                        <i className="pi pi-box text-blue-500"></i>
                        Produit
                      </label>
                      <Controller
                        name="formulaire.produit"
                        control={control}
                        render={({ field }) => (
                          <Dropdown
                            {...field}
                            options={filteredProduits.map((p) => ({ label: p.nom, value: p?._id }))}
                            placeholder="Choisir un produit"
                            className="w-full border-gray-300 rounded-xl"
                            onChange={(e) => field.onChange(e.value)}
                          />
                        )}
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-2 text-gray-700 flex items-center gap-2">
                        <i className="pi pi-calculator text-blue-500"></i>
                        Quantité
                      </label>
                      <Controller
                        name="formulaire.quantite"
                        control={control}
                        render={({ field }) => (
                          <InputText
                            type="number"
                            value={field.value !== undefined ? String(field.value) : ''}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className={`w-full border-gray-300 rounded-xl ${errors.formulaire?.quantite ? 'p-invalid border-red-500' : ''}`}
                            placeholder="Entrez la quantité"
                          />
                        )}
                      />
                      {errors.formulaire?.quantite && (
                        <small className="text-red-600 mt-1 flex items-center gap-1">
                          <i className="pi pi-exclamation-circle"></i>
                          {errors.formulaire.quantite.message || 'Quantité requise'}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="flex mt-4">
                    <Button
                      type="button"
                      className={`w-full p-3 rounded-xl font-bold transition-all duration-300 ${
                        editingIndex !== null
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                      }`}
                      icon={editingIndex !== null ? 'pi pi-check' : 'pi pi-plus'}
                      label={editingIndex !== null ? 'Modifier Produit' : 'Ajouter Produit'}
                      onClick={async () => {
                        const isValid = await trigger([
                          'formulaire.categorie',
                          'formulaire.produit',
                          'formulaire.quantite',
                        ]);
                        if (!isValid) return;

                        const quantite = getValues('formulaire.quantite');
                        const stockValidation = await validateStock(quantite);
                        if (stockValidation !== true) {
                          setError('formulaire.quantite', {
                            type: 'manual',
                            message: stockValidation,
                          });
                          return;
                        }

                        const formData = getValues('formulaire');
                        if (editingIndex !== null) {
                          update(editingIndex, formData);
                          setEditingIndex(null);
                        } else {
                          append(formData);
                        }
                        resetField('formulaire');
                      }}
                    />
                  </div>
                </div>
              </div>
            </form>

            <Divider layout="vertical" className="hidden md:block h-auto bg-gray-200" />

            {/* Panier de produits */}
            <div className="w-full md:w-8/12 ">
              <Card className="h-full border-0 shadow-none">
                <div className="flex items-center gap-2 mb-3 ml-3">
                  <i className="pi pi-list text-indigo-600 text-xl"></i>
                  <h2 className="text-xl font-bold text-gray-800">
                    Detail des operations selectionnees
                  </h2>
                </div>

                {type && type !== 'Entrée' && pointVente && (
                  <div className="border border-gray-200 p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50 shadow-sm m-3">
                    <div className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <i className="pi pi-map-marker text-blue-500"></i>
                      Point de vente sélectionné
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Nom</div>
                        <div className="font-medium">{pointVente.nom}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Adresse</div>
                        <div className="font-medium">{pointVente.adresse}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Région</div>
                        <div className="font-medium">
                          {typeof pointVente.region === 'object' && pointVente.region !== null
                            ? pointVente.region.nom
                            : pointVente.region}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Ville</div>
                        <div className="font-medium">
                          {typeof pointVente.region === 'object' && pointVente.region !== null
                            ? pointVente.region.ville
                            : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-primary-50 p-2 rounded-lg">
                    <i className="pi pi-shopping-cart text-primary text-xl"></i>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">Panier</h2>
                  <Badge value={watchProduits?.length || 0} className="ml-2 bg-primary"></Badge>
                </div>

                {watchProduits?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-auto max-h-[400px]">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th className="px-4 py-3">Produit</th>
                            <th className="px-4 py-3">Quantité</th>
                            <th className="px-4 py-3">Prix</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {watchProduits.map((item, index) => {
                            const produit = allProduits.find((p) => p?._id === item.produit);
                            return (
                              <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {produit?.nom || 'Produit inconnu'}
                                </td>
                                <td className="px-4 py-3">
                                  <Tag value={item.quantite} severity="info" rounded />
                                </td>
                                <td className="px-4 py-3">{produit?.prix?.toFixed(2)} FC</td>
                                <td className="px-4 py-3 font-semibold">
                                  {(item.quantite * (produit?.prix || 0)).toFixed(2)} FC
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex gap-2">
                                    <Button
                                      icon="pi pi-pencil"
                                      className="p-button-text p-button-sm"
                                      onClick={() => {
                                        setValue('formulaire', item);
                                        setEditingIndex(index);
                                      }}
                                      tooltip="Modifier"
                                      tooltipOptions={{ position: 'top' }}
                                    />
                                    <Button
                                      icon="pi pi-trash"
                                      className="p-button-text p-button-danger p-button-sm"
                                      onClick={() => remove(index)}
                                      tooltip="Supprimer"
                                      tooltipOptions={{ position: 'top' }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Sous-total:</span>
                        <span className="font-semibold">{totalMontant.toFixed(2)} FC</span>
                      </div>

                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Rabais ({rabais}%):</span>
                        <span className="font-semibold text-red-500">
                          -{valeurRabais.toFixed(2)} FC
                        </span>
                      </div>

                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Remise ({remise}%):</span>
                        <span className="font-semibold text-red-500">
                          -{valeurRemise.toFixed(2)} FC
                        </span>
                      </div>

                      <Divider className="my-2" />

                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800">Total:</span>
                        <span className="text-xl font-bold text-primary">
                          {netAPayer.toFixed(2)} FC
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <i className="pi pi-shopping-cart text-gray-400 text-4xl mb-3"></i>
                    <p className="text-gray-500 mb-4">Votre panier est vide</p>
                    <p className="text-gray-400 text-center max-w-xs">
                      Ajoutez des produits à partir du formulaire à gauche pour commencer une
                      opération
                    </p>
                  </div>
                )}
                {type && !['Livraison', 'Entrée', 'Commande'].includes(type) && (
                  <>
                    <div className="text-right text-xl font-bold text-green-600 bg-green-50 p-4 rounded-xl">
                      {selectedType === 'Vente' &&
                        `Montant à payer: ${totalMontant.toLocaleString(undefined, { maximumFractionDigits: 2 })} FC`}
                    </div>
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className=" font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <i className="pi pi-money-bill text-green-500"></i>
                          Montant reçu en franc
                        </label>
                        <InputText
                          type="number"
                          {...register('montantRecu')}
                          className="w-full border-gray-300 rounded-xl"
                        />
                      </div>
                      <div className="w-1/2">
                        <label className=" font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <i className="pi pi-wallet text-green-500"></i>
                          Reste / à retourner
                        </label>
                        <div className="w-full border border-gray-300 rounded-xl p-3 text-right text-white bg-gradient-to-r from-gray-700 to-gray-800 font-bold">
                          {reste.toLocaleString(undefined, { maximumFractionDigits: 2 })} FC
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                  <Button
                    className="mt-4 py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 transition-all duration-300"
                    label="Valider l'opération"
                    icon="pi pi-check"
                    onClick={handleSubmit(onSubmit)}
                  />
                </div>
              </Card>
            </div>

            <Divider layout="vertical" className="hidden md:block h-auto bg-gray-200" />

            {/* Bloc taux/remise: 3/12 */}
            <div className="w-full md:w-2/12 p-2 bg-gradient-to-br from-gray-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary-50 p-2 rounded-lg">
                  <i className="pi pi-wallet text-primary text-xl"></i>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Paiement</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className=" font-medium mb-2 text-gray-700 flex items-center gap-2">
                    <i className="pi pi-dollar text-indigo-500"></i>
                    Taux dollar
                  </label>
                  <InputText
                    type="number"
                    value={watch('tauxDollar') !== undefined ? String(watch('tauxDollar')) : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== '') {
                        setValue('tauxDollar', Number(value));
                        localStorage.setItem('tauxDollar', value);
                      }
                    }}
                    className="w-full border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-medium mb-2 text-gray-700 flex items-center gap-2">
                    <i className="pi pi-euro text-indigo-500"></i>
                    Taux en franc
                  </label>
                  <InputText
                    type="number"
                    value={watch('tauxFranc') !== undefined ? String(watch('tauxFranc')) : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== '') {
                        setValue('tauxFranc', Number(value));
                        localStorage.setItem('tauxFranc', value);
                      }
                    }}
                    className="w-full border-gray-300 rounded-xl"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <i className="pi pi-dollar text-indigo-500"></i>
                      Montant reçu en $
                    </label>
                    <InputText
                      type="number"
                      {...register('montantDollar')}
                      className="w-full border-gray-300 rounded-xl"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <i className="pi pi-sync text-indigo-500"></i>
                      Montant converti
                    </label>
                    <div className="w-full border border-gray-300 rounded-xl p-3 text-center text-white bg-gradient-to-r from-gray-700 to-gray-800 font-bold">
                      {montantFranc.toLocaleString(undefined, { maximumFractionDigits: 2 })} FC
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-gray-700 font-bold mb-4 flex items-center gap-2">
                    <i className="pi pi-percentage text-purple-500"></i>
                    Zones de Réduction
                  </h3>
                  <Divider className="my-3 bg-gray-300" />

                  <div className="space-y-4">
                    <div>
                      <label className=" font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <i className="pi pi-tag text-purple-500"></i>
                        Rabais (%)
                      </label>
                      <InputText
                        type="number"
                        {...register('rabais')}
                        className="w-full border-gray-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <i className="pi pi-tags text-purple-500"></i>
                        Remise (%)
                      </label>
                      <InputText
                        type="number"
                        {...register('remise')}
                        className="w-full border-gray-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className=" font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <i className="pi pi-money-bill text-purple-500"></i>
                        Valeur rabais
                      </label>
                      <div className="w-full border border-gray-300 rounded-xl p-3 text-center bg-gradient-to-r from-purple-50 to-indigo-50 font-bold text-gray-800">
                        {valeurRabais.toLocaleString(undefined, { maximumFractionDigits: 2 })} FC
                      </div>
                    </div>

                    <div>
                      <label className=" font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <i className="pi pi-wallet text-purple-500"></i>
                        Valeur remise
                      </label>
                      <div className="w-full border border-gray-300 rounded-xl p-3 text-center bg-gradient-to-r from-purple-50 to-indigo-50 font-bold text-gray-800">
                        {valeurRemise.toLocaleString(undefined, { maximumFractionDigits: 2 })} FC
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
};

export default Page;
