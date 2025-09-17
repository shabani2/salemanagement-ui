'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { List } from 'lucide-react';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';

import { Produit, Categorie } from '@/Models/produitsType';
import { Region } from '@/Models/regionTypes';
import { PointVente } from '@/Models/pointVenteType';
import { CommandeProduit } from '@/Models/CommandeProduitType';

import { searchProduits } from '@/stores/slices/produits/produitsSlice';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import {
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
import { createCommande, downloadBlob } from '@/stores/slices/commandes/commandeSlice';

import { CommandeNotification } from '../CommandeNotification';

/* ----------------------------- Helpers ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const extractProduitList = (payload: any): Produit[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.docs)) return payload.docs;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
};

/* ============================== Component ============================== */
const CommandeForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const regions = useSelector((state: RootState) => asArray<Region>(selectAllRegions(state)));
  const pointsVente = useSelector((state: RootState) =>
    asArray<PointVente>(selectAllPointVentes(state))
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [quantite, setQuantite] = useState<number>(1);
  const [commandeProduits, setCommandeProduits] = useState<CommandeProduit[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pvLoading, setPvLoading] = useState(false);
  const [regionsLoading, setRegionsLoading] = useState(false);

  // ✅ Boot: charger toutes les régions et tous les PV
  useEffect(() => {
    const loadData = async () => {
      try {
        setRegionsLoading(true);
        setPvLoading(true);

        await dispatch(fetchRegions({ limit: 100000 } as any));
        await dispatch(fetchPointVentes({ limit: 100000 } as any));

        setRegionsLoading(false);
        setPvLoading(false);
      } catch (err) {
        console.error('Erreur de chargement initial:', err);
        setRegionsLoading(false);
        setPvLoading(false);
      }
    };

    loadData();
  }, [dispatch]);

  // ✅ Quand région sélectionnée : charger les PV associés (facultatif)
  useEffect(() => {
    if (!selectedRegion?._id) return;

    const fetchPV = async () => {
      try {
        setPvLoading(true);
        await dispatch(fetchPointVentesByRegionId({ regionId: selectedRegion._id, limit: 100000 }));
        setSelectedPointVente(null); // reset
      } catch (err) {
        console.error('Erreur fetchPointVentesByRegionId:', err);
      } finally {
        setPvLoading(false);
      }
    };

    fetchPV();
  }, [dispatch, selectedRegion?._id]);

  /* 🔍 AutoComplete Produits */
  const completeProduits = useCallback(
    async (e: AutoCompleteCompleteEvent) => {
      const q = String(e.query || '').trim();
      if (!q) {
        setSuggestions([]);
        return;
      }
      try {
        const action = await dispatch(
          searchProduits({ q, page: 1, limit: 10, includeTotal: false }) as any
        );
        if ((searchProduits as any).fulfilled.match(action)) {
          const list = extractProduitList(action.payload);
          setSuggestions(list);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      }
    },
    [dispatch]
  );

  const handleAddProduit = useCallback(() => {
    if (!selectedProduit || quantite <= 0) return;

    const existIndex = commandeProduits.findIndex((p) =>
      typeof p.produit === 'object'
        ? p.produit._id === selectedProduit._id
        : p.produit === selectedProduit._id
    );

    if (existIndex !== -1) {
      const updated = [...commandeProduits];
      updated[existIndex].quantite += quantite;
      setCommandeProduits(updated);
    } else {
      setCommandeProduits((prev) => [
        ...prev,
        {
          produit: selectedProduit,
          quantite,
          nom: selectedProduit.nom,
          prixUnitaire: Number(selectedProduit.prix ?? 0),
          statut: 'attente',
        },
      ]);
    }

    setSelectedProduit(null);
    setSearchTerm('');
    setQuantite(1);
    setSuggestions([]);
  }, [selectedProduit, quantite, commandeProduits]);

  const handleRemoveProduit = useCallback((produitId: string) => {
    setCommandeProduits((prev) =>
      prev.filter((p) => {
        const id = typeof p.produit === 'object' ? p.produit._id : p.produit;
        return id !== produitId;
      })
    );
  }, []);

  const totalCommande = useMemo(
    () =>
      commandeProduits.reduce((total, p) => {
        const prix =
          typeof p.produit === 'object'
            ? Number(p.produit.prix ?? 0)
            : Number((p as any)?.produit?.prix ?? 0);
        return total + prix * (p.quantite ?? 0);
      }, 0),
    [commandeProduits]
  );

  const canSubmit = commandeProduits.length > 0 &&
    (selectedRegion || selectedPointVente) &&
    status !== 'loading';

  const handleSubmit = useCallback(async () => {
    if (commandeProduits.length === 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Commande vide',
        detail: 'Veuillez ajouter au moins un produit',
        life: 3000,
      });
      return;
    }

    if (!selectedRegion && !selectedPointVente) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Localisation requise',
        detail: 'Choisissez une région ou un point de vente.',
        life: 3000,
      });
      return;
    }

    setStatus('loading');

    const produitsPourAPI = commandeProduits.map((item) => ({
      produit: typeof item.produit === 'object' ? item.produit._id : item.produit,
      quantite: item.quantite,
    }));

    const payload = {
      region: selectedRegion?._id || undefined,
      pointVente: selectedPointVente?._id || undefined,
      depotCentral: false,
      produits: produitsPourAPI,
      print: true,
      format: 'pos80',
    };

    try {
      //@ts-ignore
      const resultAction = await dispatch(createCommande(payload));

      if (createCommande.fulfilled.match(resultAction)) {
        const result = resultAction.payload;
        if (result.type === 'pdf') {
          downloadBlob(result.blob, result.filename);
        }

        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande créée avec succès',
          life: 3000,
        });

        // reset
        setCommandeProduits([]);
        setSelectedRegion(null);
        setSelectedPointVente(null);
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: resultAction.payload || 'Erreur lors de la création de la commande',
          life: 5000,
        });
      }
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: (err as Error).message || 'Erreur inconnue',
        life: 5000,
      });
    } finally {
      setStatus('idle');
    }
  }, [commandeProduits, selectedRegion, selectedPointVente, dispatch]);

  /* ----------------------------- RENDER ----------------------------- */
  return (
    <div className="w-full mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <Toast ref={toast} position="top-right" />

      {/* === Dropdown Région === */}
      <Dropdown
        id="region"
        value={selectedRegion}
        options={regions}
        onChange={(e) => setSelectedRegion(e.value)}
        optionLabel="nom"
        placeholder="Choisir une région"
        className="w-full mb-4"
        showClear
        disabled={regionsLoading}
        loading={regionsLoading}
        filter
        filterBy="nom"
        filterPlaceholder="Rechercher..."
        resetFilterOnHide
        panelStyle={{ maxHeight: '18rem' }}
        emptyFilterMessage="Aucun résultat"
        emptyMessage="Aucune région"
      />

      {/* === Dropdown Point de Vente === */}
      <Dropdown
        id="pointVente"
        value={selectedPointVente}
        options={pointsVente}
        onChange={(e) => setSelectedPointVente(e.value)}
        optionLabel="nom"
        placeholder="Choisir un point de vente"
        className="w-full mb-4"
        showClear
        disabled={pvLoading}
        loading={pvLoading}
        filter
        filterBy="nom,adresse"
        filterPlaceholder="Rechercher..."
        resetFilterOnHide
        panelStyle={{ maxHeight: '18rem' }}
        emptyFilterMessage="Aucun résultat"
        emptyMessage="Aucun point de vente"
      />

      {/* Autres composants : produits, table, bouton submit... */}
      {/* ... */}
    </div>
  );
};

export default CommandeForm;
