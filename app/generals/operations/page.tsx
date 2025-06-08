/* eslint-disable @typescript-eslint/ban-ts-comment */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

type FormValues = {
  type: string;
  depotCentral?: boolean;
  pointVente?: {
    _id: string;
    nom: string;
    adresse: string;
    region: { _id: string; nom: string; ville: string };
  };
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
  const [stockRestant, setStockRestant] = useState<{ [index: number]: number }>({});
  const [disableAdd, setDisableAdd] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [org, setOrg] = useState<Organisation[]>([]);

  const [selectedType, setSelectedType] = useState<string>('');

  const toast = React.useRef<Toast>(null);
  useEffect(() => {
    dispatch(fetchOrganisations()).then((data) => {
      if (data) {
        setOrg(data.payload);
      }
    });
  }, [dispatch]);

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  const defaultValues: FormValues = {
    type: '',
    depotCentral: false,
    pointVente: undefined,
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
  } = useForm<FormValues>({
    defaultValues: {
      produits: [],
      formulaire: {
        categorie: '',
        produit: '',
        quantite: 0,
      },
      type: '',
    },
    mode: 'onChange',
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'produits' });

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      const produits = Array.isArray(resp.payload) ? resp.payload : [];
      setAllProduits(produits);
      setProduits(produits);
    });
    dispatch(fetchPointVentes());
  }, [dispatch]);

  useEffect(() => {
    console.log('🔥 Form errors:', errors);
  }, [errors]);

  const totalMontant = watch('produits').reduce((acc, item) => {
    const produit = allProduits.find((p) => p._id === item.produit);
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

  const onSubmit = async (data: FormValues) => {
    if (!data.produits || data.produits.length === 0) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez ajouter au moins un produit avant de soumettre.',
        life: 4000,
      });
      return; // ❌ Bloque la soumission
    }

    try {
      const mouvements = data.produits.map((item) => {
        const produitObj = allProduits.find((p) => p._id === item.produit);
        if (!produitObj) throw new Error('Produit introuvable');

        const prix = ['Entrée', 'Livraison', 'Commande', 'Sortie'].includes(data.type)
          ? produitObj.prix
          : produitObj.prixVente;

        return {
          produit: produitObj,
          produitNom: produitObj.nom,
          quantite: item.quantite,
          montant: prix * item.quantite,
          type: data.type,
          depotCentral: data.depotCentral ?? false,
          pointVente: data.pointVente,
          statut: ['Entrée', 'Vente', 'Sortie'].includes(data.type)
            ? ('Validée' as const)
            : ('En Attente' as const),
        };
      });

      const results = await Promise.allSettled(
        mouvements.map((m) =>
          dispatch(
            // @ts-ignore
            // @ts-ignore
            // @ts-ignore
            createMouvementStock({
              produit: m.produit,
              // @ts-ignore
              quantite: m.quantite,
              montant: m.montant,
              // @ts-ignore
              type: m.type,
              // @ts-ignore
              // @ts-ignore
              depotCentral: m.depotCentral,
              pointVente: m.pointVente,
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
        console.log(produits);
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

  // checking stock management

  const watchProduits = watch('produits');
  const selectedPointVente = watch('pointVente');

  useEffect(() => {
    if (selectedType === 'Entrée' || selectedType === 'Commande') return; // 🚫 Ne pas vérifier le stock en cas d'entrée

    watchProduits.forEach((prod, index) => {
      if (!prod.produit || !prod.quantite || prod.quantite <= 0) return;

      dispatch(
        checkStock({
          type: selectedType,
          produitId: prod.produit,
          quantite: Number(prod.quantite),
          pointVenteId: selectedPointVente?._id,
        })
      ).then((res) => {
        const result = res.payload;
        if (!result?.suffisant && result.quantiteDisponible < prod.quantite) {
          setError(`produits.${index}.quantite`, {
            type: 'manual',
            message: `Stock disponible : ${result.quantiteDisponible} `,
          });
        } else {
          clearErrors(`produits.${index}.quantite`);
        }
      });
    });
  }, [watchProduits, selectedType, selectedPointVente]);
  //@ts-ignore
  const validateStock = async (value: number) => {
    const produitId = watch('formulaire.produit');
    const type = watch('type');

    if (!produitId || !value || value <= 0) {
      return 'Quantité invalide';
    }
    console.log('type selectionne : ', type);
    if (type === 'Entrée' || type === 'Commande') {
      return true;
    }

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

  const tauxFranc = watch('tauxFranc') || 0;
  const tauxDollar = watch('tauxDollar') || 0;
  const montantDollar = watch('montantDollar') || 0;
  const montantRecu = watch('montantRecu') || 0;
  const rabais = watch('rabais') || 0;
  const remise = watch('remise') || 0;
  const type = watch('type');
  const montantFranc = montantDollar * tauxFranc;
  const valeurRabais = (totalMontant * rabais) / 100;
  const valeurRemise = ((totalMontant - valeurRabais) * remise) / 100;
  const netAPayer = totalMontant - valeurRabais - valeurRemise;
  const reste = montantRecu - netAPayer;
  const pointVente = watch('pointVente');

  const getQuantiteValidationRules = (type: string, index: number) => ({
    required: 'Quantité requise',
    min: { value: 1, message: 'Minimum 1' },
    validate: async (value: any) => {
      if (type === 'Entrée' || type === 'Commande') return true;
      return await validateStock(value);
    },
  });

  const rolesWithFixedPointVente = ['AdminPointVente', 'Vendeur', 'Gerant'];
  const isPointVenteLocked = user && rolesWithFixedPointVente.includes(user.role);
  useEffect(() => {
    if (isPointVenteLocked && user?.pointVente && pointsVente.length > 0) {
      const matchedPV = pointsVente.find(
        (pv) =>
          pv._id === (typeof user.pointVente === 'string' ? user.pointVente : user.pointVente._id)
      );
      //@ts-ignore
      if (matchedPV) setValue('pointVente', matchedPV);
    }
  }, [isPointVenteLocked, user?.pointVente, setValue]);

  useEffect(() => {
    const savedTauxDollar = localStorage.getItem('tauxDollar');
    const savedTauxFranc = localStorage.getItem('tauxFranc');
    if (savedTauxDollar) setValue('tauxDollar', parseFloat(savedTauxDollar));
    if (savedTauxFranc) setValue('tauxFranc', parseFloat(savedTauxFranc));
  }, [setValue]);

  useEffect(() => {
    if (montantFranc > 0) {
      setValue('montantRecu', montantFranc);
    }
  }, [montantFranc]);

  const filteredTypeOptions = useMemo(() => user && getOptionsByRole(user?.role), [user?.role]);

  // Afficher uniquement un seul champ dynamique pour édition

  console.log('liste produit : ', produits);
  const selectedCatId = watch('formulaire.categorie');

  const filteredProduits = allProduits.filter(
    (p) =>
      typeof p.categorie === 'object' &&
      p.categorie !== null &&
      '_id' in p.categorie &&
      (p.categorie as { _id: string })._id == selectedCatId
  );

  return (
    <div className="min-h-screen p-4 text-xs">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Opérations' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none" // Breadcrumb text size might be controlled by PrimeReact theme
        />
        {/* Removed text-2xl, will inherit text-xs or can be set explicitly if needed larger */}
        <h1 className="font-bold text-gray-500 text-[14px]">Gestion des opérations</h1>
      </div>
      <div className="flex  md:flex-wrap gap-6">
        {' '}
        {/* Changed to flex-col for stacking on small screens, md:flex-row for larger */}
        <div className="bg-white p-4 rounded-lg shadow-md w-full">
          <form
            onSubmit={(e) => {
              // Simplified unregister logic, ensure it matches your needs
              if (fields.length > 0 && getValues('formulaire.produit')) {
                unregister('formulaire.produit');
                unregister('formulaire.quantite');
                unregister('formulaire.categorie');
              }
              handleSubmit(onSubmit)(e);
            }}
            className="flex flex-col md:flex-row gap-6"
          >
            {/* Colonne gauche : Formulaire principal */}
            <div className="space-y-4 flex-grow">
              {' '}
              {/* Added flex-grow */}
              {/* Type */}
              <div>
                {/* Removed text-sm from label, it's also invisible */}
                <label className="block font-medium mb-1 invisible">Type</label>
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
                      placeholder="Sélectionner un type"
                      // Dropdown text size might be controlled by PrimeReact theme
                      className={classNames('w-full', { 'p-invalid': !!errors.type })}
                    />
                  )}
                />
                {/* Error message will inherit text-xs */}
                {errors.type && <small className="text-red-700">{errors.type.message}</small>}
              </div>
              {/* Dépôt central (si Entrée) */}
              {watch('type') === 'Entrée' && (
                <div>
                  {/* Label text will inherit text-xs */}
                  <label>
                    <input
                      type="checkbox"
                      {...register('depotCentral', {
                        validate: (value) =>
                          watch('type') !== 'Entrée' ||
                          value === true ||
                          'Vous devez cocher "Dépôt central"',
                      })}
                      disabled={!watch('type')}
                    />{' '}
                    Dépôt central
                  </label>
                  {errors.depotCentral && (
                    <small className="text-red-700">{errors.depotCentral.message}</small>
                  )}
                </div>
              )}
              {/* Point de vente (si non Entrée) */}
              {watch('type') && watch('type') !== 'Entrée' && (
                <div>
                  <label>Point de vente</label>
                  <Controller
                    name="pointVente"
                    control={control}
                    rules={{
                      required:
                        watch('type') && watch('type') !== 'Entrée'
                          ? 'Point de vente est requis'
                          : false,
                    }}
                    render={({ field }) => (
                      <Dropdown
                        {...field}
                        value={field.value} // Ensure value is correctly passed for controlled component
                        options={pointsVente}
                        optionLabel="nom"
                        onChange={(e) => field.onChange(e.value)}
                        placeholder="Sélectionner un point de vente"
                        className="w-full"
                        disabled={!watch('type') || isPointVenteLocked}
                      />
                    )}
                  />
                  {errors.pointVente && (
                    <small className="text-red-700">
                      {errors.pointVente.message || 'Champ requis'}
                    </small>
                  )}
                </div>
              )}
              {/* Produits */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label>Catégorie</label>
                    <Controller
                      name="formulaire.categorie"
                      control={control}
                      render={({ field }) => (
                        <Dropdown
                          {...field}
                          options={categories.map((cat) => ({ label: cat.nom, value: cat._id }))}
                          onChange={(e) => field.onChange(e.value)}
                          placeholder="Choisir une catégorie"
                          className="w-full"
                          disabled={!watch('type')}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label>Produit</label>
                    <Controller
                      name="formulaire.produit"
                      control={control}
                      render={({ field }) => (
                        <Dropdown
                          {...field}
                          options={filteredProduits.map((p) => ({ label: p.nom, value: p._id }))}
                          placeholder="Choisir un produit"
                          className="w-full"
                          onChange={(e) => field.onChange(e.value)}
                        />
                      )}
                    />
                    {errors.formulaire?.produit && (
                      <small className="text-red-700">{errors.formulaire.produit.message}</small>
                    )}
                  </div>

                  <div>
                    <label>Quantité</label>
                    <Controller
                      name="formulaire.quantite"
                      // @ts-ignore
                      control={control}
                      // @ts-ignore
                      // @ts-ignore
                      render={({ field }) => (
                        <InputText
                          type="number"
                          value={
                            field.value !== undefined && field.value !== null
                              ? String(field.value)
                              : ''
                          }
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className={`w-full ${errors.formulaire?.quantite ? 'p-invalid' : ''}`}
                        />
                      )}
                    />
                    {errors.formulaire?.quantite && (
                      <small className="text-red-700">
                        {errors.formulaire.quantite.message || 'Quantité requise'}
                      </small>
                    )}
                  </div>
                </div>

                {/* Bouton Ajouter / Modifier */}
                <div className="flex gap-4 justify-end">
                  <Button
                    type="button"
                    className="!bg-green-700" // Button text size might be controlled by PrimeReact theme
                    severity={undefined}
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

            <Divider layout="vertical" className="hidden md:block" />

            {/* Colonne droite : Taux */}
            <div className="space-y-4 flex-shrink-0 md:w-1/3">
              {' '}
              {/* Added flex-shrink-0 and width */}
              <div className="flex flex-row gap-2">
                <div>
                  {/* Removed text-sm */}
                  <label className="block font-medium mb-1 text-gray-500">Taux dollar</label>
                  <InputText
                    type="number"
                    value={
                      watch('tauxDollar') !== undefined && watch('tauxDollar') !== null
                        ? String(watch('tauxDollar'))
                        : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== '' && !isNaN(Number(value))) {
                        setValue('tauxDollar', Number(value));
                        localStorage.setItem('tauxDollar', value);
                      } else {
                        setValue('tauxDollar', 0);
                        localStorage.removeItem('tauxDollar');
                      }
                    }}
                    className="w-full" // InputText internal text size might be controlled by PrimeReact theme
                  />
                </div>

                <div>
                  {/* Removed text-sm */}
                  <label className="block font-medium mb-1 text-gray-500">Taux en franc</label>
                  <InputText
                    type="number"
                    value={
                      watch('tauxFranc') !== undefined && watch('tauxFranc') !== null
                        ? String(watch('tauxFranc'))
                        : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== '' && !isNaN(Number(value))) {
                        setValue('tauxFranc', Number(value));
                        localStorage.setItem('tauxFranc', value);
                      } else {
                        setValue('tauxFranc', 0);
                        localStorage.removeItem('tauxFranc');
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>
              {/* zone pour montant de conversion */}
              <div className="flex flex-wrap md:flex-nowrap gap-4 w-full">
                <div className="w-full md:w-3/5 min-w-0">
                  {/* Removed text-sm */}
                  <label className="block font-medium text-gray-500">Montant reçu en $</label>
                  <InputText
                    type="number"
                    {...register('montantDollar')}
                    className="w-full"
                    onBlur={() => setValue('montantFranc', montantFranc)} // This might not work as expected, montantFranc is a string
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setValue('montantFranc', montantFranc); // Same as above
                    }}
                  />
                </div>

                <div className="w-full md:w-2/5 min-w-0">
                  {/* Removed text-sm */}
                  <label className="block font-medium text-gray-500">Montant converti</label>
                  {/* Text will inherit text-xs */}
                  <div className="w-full border rounded-md p-3 text-white bg-gray-500">
                    {montantFranc} FC
                  </div>
                </div>
              </div>
              {/* zone de reduction */}
              <div className="gap-2 w-full">
                {/* Removed text-xl */}
                <h3 className="text-gray-500">Zones de Reduction</h3>
                <Divider layout="horizontal" className="mb-2" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {/* Removed text-sm */}
                    <label className="block font-medium text-gray-500">Rabais (%)</label>
                    <InputText type="number" {...register('rabais')} className="w-full" />
                  </div>
                  <div>
                    {/* Removed text-sm */}
                    <label className="block font-medium text-gray-500">Remise (%)</label>
                    <InputText type="number" {...register('remise')} className="w-full" />
                  </div>
                  <div>
                    {/* Removed text-sm */}
                    <label className="block font-medium text-gray-500">Valeur rabais</label>
                    <div className="w-full border rounded-md p-2 text-right bg-gray-500 text-gray-100">
                      {valeurRabais} FC
                    </div>
                  </div>
                  <div>
                    {/* Removed text-sm */}
                    <label className="block font-medium text-gray-500">Valeur remise</label>
                    <div className="w-full border rounded-md p-2 text-right bg-gray-500 text-gray-100">
                      {valeurRemise} FC
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
        {/* zone de recapitulation */}
        <div className="bg-white p-6 rounded-2xl shadow-xl w-full ">
          {' '}
          {/* Adjusted width for recap */}
          {/* Removed text-xl */}
          <h3 className="font-bold text-gray-800 mb-6">Récapitulatif</h3>
          <div className="flex flex-col gap-6">
            {' '}
            {/* Simplified to single column for recap */}
            <div className="space-y-6">
              {type && type !== 'Entrée' && pointVente && (
                <div className="border p-3 rounded-lg bg-gray-50 text-gray-500">
                  <div className="font-semibold">Point de vente sélectionné :</div>
                  <div>Nom : {pointVente.nom}</div>
                  <div>Adresse : {pointVente.adresse}</div>
                  <div>Région : {pointVente.region?.nom}</div>
                  <div>Ville : {pointVente.region?.ville}</div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-500">Détails par produit</h4>
                <Accordion activeIndex={0}>
                  <AccordionTab header="Opérations effectuées">
                    {/* AccordionTab header text size might be controlled by PrimeReact theme */}
                    <DataTable
                      value={watch('produits') || []}
                      responsiveLayout="scroll"
                      size="small"
                      className="text-[11px]"
                    >
                      <Column header="#" body={(_, i) => i.rowIndex + 1} />
                      <Column
                        field="produit"
                        header="Produit"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          return produit?.nom || '-';
                        }}
                      />
                      <Column
                        field="quantite"
                        header="Quantité"
                        body={(rowData) => rowData.quantite || '-'}
                      />
                      <Column
                        header="Prix unitaire"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          if (!produit) return '-';
                          // const prix = ['Livraison', 'Entrée'].includes(type)
                          //   ? produit.prix
                          //   : produit.prixVente;
                          return `${produit.prix} FC`;
                        }}
                      />
                      <Column
                        header="Montant"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          if (!produit) return '-';
                          // const prix = ['Livraison', 'Entrée'].includes(type)
                          //   ? produit.prix
                          //   : produit.prixVente;
                          const quantite = rowData.quantite ?? 0;
                          return `${quantite * produit.prix} FC`;
                        }}
                      />
                      <Column
                        header="Marge"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          if (!produit) return '-';
                          const quantite = rowData.quantite ?? 0;
                          const marge = produit?.marge ?? 0;
                          const montant = quantite * produit.prix || 0;
                          return `${((montant * marge) / 100).toFixed(2)} FC`;
                        }}
                      />
                      <Column
                        header="prix de vente"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          if (!produit) return '-';
                          const quantite = rowData.quantite ?? 0;
                          const marge = produit?.marge ?? 0;
                          const montant = quantite * produit.prix || 0;
                          const margeVal = ((montant * marge) / 100).toFixed(2);
                          //return `${montant + parseFloat(margeVal).toFixed(2)} FC`;
                          return `${(montant + parseFloat(margeVal)).toFixed(2)} FC`;
                        }}
                      />
                      <Column
                        header="TVA"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          if (!produit) return '-';
                          const quantite = rowData.quantite ?? 0;
                          const marge = produit?.marge ?? 0;
                          const tva = produit?.tva ?? 0;
                          const montant = quantite * produit.prix || 0;
                          const margeVal = ((montant * marge) / 100).toFixed(2);
                          const netTopay = (montant + parseFloat(margeVal)).toFixed(2);
                          if (tva === 0) return '0 FC';
                          if (isNaN(Number(netTopay)) || Number(netTopay) <= 0) return '0 FC';
                          // Calcul de la TVA
                          const tvaValeur = ((parseInt(netTopay) * tva) / 100).toFixed(2);

                          if (isNaN(parseFloat(tvaValeur)) || parseFloat(tvaValeur) <= 0)
                            return '0 FC';
                          return `${tvaValeur} FC`;
                        }}
                      />
                      <Column
                        header="TTC"
                        body={(rowData) => {
                          const produit = allProduits.find((p) => p._id === rowData.produit);
                          if (!produit) return '-';
                          const quantite = rowData.quantite ?? 0;
                          const marge = produit?.marge ?? 0;
                          const tva = produit?.tva ?? 0;
                          const montant = quantite * produit.prix || 0;
                          const margeVal = ((montant * marge) / 100).toFixed(2);
                          const netTopay = (montant + parseFloat(margeVal)).toFixed(2);
                          if (tva === 0) return '0 FC';
                          if (isNaN(Number(netTopay)) || Number(netTopay) <= 0) return '0 FC';
                          // Calcul de la TVA
                          const tvaValeur = ((parseInt(netTopay) * tva) / 100).toFixed(2);

                          return `${parseFloat(netTopay) + parseFloat(tvaValeur)} FC`;
                        }}
                      />
                    </DataTable>
                  </AccordionTab>
                </Accordion>
              </div>

              {/* Removed text-lg */}
              <div className="text-right font-semibold text-gray-800">
                Total : {totalMontant.toFixed(2)} FC
              </div>
            </div>
            {/* Financial details section */}
            <div className="space-y-6">
              {type && type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
                <>
                  {/* Removed text-lg */}
                  <div className="text-right font-bold text-green-700">
                    {selectedType === 'Vente' && (
                      <>Montant à payer : {totalMontant.toFixed(2)} FC</>
                    )}

                    {/* Net à payer : {netAPayer} FC */}
                  </div>

                  <div className="space-y-4 flex gap-2">
                    <div className="w-1/2">
                      {/* Removed text-sm */}
                      <label className="block font-medium text-gray-500">
                        Montant reçu en franc
                      </label>
                      <InputText type="number" {...register('montantRecu')} className="w-full" />
                    </div>

                    <div className="w-1/2">
                      {/* Removed text-sm */}
                      <label className="block font-medium text-gray-500">Reste / à retourner</label>
                      <div className="w-full border rounded-md p-3 text-right text-gray-100 bg-gray-500">
                        {reste} FC
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4 border-t mt-4">
                <Button
                  className="mt-4 !bg-green-700"
                  label="Valider l'opération"
                  icon="pi pi-check"
                  onClick={handleSubmit(onSubmit)}
                  severity={undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog /> {/* Ensure this is included if you use confirmDialog */}
    </div>
  );
};

export default Page;
