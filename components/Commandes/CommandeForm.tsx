// components/commande/CommandeForm.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
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
  fetchPointVenteById,
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
import { createCommande, downloadBlob } from '@/stores/slices/commandes/commandeSlice';

import { CommandeNotification } from '../CommandeNotification';

/* ----------------------------- Helpers ----------------------------- */
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

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

/* ============================== Component ============================== */
const CommandeForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // user depuis localStorage
  const user =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem('user-agricap') || 'null');
          } catch {
            return null;
          }
        })()
      : null;

  // sélecteurs
  const regions = useSelector((state: RootState) => asArray<Region>(selectAllRegions(state)));
  const pointsVente = useSelector((state: RootState) =>
    asArray<PointVente>(selectAllPointVentes(state))
  );

  // états
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [quantite, setQuantite] = useState<number>(1);

  const [commandeProduits, setCommandeProduits] = useState<CommandeProduit[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pvLoading, setPvLoading] = useState<boolean>(false);
  const [regionsLoading, setRegionsLoading] = useState<boolean>(false);

  /* ----------------------------- Boot data ----------------------------- */
  useEffect(() => {
    if (!user?.role) return;

    (async () => {
      try {
        if (user?.role === 'AdminRegion') {
          if (user?.region?._id) {
            setPvLoading(true);
            await dispatch(
              fetchPointVentesByRegionId({ regionId: user.region._id, limit: 100000 } as any)
            );
            setPvLoading(false);
          }
          setRegionsLoading(true);
          await dispatch(fetchRegions({ limit: 100000 } as any));
          setRegionsLoading(false);
        } else if (user?.role === 'SuperAdmin') {
          setPvLoading(true);
          await dispatch(fetchPointVentes({ limit: 100000 } as any));
          setPvLoading(false);
          setRegionsLoading(true);
          await dispatch(fetchRegions({ limit: 100000 } as any));
          setRegionsLoading(false);
        } else {
          // autres rôles : récupérer au moins son PV
          if (user?.pointVente?._id) {
            await dispatch(fetchPointVenteById(user.pointVente._id));
          }
        }
      } catch {
        setPvLoading(false);
        setRegionsLoading(false);
      }
    })();
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  // quand la région change, charger ses PV
  useEffect(() => {
    (async () => {
      if (selectedRegion?._id) {
        setPvLoading(true);

        await dispatch(fetchPointVentesByRegionId({ regionId: selectedRegion._id, limit: 100000 }));
        setPvLoading(false);
        setSelectedPointVente(null); // éviter incohérence
      }
    })();
  }, [dispatch, selectedRegion?._id]);

  /* ------------------------ AutoComplete Produits ------------------------ */
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

  // Template des lignes de suggestion
  const suggestionItemTemplate = (item: Produit) => (
    <div className="flex items-center gap-3 p-2">
      <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-lg border border-green-700 flex items-center justify-center text-white text-lg font-bold">
        {item?.nom?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div className="flex flex-col">
        <div className="font-semibold text-gray-900">{item.nom}</div>
        <div className="text-xs text-gray-500">
          fc{Number(item.prix ?? 0).toFixed(2)} •{' '}
          {(item.categorie as Categorie)?.nom || 'Sans catégorie'}
        </div>
      </div>
    </div>
  );

  /* ----------------------------- Handlers ----------------------------- */
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
      // @ts-expect-error - compat: external lib types mismatch
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

  const canSubmit = useMemo(() => {
    const hasItems = commandeProduits.length > 0;
    const hasLocation = !!selectedRegion || !!selectedPointVente;
    return hasItems && hasLocation && status !== 'loading';
  }, [commandeProduits.length, selectedRegion, selectedPointVente, status]);

  const totalCommande = useMemo(
    () =>
      commandeProduits.reduce((total, p) => {
        const prix =
          typeof p.produit === 'object'
            ? Number(p.produit.prix ?? 0)
            : // @ts-expect-error - compat: external lib types mismatch
              Number(p?.produit.prix ?? 0);
        return total + prix * (p.quantite ?? 0);
      }, 0),
    [commandeProduits]
  );

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
      user: user?._id,
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
          toast.current?.show({
            severity: 'success',
            summary: 'Succès',
            detail: 'Commande créée et imprimée avec succès',
            life: 3000,
          });
        } else {
          toast.current?.show({
            severity: 'success',
            summary: 'Succès',
            detail: 'Commande créée avec succès',
            life: 3000,
          });
        }
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
  }, [commandeProduits, selectedRegion, selectedPointVente, dispatch, user?._id]);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="w-full mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <Toast ref={toast} position="top-right" />

      {/* Header */}
      <header className="flex items-center mb-8 flex-row justify-between">
        <div className="flex items-center flex-row gap-3">
          <i
            className="pi pi-shopping-cart text-4xl mr-1"
            style={{ color: '#15803d', fontSize: '26px' }}
          />
          <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#15803d' }}>
            Nouvelle Commande
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <CommandeNotification />
          <Link
            href="/generals/commandes/listes"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-700 text-white hover:bg-green-800 transition shadow-sm"
            title="Voir la liste des commandes"
          >
            <List size={18} />
            <span className="hidden sm:inline">Voir la liste</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Bloc localisation */}
        <section className="md:w-1/4 bg-green-50 rounded-lg p-6 shadow-inner border border-green-100">
          <h2 className="mb-4 text-xl font-semibold text-green-700 border-b border-green-300 pb-3 flex items-center gap-2">
            <i className="pi pi-map-marker" style={{ color: '#15803d' }} /> Sélection Géographique
          </h2>

          <div className="space-y-5 mt-6">
            <div>
              <label htmlFor="region" className="block text-gray-700 font-medium mb-2">
                Région
              </label>
              <Dropdown
                id="region"
                value={selectedRegion}
                options={regions}
                onChange={(e) => setSelectedRegion(e.value)}
                optionLabel="nom"
                placeholder="Choisir une région"
                className="w-full shadow-sm border border-gray-300 rounded-md"
                showClear
                style={{ borderColor: '#15803d' }}
                disabled={status === 'loading' || regionsLoading}
                loading={regionsLoading}
                filter
                filterBy="nom"
                filterPlaceholder="Rechercher..."
                resetFilterOnHide
                panelClassName="max-h-72 overflow-auto"
                panelStyle={{ maxHeight: '18rem' }}
                emptyFilterMessage="Aucun résultat"
                emptyMessage="Aucune région"
              />
            </div>

            <div>
              <label htmlFor="pointVente" className="block text-gray-700 font-medium mb-2">
                Point de vente
              </label>
              <Dropdown
                id="pointVente"
                value={selectedPointVente}
                options={pointsVente}
                onChange={(e) => setSelectedPointVente(e.value)}
                optionLabel="nom"
                placeholder="Choisir un point de vente"
                className="w-full shadow-sm border border-gray-300 rounded-md"
                showClear
                style={{ borderColor: '#15803d' }}
                disabled={status === 'loading' || pvLoading}
                loading={pvLoading}
                filter
                filterBy="nom,adresse"
                filterPlaceholder="Rechercher..."
                resetFilterOnHide
                panelClassName="max-h-72 overflow-auto"
                panelStyle={{ maxHeight: '18rem' }}
                emptyFilterMessage="Aucun résultat"
                emptyMessage="Aucun point de vente"
                itemTemplate={(pv: PointVente) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{pv?.nom}</span>
                    <span className="text-xs text-gray-500">
                      {(pv as any)?.adresse || '\u00A0'}
                    </span>
                  </div>
                )}
              />
            </div>
          </div>
        </section>

        {/* Bloc produits */}
        <section className="md:w-3/4 flex flex-col gap-8">
          <Card className="shadow-md p-6 border border-gray-100 rounded-lg">
            <h2 className="text-2xl font-semibold mb-5 text-green-700 flex items-center gap-2">
              <i className="pi pi-box text-2xl" style={{ color: '#15803d' }} /> Ajouter un produit
            </h2>

            <div className="grid grid-cols-12 gap-5 items-end">
              <div className="col-span-12 md:col-span-7">
                <label className="block text-gray-700 font-medium mb-2">Produit</label>
                <AutoComplete
                  value={selectedProduit ? selectedProduit.nom : searchTerm}
                  suggestions={suggestions}
                  completeMethod={completeProduits}
                  field="nom"
                  delay={200}
                  dropdown
                  forceSelection={false}
                  itemTemplate={suggestionItemTemplate}
                  placeholder="Rechercher un produit..."
                  className="w-full shadow-sm border border-gray-300 rounded-md"
                  appendTo={typeof window !== 'undefined' ? document.body : undefined}
                  panelClassName="z-50"
                  onChange={(e) => {
                    if (typeof e.value === 'string') {
                      setSearchTerm(e.value);
                      setSelectedProduit(null);
                      if (!e.value) setSuggestions([]);
                    } else {
                      const p = e.value as Produit;
                      setSelectedProduit(p);
                      setSearchTerm(p?.nom ?? '');
                    }
                  }}
                  onSelect={(e) => {
                    const p: Produit = e.value;
                    setSelectedProduit(p);
                    setSearchTerm(p?.nom ?? '');
                  }}
                />
              </div>

              <div className="col-span-12 md:col-span-5">
                <label htmlFor="quantite" className="block text-gray-700 font-medium mb-1">
                  Quantité
                </label>
                <InputNumber
                  id="quantite"
                  value={quantite}
                  onValueChange={(e) => setQuantite(e.value || 1)}
                  min={1}
                  showButtons
                  className="w-full shadow-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex p-3 justify-end">
              <Button
                label="Ajouter un produit"
                icon="pi pi-plus"
                className="p-3 font-bold shadow-lg text-white"
                onClick={handleAddProduit}
                disabled={!selectedProduit || quantite <= 0}
                style={{
                  background: 'linear-gradient(to right, #15803d, #166534)',
                  border: '1px solid #15803d',
                  color: 'white',
                }}
              />
            </div>
          </Card>

          <Card className="p-6 shadow-md border border-gray-100 rounded-lg flex flex-col">
            <h2 className="text-2xl font-semibold mb-5 text-green-700 flex items-center gap-2">
              <i className="pi pi-list text-xl" style={{ color: '#15803d' }} /> Détails des Produits
              Sélectionnés
            </h2>

            <div className="mb-6 flex flex-wrap gap-6 text-green-700 font-medium text-lg">
              <div className="flex items-center gap-2">
                <i className="pi pi-map-marker" />
                <span>Région: {selectedRegion ? selectedRegion.nom : 'Non sélectionnée'}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="pi pi-building" />
                <span>
                  Point de vente: {selectedPointVente ? selectedPointVente.nom : 'Non sélectionné'}
                </span>
              </div>
            </div>

            {commandeProduits.length === 0 ? (
              <p className="text-gray-500 italic text-center py-10">
                Aucun produit ajouté. Veuillez sélectionner un produit pour commencer.
              </p>
            ) : (
              <>
                <DataTable
                  value={commandeProduits}
                  className="shadow-sm rounded-lg"
                  scrollable
                  scrollHeight="280px"
                  responsiveLayout="scroll"
                  stripedRows
                  showGridlines
                >
                  <Column
                    header="#"
                    body={(_, options) => (options?.rowIndex ?? 0) + 1}
                    className="w-12"
                  />
                  <Column
                    field="produit.nom"
                    header="Produit"
                    body={(data) => (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                          {String(data.nom || '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="font-medium">{data.nom}</span>
                      </div>
                    )}
                  />
                  <Column field="quantite" header="Quantité" />
                  <Column
                    field="prixUnitaire"
                    header="Prix Unitaire"
                    body={(rowData) => `fc${Number(rowData.prixUnitaire ?? 0).toFixed(2)}`}
                  />
                  <Column
                    field="total"
                    header="Total"
                    body={(rowData) =>
                      `fc${(Number(rowData.prixUnitaire ?? 0) * Number(rowData.quantite ?? 0)).toFixed(2)}`
                    }
                  />
                  <Column
                    header=""
                    body={(rowData) => {
                      const produitId =
                        typeof rowData.produit === 'object' ? rowData.produit._id : rowData.produit;
                      return (
                        <Button
                          icon="pi pi-trash"
                          className="p-button-rounded p-button-text p-button-danger"
                          onClick={() => handleRemoveProduit(produitId)}
                        />
                      );
                    }}
                  />
                </DataTable>

                <div className="mt-6 border-t border-gray-200 pt-5 flex justify-end">
                  <div className="w-full max-w-md bg-green-50 rounded-lg p-4 shadow-inner text-gray-8 00">
                    <div className="flex justify-between mb-2">
                      <span>Total produits:</span>
                      <span className="font-semibold">
                        {commandeProduits.reduce((acc, p) => acc + (p.quantite ?? 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Sous-total:</span>
                      <span className="font-semibold">fc{totalCommande.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Livraison:</span>
                      <span className="font-semibold text-green-600">Gratuite</span>
                    </div>
                    <div className="flex justify-between mt-4 pt-3 font-bold text-lg border-t border-gray-300">
                      <span>Total à payer:</span>
                      <span className="text-green-700">fc{totalCommande.toFixed(2)}</span>
                    </div>
                    <Button
                      label={status === 'loading' ? 'Traitement...' : 'Valider la commande'}
                      icon={status === 'loading' ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                      className="mt-6 w-full font-bold text-white"
                      style={{
                        background: 'linear-gradient(to right, #15803d, #166534)',
                        border: '1px solid #15803d',
                        color: 'white',
                      }}
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      severity="success"
                    />
                    {!selectedRegion && !selectedPointVente && (
                      <div className="text-xs text-red-600 mt-2">
                        Veuillez choisir une Région ou un Point de vente pour pouvoir valider.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default CommandeForm;
