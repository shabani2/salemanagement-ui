/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { classNames } from 'primereact/utils';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import { selectAllCategories, fetchCategories } from '@/stores/slices/produits/categoriesSlice';
import { Produit, Categorie } from '@/Models/produitsType';
import {
  fetchProduits,
  selectAllProduits,
  searchProduits,
} from '@/stores/slices/produits/produitsSlice';
import { createMouvementStock } from '@/stores/slices/mvtStock/mvtStock';

import { PointVente } from '@/Models/pointVenteType';
import {
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';

import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';

import { checkStock } from '@/stores/slices/stock/stockSlice';
import { User } from '@/Models/UserType';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { downloadPdfFile, generateStockPdf } from '@/stores/slices/document/pdfGenerator';
import { destinateur, organisation, serie } from '@/lib/Constants';
import { getOptionsByRole, getRegionId } from '@/lib/utils';
import { Divider } from 'primereact/divider';
import { fetchOrganisations, Organisation } from '@/stores/slices/organisation/organisationSlice';
import { Region } from '@/Models/regionTypes';
import { Badge } from 'primereact/badge';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';

/* ----------------------------- Helpers ----------------------------- */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const safeNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const getId = (v: string | { _id?: string } | null | undefined) =>
  (typeof v === 'string' ? v : v?._id) ?? undefined;

/** Décode tous les formats possibles renvoyés par l’API pour la recherche produits */
const extractProduitList = (payload: any): Produit[] => {
  if (Array.isArray(payload)) return payload as Produit[];
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data as Produit[];
    if (Array.isArray(payload.docs)) return payload.docs as Produit[];
    if (Array.isArray(payload.items)) return payload.items as Produit[];
  }
  return [];
};

/* ----------------------------- Types ------------------------------- */

type FormValues = {
  type: string;
  depotCentral?: boolean;
  pointVente?: string | PointVente | null;
  user?: string | User;
  region?: string | Region;
  produits: { produit: string; quantite: number }[];
  formulaire: { produit: string; quantite: number };
  remise?: number;
  rabais?: number;
  montantRecu?: number; // en FC
  montantDollar?: number; // en $
  montantFranc?: number; // calculé à l’écran seulement
  tauxFranc?: number;
  tauxDollar?: number;
};

/* ------------------------------ Page ------------------------------- */

