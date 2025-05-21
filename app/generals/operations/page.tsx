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

  const [selectedType, setSelectedType] = useState<string>('');

  const toast = React.useRef<Toast>(null);

  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  const defaultValues: FormValues = {
    type: '',
    depotCentral: false,
    pointVente: undefined,
    produits: [{ categorie: '', produit: '', quantite: 0 }],
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
    return acc + (produit ? produit.prix * item.quantite : 0);
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
          produit: produitObj._id,
          produitNom: produitObj.nom,
          quantite: item.quantite,
          montant: prix * item.quantite,
          type: data.type,
          depotCentral: data.depotCentral ?? false,
          pointVente: data.pointVente,
          statut: ['Entrée', 'Vente', 'Sortie'].includes(data.type),
        };
      });

      const results = await Promise.allSettled(
        mouvements.map((m) =>
          dispatch(
            createMouvementStock({
              produit: m.produit,
              quantite: m.quantite,
              montant: m.montant,
              type: m.type,
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
                organisation,
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
      return await validateStock(value, index);
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

  const [formulaire, setFormulaire] = useState({
    categorie: '',
    produit: '',
    quantite: 0,
  });

  const selectedCatId = watch('formulaire.categorie');

  const filteredProduits = allProduits.filter((p) => p.categorie._id == selectedCatId);

  return (
    <div className="  min-h-screen p-4">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des opérations' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-500">Gestion des opérations</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <form
            onSubmit={(e) => {
              if (fields.length > 0) {
                unregister('formulaire.produit');
                unregister('formulaire.quantite');
                unregister('formulaire.categorie');
              }
              handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            {/* Type */}
            <div className="w-full flex items-end gap-4">
              {/* Champ Type (50%) avec label fantôme pour alignement */}
              <div className="w-1/2">
                <label className="invisible block text-sm font-medium mb-1">Type</label>
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
                      className={classNames('w-full', { 'p-invalid': !!errors.type })}
                    />
                  )}
                />
                {errors.type && <small className="text-red-700">{errors.type.message}</small>}
              </div>

              {/* Taux Dollar */}
              <div className="w-1/4">
                <label className="block text-sm font-medium mb-1  text-gray-500">Taux dollar</label>
                <InputText
                  type="number"
                  value={watch('tauxDollar') ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setValue('tauxDollar', value);
                      localStorage.setItem('tauxDollar', value.toString());
                    } else {
                      setValue('tauxDollar', '');
                      localStorage.removeItem('tauxDollar');
                    }
                  }}
                  className="w-full"
                />
              </div>

              {/* Taux Franc */}
              <div className="w-1/4">
                <label className="block text-sm font-medium mb-1  text-gray-500">
                  Taux en franc
                </label>
                <InputText
                  type="number"
                  value={watch('tauxFranc') ?? ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      setValue('tauxFranc', value);
                      localStorage.setItem('tauxFranc', value.toString());
                    } else {
                      setValue('tauxFranc', '');
                      localStorage.removeItem('tauxFranc');
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>

            {/* Dépôt central (si Entrée) */}
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
                  disabled={!watch('type') || isPointVenteLocked}
                />
                {errors.pointVente && <small className="text-red-700">Champ requis</small>}
              </div>
            )}

            <div className="space-y-6">
              {/* Produits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* Catégorie */}
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

                {/* Produit */}
                <div>
                  <label>Produit</label>
                  <Controller
                    name="formulaire.produit"
                    control={control}
                    // rules={showFormulaire ? { required: 'Produit requis' } : {}}
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

                {/* Quantité */}
                <div>
                  <label>Quantité</label>
                  <Controller
                    name="formulaire.quantite"
                    control={control}
                    render={({ field }) => (
                      <InputText
                        type="number"
                        value={field.value}
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
                  severity={undefined}
                  icon={editingIndex !== null ? 'pi pi-check' : 'pi pi-plus'}
                  label={editingIndex !== null ? 'Modifier' : 'Ajouter un produit'}
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

                    append(getValues('formulaire'));
                    resetField('formulaire');
                  }}
                />
              </div>
            </div>
          </form>
        </div>

        {/* zone de recapitulation */}
        <div className="bg-white p-6 rounded-2xl shadow-xl space-y-6">
          <h3 className="text-xl font-bold text-gray-800">Récapitulatif</h3>

          {(() => {
            const montantFranc = montantDollar * tauxFranc;
            const produits = watch('produits') || [];
            const totalMontant = produits.reduce((acc, item) => {
              const produit = allProduits.find((p) => p._id === item.produit);
              const prix = produit
                ? ['Livraison', 'Entrée'].includes(type)
                  ? produit.prix
                  : produit.prixVente
                : 0;
              return acc + item.quantite * prix;
            }, 0);

            const valeurRabais = Number(((totalMontant * rabais) / 100).toFixed(2));
            const valeurRemise = Number(
              (((totalMontant - valeurRabais) * remise) / 100).toFixed(2)
            );
            const netAPayer = Number((totalMontant - valeurRabais - valeurRemise).toFixed(2));
            const reste = Number((montantRecu - netAPayer).toFixed(2));

            return (
              <>
                {type !== 'Entrée' && (
                  <>
                    {['Livraison', 'Commande'].includes(type) && pointVente && (
                      <div className="border p-3 rounded-lg bg-gray-50  text-gray-500">
                        <div className="font-semibold">Point de vente sélectionné :</div>
                        <div>Nom : {pointVente.nom}</div>
                        <div>Adresse : {pointVente.adresse}</div>
                        <div>Région : {pointVente.region?.nom}</div>
                        <div>Ville : {pointVente.region?.ville}</div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <h4 className="font-semibold  text-gray-500">Détails par produit</h4>
                  <Accordion>
                    <AccordionTab header="Opérations effectuées">
                      <DataTable value={produits} responsiveLayout="scroll">
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
                            const prix = ['Livraison', 'Entrée'].includes(type)
                              ? produit.prix
                              : produit.prixVente;
                            return `${prix} FC`;
                          }}
                        />
                        <Column
                          header="Total"
                          body={(rowData) => {
                            const produit = allProduits.find((p) => p._id === rowData.produit);
                            if (!produit) return '-';
                            const prix = ['Livraison', 'Entrée'].includes(type)
                              ? produit.prix
                              : produit.prixVente;
                            return `${rowData.quantite * prix} FC`;
                          }}
                        />
                      </DataTable>
                    </AccordionTab>
                  </Accordion>
                </div>

                <div className="text-right text-lg font-semibold text-gray-800">
                  Total : {totalMontant} FC
                </div>

                {type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium  text-gray-500">Rabais (%)</label>
                      <InputText type="number" {...register('rabais')} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium  text-gray-500">Remise (%)</label>
                      <InputText type="number" {...register('remise')} className="w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium  text-gray-500">
                        Valeur rabais
                      </label>
                      <div className="w-full border rounded-md p-2   text-right">
                        {valeurRabais} FC
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium  text-gray-500">
                        Valeur remise
                      </label>
                      <div className="w-full border rounded-md p-2   text-right">
                        {valeurRemise} FC
                      </div>
                    </div>
                  </div>
                )}

                {type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
                  <div className="text-right text-lg font-bold text-green-700">
                    Net à payer : {netAPayer} FC
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  {type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium  text-gray-500">
                          Montant reçu en dollar
                        </label>
                        <InputText
                          type="number"
                          {...register('montantDollar')}
                          className="w-full"
                          onBlur={() => setValue('montantFranc', montantFranc)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setValue('montantFranc', montantFranc);
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium  text-gray-500">
                          Montant converti en francs
                        </label>
                        <div className="w-full border rounded-md p-2   text-gray-800">
                          {montantFranc} FC
                        </div>
                      </div>
                    </>
                  )}

                  {type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
                    <div>
                      <label className="block text-sm font-medium  text-gray-500">
                        Montant reçu en franc
                      </label>
                      <InputText type="number" {...register('montantRecu')} className="w-full" />
                    </div>
                  )}

                  {type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
                    <div>
                      <label className="block text-sm font-medium  text-gray-500">
                        Reste / à retourner
                      </label>
                      <div className="w-full border rounded-md p-2   text-right">{reste} FC</div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button
                    className="mt-4"
                    label="Valider l'opération"
                    icon="pi pi-check"
                    onClick={handleSubmit(onSubmit)}
                    severity={undefined}
                  />
                </div>
              </>
            );
          })()}
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
};

export default Page;
