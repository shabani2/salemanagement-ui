/* eslint-disable @typescript-eslint/ban-ts-comment */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

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
import { checkStock } from '@/stores/slices/stock/stockSlice';
import { User } from '@/Models/UserType';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { downloadPdfFile, generateStockPdf } from '@/stores/slices/document/pdfGenerator';
import { destinateur, organisation, serie } from '@/lib/Constants';

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
  remise?: number;
  rabais?: number;
  montantRecu?: number;
  montantDollar?: number;
  montantFranc?: number;
  tauxFranc?: number;
  tauxDollar?: number;
};

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
  const [stockRestant, setStockRestant] = useState<{ [index: number]: number }>({});
  const [disableAdd, setDisableAdd] = useState(false);

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
    setError,
    clearErrors,
  } = useForm<FormValues>({
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'produits' });

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
          statut: data.type === 'Entrée',
        };
      });

      const results = await Promise.allSettled(
        mouvements.map((m) =>
          dispatch(
            createMouvementStock({
              //@ts-ignore
              produit: m.produit,
              quantite: m.quantite,
              montant: m.montant, //@ts-ignore
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

      if (allOk) {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Tous les mouvements ont été enregistrés',
          life: 3000,
        });

        // ✅ Ouverture du Dialog pour PDF
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
        detail: 'Une erreur globale est survenue',
        life: 4000,
      });
    }
  };

  // checking stock management

  const watchProduits = watch('produits');
  const selectedPointVente = watch('pointVente');

  useEffect(() => {
    if (selectedType === 'Entrée') return; // 🚫 Ne pas vérifier le stock en cas d'entrée

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
  const validateStock = async (value, index) => {
    const produitId = watch(`produits.${index}.produit`);
    const type = watch('type');

    if (!produitId || !value || value <= 0) {
      setDisableAdd(true);
      return 'Quantité invalide';
    }

    // ✅ Si Entrée, on ne valide pas le stock
    if (type === 'Entrée') {
      setDisableAdd(false);
      return true;
    }

    const result = await dispatch(
      checkStock({
        type,
        produitId,
        quantite: Number(value),
        pointVenteId: type !== 'Entrée' ? selectedPointVente?._id : undefined,
      })
    ).unwrap();

    const isValid = result.suffisant && result.quantiteDisponible >= value;

    if (!isValid) {
      setDisableAdd(true); //@ts-ignore
      setValue(`produits.${index}.quantite`, undefined);
    } else {
      setDisableAdd(false);
    }

    return isValid ? true : `Stock disponible : ${result.quantiteDisponible}`;
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
      if (type === 'Entrée') return true;
      return await validateStock(value, index);
    },
  });

  useEffect(() => {
    const savedTauxDollar = localStorage.getItem('tauxDollar');
    const savedTauxFranc = localStorage.getItem('tauxFranc');
    if (savedTauxDollar) setValue('tauxDollar', parseFloat(savedTauxDollar));
    if (savedTauxFranc) setValue('tauxFranc', parseFloat(savedTauxFranc));
  }, [setValue]);

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
                    disabled={!watch('type')}
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
                  disabled={!watch('type')}
                />
                {errors.pointVente && <small className="text-red-500">Champ requis</small>}
              </div>
            )}

            {fields.map((field, index) => {
              const selectedCatId = watch(`produits.${index}.categorie`);
              const selectedProduitId = watch(`produits.${index}.produit`); //@ts-ignore
              const filteredProduits = allProduits.filter((p) => p.categorie._id === selectedCatId);

              return (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label>Catégorie</label>
                    <Dropdown
                      value={selectedCatId}
                      options={categories.map((cat) => ({ label: cat.nom, value: cat._id }))}
                      onChange={(e) => setValue(`produits.${index}.categorie`, e.value)}
                      placeholder="Choisir une catégorie"
                      className="w-full"
                      disabled={!watch('type')}
                    />
                  </div>
                  <div>
                    <label>Produit</label>
                    <Dropdown
                      value={selectedProduitId}
                      options={filteredProduits.map((p) => ({ label: p.nom, value: p._id }))}
                      onChange={(e) => setValue(`produits.${index}.produit`, e.value)}
                      placeholder="Choisir un produit"
                      className="w-full"
                      disabled={!watch('type')}
                    />
                  </div>
                  <div>
                    <label>Quantité</label>
                    <InputText
                      type="number"
                      {...register(
                        `produits.${index}.quantite`,
                        getQuantiteValidationRules(watch('type'), index)
                      )}
                      onBlur={async () => {
                        if (watch('type') !== 'Entrée') {
                          const value = watch(`produits.${index}.quantite`);
                          await validateStock(value, index);
                        }
                      }}
                      className="w-full"
                      disabled={!watch('type')}
                    />

                    {errors.produits?.[index]?.quantite && (
                      <small className="text-red-500">
                        {errors.produits[index].quantite.message || 'Quantité requise'}
                      </small>
                    )}
                  </div>
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    onClick={() => remove(index)}
                    disabled={!watch('type')}
                  />
                </div>
              );
            })}

            <Button
              type="button"
              icon="pi pi-plus"
              label="Ajouter un produit"
              onClick={() => append({ categorie: '', produit: '', quantite: 0 })}
              disabled={!watch('type') || disableAdd}
            />
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

            const valeurRabais = (totalMontant * rabais) / 100;
            const valeurRemise = ((totalMontant - valeurRabais) * remise) / 100;
            const netAPayer = totalMontant - valeurRabais - valeurRemise;
            const reste = montantRecu - netAPayer;

            return (
              <>
                {type !== 'Entrée' && (
                  <>
                    {/* Ligne 1: Taux et conversion */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Taux du jour en dollar
                        </label>
                        <InputText
                          type="number"
                          // @ts-ignore
                          value={watch('tauxDollar') ?? ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value)) {
                              setValue('tauxDollar', value);
                              localStorage.setItem('tauxDollar', value.toString());
                            } else {
                              // @ts-ignore
                              setValue('tauxDollar', '');
                              localStorage.removeItem('tauxDollar');
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Taux en franc
                        </label>
// @ts-ignore
                        <InputText
                          type="number"
                          // @ts-ignore
                          value={watch('tauxFranc') ?? ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value)) {
                              setValue('tauxFranc', value);
                              localStorage.setItem('tauxFranc', value.toString());
                            } else {
                              // @ts-ignore
                              setValue('tauxFranc', '');
                              localStorage.removeItem('tauxFranc');
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Montant en dollar
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
                        <label className="block text-sm font-medium text-gray-700">
                          Montant en francs
                        </label>
                        <div className="w-full border rounded-md p-2 bg-gray-100 text-gray-800">
                          {montantFranc} FC
                        </div>
                      </div>
                    </div>

                    {/* Ligne Infos point de vente (Livraison) */}
                    {type === 'Livraison' && pointVente && (
                      <div className="border p-3 rounded-lg bg-gray-50 text-gray-700">
                        <div className="font-semibold">Point de vente sélectionné :</div>
                        <div>Nom : {pointVente.nom}</div>
                        <div>Adresse : {pointVente.adresse}</div>
                        <div>Région : {pointVente.region?.nom}</div>
                        <div>Ville : {pointVente.region?.ville}</div>
                      </div>
                    )}
                  </>
                )}

                {/* Détails produits (visible aussi pour Entrée) */}
                <div>
                  <h4 className="font-semibold text-gray-700">Détails par produit</h4>
                  <ul className="space-y-2">
                    {produits.map((item, idx) => {
                      const produit = allProduits.find((p) => p._id === item.produit);
                      const prix = produit
                        ? ['Livraison', 'Entrée'].includes(type)
                          ? produit.prix
                          : produit.prixVente
                        : 0;
                      if (!produit) return null;
                      return (
                        <li key={idx} className="flex justify-between text-gray-700">
                          <span>{produit.nom}</span>
                          <span>
                            {item.quantite} x {prix} = {item.quantite * prix} FC
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Ligne 3: Total */}
                <div className="text-right text-lg font-semibold text-gray-800">
                  Total : {totalMontant} FC
                </div>

                {/* Ligne 4: Rabais et remise (caché si Livraison ou Entrée) */}
                {type !== 'Livraison' && type !== 'Entrée' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Rabais (%)
                        </label>
                        <InputText type="number" {...register('rabais')} className="w-full" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valeur rabais
                        </label>
                        <div className="w-full border rounded-md p-2 bg-gray-100 text-right">
                          {valeurRabais} FC
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Remise (%)
                        </label>
                        <InputText type="number" {...register('remise')} className="w-full" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valeur remise
                        </label>
                        <div className="w-full border rounded-md p-2 bg-gray-100 text-right">
                          {valeurRemise} FC
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ligne 5: Net à payer (caché si Livraison ou Entrée) */}
                {type !== 'Livraison' && type !== 'Entrée' && (
                  <div className="text-right text-lg font-bold text-green-700">
                    Net à payer : {netAPayer} FC
                  </div>
                )}

                {/* Ligne 6: Paiement (caché si Livraison ou Entrée) */}
                {type !== 'Livraison' && type !== 'Entrée' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Montant reçu
                      </label>
                      <InputText type="number" {...register('montantRecu')} className="w-full" />
                    </div>
                    <div className="text-right">
                      <label className="block text-sm font-medium text-gray-700">
                        Reste / à retourner
                      </label>
                      <div className="w-full border rounded-md p-2 bg-gray-100">{reste} FC</div>
                    </div>
                  </div>
                )}

                {/* Bouton de validation toujours visible */}
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button
                    className="mt-4"
                    label="Valider l'opération"
                    icon="pi pi-check"
                    onClick={handleSubmit(onSubmit)}
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