const Page = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const categories = useSelector((s: RootState) => asArray<Categorie>(selectAllCategories(s)));
  const pointsVente = useSelector((s: RootState) => asArray<PointVente>(selectAllPointVentes(s)));
  const allProduits = useSelector((s: RootState) => asArray<Produit>(selectAllProduits(s)));
  const regions = useSelector((s: RootState) => asArray<Region>(selectAllRegions(s)));

  const [org, setOrg] = useState<Organisation[]>([]);
  // Livraison (SuperAdmin) : cible = pointVente | region
  const [livraisonCible, setLivraisonCible] = useState<'pointVente' | 'region'>('pointVente');
  const [selectedRegionLivraison, setSelectedRegionLivraison] = useState<string | null>(null);

  // Autocomplete PrimeReact: texte affiché et suggestions
  const [searchText, setSearchText] = useState<string>(''); // ce qu’on voit dans l’input
  const [productSuggestions, setProductSuggestions] = useState<Produit[]>([]);
  const productCacheRef = useRef<Record<string, Produit>>({});

  // user
  const user: User | null =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem('user-agricap') || 'null');
          } catch {
            return null;
          }
        })()
      : null;

  const defaultValues: FormValues = {
    type: '',
    depotCentral: false,
    pointVente:
      user && user?.role && !['SuperAdmin', 'AdminRegion'].includes(user?.role)
        ? ((typeof (user as any).pointVente === 'string'
            ? (user as any).pointVente
            : (user as any).pointVente?._id) ?? null)
        : null,
    region: typeof user?.region === 'string' ? user.region : (user as any)?.region?._id,
    user: typeof user === 'object' && (user as any)?._id ? (user as any)._id : undefined,
    produits: [],
    formulaire: { produit: '', quantite: 0 },
    remise: 0,
    rabais: 0,
    tauxDollar: undefined,
    tauxFranc: undefined,
    montantDollar: 0,
    montantRecu: 0,
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
    trigger,
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'produits' });
  const watchProduits = watch('produits') ?? [];
  const selectedPointVente = watch('pointVente');
  const type = watch('type');

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdminRegion = user?.role === 'AdminRegion';
  const isVenteOrSortie = ['Vente', 'Sortie'].includes(type || '');
  const isLivraison = type === 'Livraison';

  const tauxFranc = safeNumber(watch('tauxFranc'), 0);
  const tauxDollar = safeNumber(watch('tauxDollar'), 0);
  const montantDollar = safeNumber(watch('montantDollar'), 0);
  const montantRecu = safeNumber(watch('montantRecu'), 0);
  const rabais = safeNumber(watch('rabais'), 0);
  const remise = safeNumber(watch('remise'), 0);

  const montantFranc = useMemo(() => montantDollar * tauxFranc, [montantDollar, tauxFranc]);

  /* ------------------------- Chargements initiaux -------------------------- */
  const regionId = getRegionId((user as User)?.region);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          dispatch(fetchOrganisations()).then((res) => setOrg(res.payload)),
          dispatch(fetchCategories()),
          dispatch(fetchProduits()),
        ]);
      } catch (e) {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Chargement initial incomplet.',
          life: 4000,
        });
      }
    })();
  }, [dispatch]);

  // Charger PV selon rôle courant
  useEffect(() => {
    if (!user?.role) return;

    (async () => {
      if (user.role === 'SuperAdmin') {
        await dispatch(fetchPointVentes());
      } else if (isNonEmptyString(regionId)) {
        await dispatch(fetchPointVentesByRegionId({ regionId }));
      }
    })();
  }, [dispatch, user?.role, regionId]);

  // Charger régions quand SuperAdmin choisit Livraison
  useEffect(() => {
    if (isSuperAdmin && isLivraison) {
      dispatch(fetchRegions());
    }
  }, [dispatch, isSuperAdmin, isLivraison]);

  // Lock PV pour AdminPV/Vendeur/Logisticien.
  const rolesWithFixedPointVente = ['AdminPointVente', 'Vendeur', 'Logisticien'];
  const isPointVenteLocked = !!(user && rolesWithFixedPointVente.includes(user.role as any));

  useEffect(() => {
    // aligne PV si verrouillé
    if (isPointVenteLocked && user?.pointVente && pointsVente.length > 0) {
      const targetId = typeof user.pointVente === 'string' ? user.pointVente : user.pointVente?._id;
      if (targetId && getValues('pointVente') !== targetId) setValue('pointVente', targetId);
    }
    // aligne région
    const regionVal = getValues('region');
    const userRegionId =
      typeof user?.region === 'string' ? user?.region : (user as any)?.region?._id;
    // @ts-ignore
    if (userRegionId && regionVal !== userRegionId) setValue('region', userRegionId);
  }, [isPointVenteLocked, pointsVente, user?.pointVente, user?.region, getValues, setValue]);

  // Lire taux depuis localStorage au mount
  useEffect(() => {
    try {
      const td = Number(localStorage.getItem('tauxDollar') ?? '');
      const tf = Number(localStorage.getItem('tauxFranc') ?? '');
      if (Number.isFinite(td) && td > 0) setValue('tauxDollar', td);
      if (Number.isFinite(tf) && tf > 0) setValue('tauxFranc', tf);
    } catch {}
  }, [setValue]);

  /* ------------------------------ UI helpers ------------------------------- */
  const filteredTypeOptions = useMemo(
    () => (user ? getOptionsByRole((user as any).role) : []),
    [user]
  );

  /* ----------------------------- Calculs panier ---------------------------- */
  const computeLine = useCallback((p: Produit, qte: number, currentType: string) => {
    const prixBase =
      currentType === 'Vente'
        ? safeNumber((p as any).prixVente, safeNumber(p.prix))
        : safeNumber(p.prix);
    const montant = prixBase * qte;

    if (currentType === 'Vente') {
      const marge = (montant * safeNumber(p.marge, 0)) / 100;
      const net = montant + marge;
      const tva = (net * safeNumber(p.tva, 0)) / 100;
      return { unit: prixBase, totalTtc: net + tva };
    }
    return { unit: prixBase, totalTtc: montant };
  }, []);

  const totalMontant = useMemo(() => {
    const currentType = type || '';
    const t = asArray<{ produit: string; quantite: number }>(watchProduits).reduce((acc, item) => {
      const produit =
        asArray<Produit>(allProduits).find((p) => p?._id === item.produit) ||
        productCacheRef.current[item.produit];
      if (!produit) return acc;

      const qte = safeNumber(item.quantite, 0);
      const { totalTtc } = computeLine(produit, qte, currentType);
      return acc + totalTtc;
    }, 0);
    return Number.isFinite(t) ? t : 0;
  }, [watchProduits, allProduits, type, computeLine]);

  const valeurRabais = useMemo(() => (totalMontant * rabais) / 100, [totalMontant, rabais]);
  const valeurRemise = useMemo(
    () => ((totalMontant - valeurRabais) * remise) / 100,
    [totalMontant, valeurRabais, remise]
  );
  const netAPayer = useMemo(
    () => totalMontant - valeurRabais - valeurRemise,
    [totalMontant, valeurRabais, valeurRemise]
  );
  const reste = useMemo(() => {
    const totalRecuFC = montantRecu + montantFranc;
    return totalRecuFC - netAPayer;
  }, [montantRecu, montantFranc, netAPayer]);

  /* --------------------------- Validation de stock ------------------------- */
 const validateStock = useCallback(
  async (value: number) => {
    const produitId = getValues('formulaire.produit');
    if (!isNonEmptyString(produitId) || !value || value <= 0) return 'Quantité invalide';

    const op = getValues('type') as 'Entrée' | 'Sortie' | 'Vente' | 'Livraison' | 'Commande';

    // Entrée / Commande ne nécessitent pas de contrôle de dispo
    if (op === 'Entrée' || op === 'Commande') return true;

    const pvId =
      typeof selectedPointVente === 'string'
        ? selectedPointVente
        : (selectedPointVente as any)?._id;

    const base = { type: op, produitId, quantite: value } as const;

    try {
      /* ---------------------------------------------------------
       * SUPERADMIN  => Toujours contrôle au dépôt central
       * (Vente / Sortie / Livraison : la source est le dépôt)
       * --------------------------------------------------------- */
      if (isSuperAdmin) {
        const result = await dispatch(checkStock({ ...base, depotCentral: true })).unwrap();
        if (!result?.suffisant || safeNumber(result?.quantiteDisponible, 0) < value) {
          return `Stock insuffisant (central). Disponible: ${safeNumber(result?.quantiteDisponible, 0)}`;
        }
        return true;
      }

      /* ---------------------------------------------------------
       * ADMIN RÉGION  => Contrôle dans la région
       *  - Vente / Sortie : la source est la région
       *  - Livraison (région -> PV) : la source est la région
       * --------------------------------------------------------- */
      if (isAdminRegion && isNonEmptyString(regionId)) {
        const result = await dispatch(checkStock({ ...base, regionId })).unwrap();
        if (!result?.suffisant || safeNumber(result?.quantiteDisponible, 0) < value) {
          return `Stock insuffisant (région). Disponible: ${safeNumber(result?.quantiteDisponible, 0)}`;
        }
        return true;
      }

      /* ---------------------------------------------------------
       * AUTRES RÔLES (PV)  => Contrôle au point de vente
       *  - Vente / Sortie : source = PV
       *  - Livraison (rare PV -> autre?) : si la source est PV
       * --------------------------------------------------------- */
      if (pvId) {
        const result = await dispatch(checkStock({ ...base, pointVenteId: pvId })).unwrap();
        if (!result?.suffisant || safeNumber(result?.quantiteDisponible, 0) < value) {
          return `Stock insuffisant (point de vente). Disponible: ${safeNumber(result?.quantiteDisponible, 0)}`;
        }
        return true;
      }

      // Si on arrive ici, on n'a trouvé aucun périmètre valide
      return 'Périmètre de stock introuvable';
    } catch {
      return 'Vérification de stock indisponible';
    }
  },
  [
    dispatch,
    selectedPointVente,
    getValues,
    regionId,
    isSuperAdmin,
    isAdminRegion,
    livraisonCible,
    selectedRegionLivraison,
  ]
);

  /* --------------------------- Autocomplete produits ----------------------- */

  const suggestionItemTemplate = useCallback(
    (item: Produit) => {
      const catName =
        typeof item.categorie === 'object' && item.categorie
          ? (item.categorie as any)?.nom
          : categories.find((c) => c._id === (item.categorie as any))?.nom;

      return (
        <div className="flex flex-col">
          <div className="font-medium text-gray-800">{item.nom}</div>
          <div className="text-xs text-gray-500">
            {catName ? `${catName} • ` : ''}Prix: {safeNumber(item.prix).toLocaleString()} FC
          </div>
        </div>
      );
    },
    [categories]
  );

  const completeProduits = async (e: AutoCompleteCompleteEvent) => {
    const q = String(e.query || '').trim();
    if (!q) {
      setProductSuggestions([]);
      return;
    }
    try {
      const action = await dispatch(
        searchProduits({ q, page: 1, limit: 10, includeTotal: false }) as any
      );
      if ((searchProduits as any).fulfilled.match(action)) {
        const list = extractProduitList(action.payload);
        list.forEach((p) => {
          if (p?._id) productCacheRef.current[p._id] = p;
        });
        setProductSuggestions(list);
      } else {
        setProductSuggestions([]);
      }
    } catch {
      setProductSuggestions([]);
    }
  };

  /* ------------------------------- Submit ---------------------------------- */
  const onSubmit = useCallback(
  async (data: FormValues) => {
    if (!data?.produits?.length) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez ajouter au moins un produit avant de soumettre.',
        life: 4000,
      });
      return;
    }

    // Garde-fous périmètre pour Vente/Sortie
    if (['Vente', 'Sortie'].includes(data.type)) {
      if (isSuperAdmin) {
        // OK central
      } else if (isAdminRegion) {
        if (!isNonEmptyString(regionId)) {
          toast.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Région introuvable pour AdminRegion.',
            life: 4000,
          });
          return;
        }
      }
    }

    // Garde-fou Livraison SuperAdmin -> région
    if (data.type === 'Livraison' && isSuperAdmin && livraisonCible === 'region') {
      if (!isNonEmptyString(selectedRegionLivraison || '')) {
        toast.current?.show({
          severity: 'warn',
          summary: 'Information',
          detail: 'Sélectionnez une région de livraison.',
          life: 3000,
        });
        return;
      }
    }

    try {
      // Préparation des mouvements à créer (source + destination)
      const mouvements = data.produits.map((item) => {
        const produitObj =
          asArray<Produit>(allProduits).find((p) => p?._id === item.produit) ||
          productCacheRef.current[item.produit];
        if (!produitObj) throw new Error('Produit introuvable');

        // Prix: Entrée/Livraison/Sortie => prix d’achat ; Vente => prixVente (fallback prix)
        const prix = ['Entrée', 'Livraison', 'Sortie'].includes(data.type)
          ? safeNumber(produitObj.prix)
          : safeNumber((produitObj as any).prixVente, safeNumber(produitObj.prix));

        // Ids
        const pvId = getId(data.pointVente as any) ?? null;
        const regId = getId(data.region as any) ?? null;
        const userId = getId(data.user as any) ?? null;

        // périmètre (source) selon rôle/type
        let depotCentral = !!data.depotCentral;
        let pointVente: string | null = pvId; // destination potentielle
        let region: string | null = regId;    // destination potentielle

        // Vente / Sortie: exclusivité source par rôle
        if (['Vente', 'Sortie'].includes(data.type)) {
          if (isSuperAdmin) {
            depotCentral = true;     // source = dépôt
            pointVente = null;       // pas de PV source
            // region déjà null/ignorée comme source ici
            region = null;
          } else if (isAdminRegion) {
            depotCentral = false;    // source = région
            pointVente = null;
            // region = regId (déjà défini par le formulaire)
          }
        }

        // Livraison (SuperAdmin): source + destination
        if (data.type === 'Livraison' && isSuperAdmin) {
          if (livraisonCible === 'region') {
            // Source = dépôt central ; Destination = région choisie
            depotCentral = true;
            pointVente = null;
            region = selectedRegionLivraison || null;
          } else {
            // Livraison vers PV : on garde pointVente comme destination (le form l’a fourni)
            // Source par défaut = dépôt si checkbox cochée ; sinon à adapter selon tes règles
            depotCentral = true; // le plus fréquent: central -> PV
            region = null;       // destination = PV, pas région
          }
        }

        return {
          produit: (produitObj as any)._id,
          produitNom: produitObj.nom,
          quantite: safeNumber(item.quantite, 0),
          montant: prix * safeNumber(item.quantite, 0),
          type: data.type,
          depotCentral,          // SOURCE (true si on tire du dépôt)
          pointVente,            // DESTINATION (en livraison vers PV)
          region,                // DESTINATION (en livraison vers région)
          user: userId,
          // statut validé immédiatement pour Entrée/Vente/Sortie; Livraison reste à valider selon ton flux
          statut: ['Entrée', 'Vente', 'Sortie'].includes(data.type),
        };
      });

      // ---- Validation stock (aligne exactement le payload avec checkStock côté API) ----
      for (const m of mouvements) {
        if (['Entrée', 'Commande'].includes(m.type)) continue;

        const isLivraison = m.type === 'Livraison';
        const payload: any = {
          type: m.type,
          produitId: m.produit,
          quantite: m.quantite,
        };

        if (isLivraison) {
          // Livraison : règles source identiques au service
          if (m.depotCentral) {
            // SOURCE = DÉPÔT (même si region/pointVente existent en tant que destination)
            payload.depotCentral = true;
            // NE PAS envoyer regionId / pointVenteId dans ce cas
          } else if (m.region) {
            // SOURCE = RÉGION
            payload.regionId = m.region;
          } else if (m.pointVente) {
            // SOURCE = PV
            payload.pointVenteId = m.pointVente;
          } else {
            // Fallback central
            payload.depotCentral = true;
          }
        } else {
          // Vente / Sortie : exclusivité stricte (central OU région OU PV)
          if (m.depotCentral) payload.depotCentral = true;
          else if (m.region) payload.regionId = m.region;
          else if (m.pointVente) payload.pointVenteId = m.pointVente;
          else {
            toast.current?.show({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Périmètre de stock introuvable pour la vérification.',
              life: 4000,
            });
            return;
          }
        }

        try {
          const result = await dispatch(checkStock(payload)).unwrap();
          if (!result?.suffisant || safeNumber(result?.quantiteDisponible, 0) < m.quantite) {
            toast.current?.show({
              severity: 'error',
              summary: `Stock insuffisant`,
              detail: `${m.produitNom} — dispo: ${safeNumber(result?.quantiteDisponible, 0)}`,
              life: 5000,
            });
            return;
          }
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: `Vérification de stock indisponible pour ${m.produitNom}`,
            life: 4000,
          });
          return;
        }
      }

      // ---- Création des mouvements ----
      const results = await Promise.allSettled(
        mouvements.map((m) => dispatch(createMouvementStock(m as any)))
      );

      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          const produitNom = (mouvements[i] as any).produitNom;
          toast.current?.show({
            severity: 'error',
            summary: `Erreur: ${produitNom}`,
            detail: 'Échec de l’enregistrement',
            life: 7000,
          });
        }
      });

      const allOk = results.every((r) => r.status === 'fulfilled');
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
              }) as any
            );
            if ((generateStockPdf as any).fulfilled.match(result)) {
              downloadPdfFile((result as any).payload, `${data.type}-${serie}.pdf`);
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

        // reset UI
        reset(defaultValues);
        setSearchText('');
        setProductSuggestions([]);
        productCacheRef.current = {};
        setLivraisonCible('pointVente');
        setSelectedRegionLivraison(null);
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur critique',
        detail: 'Échec de l’opération',
        life: 4000,
      });
    }
  },
  [
    dispatch,
    allProduits,
    org,
    user,
    reset,
    isSuperAdmin,
    isAdminRegion,
    regionId,
    livraisonCible,
    selectedRegionLivraison,
  ]
);


  /* ------------------------------- UI -------------------------------------- */

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
                {/* Type d'opération */}
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
                          // reset quick form
                          setValue('formulaire', { produit: '', quantite: 0 } as any);
                          setSearchText('');
                          clearErrors('formulaire.quantite');

                          // Interdire PV pour Vente/Sortie SA/AR
                          const newType = e.value as string;
                          if (
                            (isSuperAdmin || isAdminRegion) &&
                            ['Vente', 'Sortie'].includes(newType)
                          ) {
                            setValue('pointVente', null);
                          }
                          // Reset livraison UI
                          if (newType !== 'Livraison') {
                            setLivraisonCible('pointVente');
                            setSelectedRegionLivraison(null);
                          }
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

                {/* Entrée : SuperAdmin/AR comme avant */}
                {type === 'Entrée' && (
                  <div className="mt-4">
                    {isSuperAdmin ? (
                      <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <label className="flex items-center gap-2 font-medium text-gray-800">
                          <input
                            type="checkbox"
                            {...register('depotCentral')}
                            disabled={!type}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <i className="pi pi-building text-blue-600"></i>
                          Dépôt central
                        </label>
                      </div>
                    ) : isAdminRegion ? (
                      <div className="flex items-center gap-3 font-bold text-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <i className="pi pi-building text-blue-600 text-xl"></i>
                        <div>
                          <div className="font-bold">Dépôt régional</div>
                          <div className="text-sm font-normal">
                            {
                              // @ts-expect-error - compat: external lib types mismatch
                              user?.region?.nom || 'Région non définie'
                            }
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Vente/Sortie : SA/AR -> central/région affichage */}
                {isVenteOrSortie && (
                  <div className="mt-4">
                    {isSuperAdmin && (
                      <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <label className="flex items-center gap-2 font-medium text-gray-800">
                          <input
                            type="checkbox"
                            {...register('depotCentral')}
                            checked
                            onChange={() => {}}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <i className="pi pi-building text-blue-600"></i>
                          Dépôt central (verrouillé)
                        </label>
                      </div>
                    )}

                    {isAdminRegion && (
                      <div className="flex items-center gap-3 font-bold text-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <i className="pi pi-map text-blue-600 text-xl"></i>
                        <div>
                          <div className="font-bold">Région</div>
                          <div className="text-sm font-normal">
                            {/* @ts-expect-error: compat */}
                            {user?.region?.nom || 'Région non définie'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Livraison : SuperAdmin choisit la cible */}
                {isSuperAdmin && isLivraison && (
                  <div className="mt-4 space-y-3 bg-indigo-50 p-4 rounded-xl">
                    <div className="font-medium text-gray-700 flex items-center gap-2">
                      <i className="pi pi-send text-indigo-600"></i>
                      Cible de la livraison
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="livraisonCible"
                          checked={livraisonCible === 'pointVente'}
                          onChange={() => {
                            setLivraisonCible('pointVente');
                          }}
                        />
                        Auprès de point de vente
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="livraisonCible"
                          checked={livraisonCible === 'region'}
                          onChange={() => {
                            setLivraisonCible('region');
                            setValue('pointVente', null);
                          }}
                        />
                        Auprès de région
                      </label>
                    </div>

                    {livraisonCible === 'region' && (
                      <Dropdown
                        value={selectedRegionLivraison || ''}
                        options={regions}
                        optionLabel="nom"
                        optionValue="_id"
                        onChange={(e) => setSelectedRegionLivraison(e.value)}
                        placeholder="Sélectionner une région"
                        className="w-full border-gray-300 rounded-xl"
                      />
                    )}
                  </div>
                )}

                {/* Point de vente pour autres opérations (sauf Vente/Sortie SA/AR et Livraison->région) */}
                {type &&
                  type !== 'Entrée' &&
                  !(
                    (isVenteOrSortie && (isSuperAdmin || isAdminRegion)) ||
                    (isLivraison && isSuperAdmin && livraisonCible === 'region')
                  ) && (
                    <div className="mt-4">
                      <label className="font-medium mb-2 text-gray-700 flex items-center gap-2">
                        <i className="pi pi-store text-blue-500"></i>
                        Point de vente
                      </label>
                      {user && ['SuperAdmin', 'AdminRegion'].includes(user?.role as any) ? (
                        <Controller
                          name="pointVente"
                          control={control}
                          rules={{ required: 'Point de vente est requis' }}
                          render={({ field }) => (
                            <Dropdown
                              value={
                                typeof field.value === 'string'
                                  ? field.value
                                  : (field.value as any)?._id
                              }
                              options={pointsVente}
                              optionLabel="nom"
                              optionValue="_id"
                              onChange={(e) => field.onChange(e.value)}
                              placeholder="Sélectionner un point de vente"
                              className="w-full border-gray-300 rounded-xl"
                              disabled={!type || isPointVenteLocked}
                            />
                          )}
                        />
                      ) : (
                        <Controller
                          name="pointVente"
                          control={control}
                          render={({ field }) => (
                            <Dropdown
                              value={
                                typeof (user as any)?.pointVente === 'string'
                                  ? (user as any).pointVente
                                  : (user as any)?.pointVente?._id
                              }
                              options={
                                (user as any)?.pointVente
                                  ? [
                                      {
                                        ...(typeof (user as any).pointVente === 'object'
                                          ? (user as any).pointVente
                                          : {}),
                                        _id:
                                          typeof (user as any).pointVente === 'string'
                                            ? (user as any).pointVente
                                            : (user as any).pointVente?._id,
                                      },
                                    ]
                                  : []
                              }
                              optionLabel="nom"
                              optionValue="_id"
                              placeholder="Votre point de vente"
                              className="w-full border-gray-300 rounded-xl"
                              disabled
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

                {/* Recherche Produit + Quantité */}
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Recherche Produit (PrimeReact AutoComplete) */}
                    <div>
                      <label className="block font-medium mb-2 text-gray-700 flex items-center gap-2">
                        <i className="pi pi-search text-blue-500"></i>
                        Rechercher un produit
                      </label>

                      <Controller
                        name="formulaire.produit"
                        control={control}
                        render={({ field }) => (
                          <AutoComplete
                            value={searchText} // texte affiché (nom)
                            suggestions={productSuggestions} // objets Produit
                            completeMethod={completeProduits} // appelé à chaque frappe
                            delay={200}
                            field="nom"
                            dropdown
                            placeholder="Tape le nom du produit"
                            itemTemplate={suggestionItemTemplate}
                            className="w-full"
                            appendTo={typeof window !== 'undefined' ? document.body : undefined}
                            panelClassName="z-50"
                            onChange={(e) => {
                              setSearchText(String(e.value ?? '')); // tape libre
                              // ne pas toucher field.onChange ici (on stocke l'id seulement au select)
                              if (!e.value) setProductSuggestions([]);
                            }}
                            onSelect={(e) => {
                              const p: Produit = e.value;
                              if (p && p._id) {
                                productCacheRef.current[p._id] = p;
                                field.onChange(p._id); 
                                setSearchText(p.nom);
                                clearErrors('formulaire.produit');
                              }
                            }}
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
                            className={`w-full border-gray-300 rounded-xl ${
                              errors.formulaire?.quantite ? 'p-invalid border-red-500' : ''
                            }`}
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
                      className="w-full p-3 rounded-xl font-bold transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      icon={null}
                      label="Ajouter Produit"
                      onClick={async () => {
                        const produitId = getValues('formulaire.produit');
                        const qte = safeNumber(getValues('formulaire.quantite'), 0);

                        if (!isNonEmptyString(produitId)) {
                          setError('formulaire.produit', {
                            type: 'manual',
                            message: 'Produit requis',
                          });
                          return;
                        }
                        if (!qte || qte <= 0) {
                          setError('formulaire.quantite', {
                            type: 'manual',
                            message: 'Quantité invalide',
                          });
                          return;
                        }

                        const stockValidation = await validateStock(qte);
                        if (stockValidation !== true) {
                          setError('formulaire.quantite', {
                            type: 'manual',
                            message: String(stockValidation),
                          });
                          return;
                        }

                        const idx = (watchProduits || []).findIndex(
                          (it) => it.produit === produitId
                        );
                        if (idx >= 0) {
                          update(idx, {
                            ...watchProduits[idx],
                            quantite: safeNumber(watchProduits[idx].quantite, 0) + qte,
                          });
                        } else {
                          append({ produit: produitId, quantite: qte });
                        }

                        resetField('formulaire');
                        setSearchText('');
                        setProductSuggestions([]);
                      }}
                    />
                  </div>
                </div>
              </div>
            </form>

            <Divider layout="vertical" className="hidden md:block h-auto bg-gray-200" />

            {/* Panier */}
            <div className="w-full md:w-8/12 ">
              <Card className="h-full border-0 shadow-none">
                <div className="flex items-center gap-2 mb-3 ml-3">
                  <i className="pi pi-list text-indigo-600 text-xl"></i>
                  <h2 className="text-xl font-bold text-gray-800">
                    Detail des operations selectionnees
                  </h2>
                </div>

                {/* Carte PV sélectionné (masquée quand Vente/Sortie SA/AR ou Livraison->région) */}
                {type &&
                  type !== 'Entrée' &&
                  !(
                    (isVenteOrSortie && (isSuperAdmin || isAdminRegion)) ||
                    (isLivraison && isSuperAdmin && livraisonCible === 'region')
                  ) &&
                  selectedPointVente && (
                    <div className="border border-gray-200 p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50 shadow-sm m-3">
                      <div className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="pi pi-map-marker text-blue-500"></i>
                        Point de vente sélectionné
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Nom</div>
                          <div className="font-medium">
                            {(typeof selectedPointVente === 'string'
                              ? pointsVente.find((pv) => pv._id === selectedPointVente)?.nom
                              : (selectedPointVente as any)?.nom) ?? '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Adresse</div>
                          <div className="font-medium">
                            {(typeof selectedPointVente === 'string'
                              ? pointsVente.find((pv) => pv._id === selectedPointVente)?.adresse
                              : (selectedPointVente as any)?.adresse) ?? '-'}
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
                  <Badge value={watchProduits.length} className="ml-2 bg-primary" />
                </div>

                {watchProduits.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-auto max-h-[400px]">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th className="px-4 py-3">Produit</th>
                            <th className="px-4 py-3">Quantité</th>
                            <th className="px-4 py-3">Prix unitaire</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {watchProduits.map((item, index) => {
                            const produit =
                              asArray<Produit>(allProduits).find((p) => p?._id === item.produit) ||
                              productCacheRef.current[item.produit];
                            const qte = safeNumber(item.quantite);
                            const { unit, totalTtc } = produit
                              ? computeLine(produit, qte, type || '')
                              : { unit: 0, totalTtc: 0 };
                            return (
                              <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {produit?.nom ?? 'Produit inconnu'}
                                </td>
                                <td className="px-4 py-3">
                                  <Tag value={qte.toString()} severity="info" rounded />
                                </td>
                                <td className="px-4 py-3">{unit.toFixed(2)} FC</td>
                                <td className="px-4 py-3 font-semibold">
                                  {totalTtc.toFixed(2)} FC
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex gap-2">
                                    <Button
                                      icon="pi pi-pencil"
                                      className="p-button-text p-button-sm"
                                      onClick={() => {
                                        setValue('formulaire', {
                                          produit: item.produit,
                                          quantite: item.quantite,
                                        } as any);
                                        setSearchText(
                                          productCacheRef.current[item.produit]?.nom ||
                                            asArray<Produit>(allProduits).find(
                                              (p) => p?._id === item.produit
                                            )?.nom ||
                                            ''
                                        );
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
                      Ajoutez des produits via le champ de recherche à gauche pour commencer une
                      opération
                    </p>
                  </div>
                )}

                {type && !['Livraison', 'Entrée', 'Commande'].includes(type) && (
                  <>
                    <div className="text-right text-xl font-bold text-green-600 bg-green-50 p-4 rounded-xl">
                      {type === 'Vente' &&
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

            {/* Bloc taux/remise */}
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
                        const n = Number(value);
                        setValue('tauxDollar', n);
                        try {
                          localStorage.setItem('tauxDollar', String(n));
                        } catch {}
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
                        const n = Number(value);
                        setValue('tauxFranc', n);
                        try {
                          localStorage.setItem('tauxFranc', String(n));
                        } catch {}
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
            {/* Fin bloc taux/remise */}
          </div>
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
};

export default Page;
