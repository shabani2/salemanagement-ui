// File: app/(backoffice)/commande/CommandeForm.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/stores/store';

import { Toast } from 'primereact/toast';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
} from 'primereact/autocomplete';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { ProgressSpinner } from 'primereact/progressspinner';

import type { Produit } from '@/Models/produitsType';
import type { Region } from '@/Models/regionTypes';
import type { PointVente } from '@/Models/pointVenteType';
import type { CommandeProduit } from '@/Models/CommandeProduitType';
import type { User } from '@/Models/UserType';

import { searchProduits } from '@/stores/slices/produits/produitsSlice';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import {
  fetchPointVenteById,
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
import { createCommande, downloadBlob } from '@/stores/slices/commandes/commandeSlice';

type Fournisseur = { _id: string; nom: string };
const MOCK_FOURNISSEURS: Fournisseur[] = [
  { _id: 'f1', nom: 'Fournisseur Global' },
  { _id: 'f2', nom: 'Eco Supplies' },
  { _id: 'f3', nom: 'AgriParts SA' },
];

type CommandeProduitRow = {
  id: string;
  produit: Produit;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  statut: string;
};

type RouteInfo = {
  display: { source?: string; destination?: string };
  depotCentral?: boolean;
  requestedPointVente?: string;
  requestedRegion?: string;
  region?: string;
  pointVente?: string;
  fournisseur?: string;
};

const getUserFromStorage = (): User | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user-agricap');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const extractProduitList = (payload: unknown): Produit[] => {
  const p: any = payload;
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.docs)) return p.docs;
  if (Array.isArray(p?.items)) return p.items;
  return [];
};

const safeNumber = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatFc = (n: number): string => `FC ${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CommandeForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const [mounted, setMounted] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const regions = useSelector((s: RootState) => selectAllRegions(s));
  const pointsVente = useSelector((s: RootState) => selectAllPointVentes(s));

  const [user, setUser] = useState<User | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);

  const [rows, setRows] = useState<CommandeProduitRow[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [quantite, setQuantite] = useState<number>(1);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [pvLoading, setPvLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const u = getUserFromStorage();
    setUser(u);

    const bootstrap = async () => {
      if (!u?.role) {
        setInitialized(true);
        return;
      }
      try {
        setRegionsLoading(true);
        setPvLoading(true);

        if (u.role === 'SuperAdmin') {
          await dispatch(fetchRegions({ limit: 100000 } as any));
          await dispatch(fetchPointVentes({ limit: 100000 } as any));
        } else if (u.role === 'AdminRegion' && u.region?._id) {
          await dispatch(fetchRegions({ limit: 100000 } as any));
          await dispatch(fetchPointVentesByRegionId({ regionId: u.region._id, limit: 100000 } as any));
        } else if (u.role === 'AdminPointVente' && u.pointVente?._id) {
          await dispatch(fetchPointVenteById(u.pointVente._id));
        }
      } catch (err) {
        console.error('Erreur initialisation', err);
      } finally {
        setRegionsLoading(false);
        setPvLoading(false);
        setInitialized(true);
      }
    };

    void bootstrap();
  }, [dispatch]);

  useEffect(() => {
    if (selectedRegion?._id) {
      setSelectedPointVente(null);
      dispatch(fetchPointVentesByRegionId({ regionId: selectedRegion._id, limit: 100000 } as any));
    }
  }, [dispatch, selectedRegion]);

  const completeProduits = useCallback(
    async (e: AutoCompleteCompleteEvent) => {
    const q = String(e.query || '').trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    try {
      const action = await dispatch(searchProduits({ q, page: 1, limit: 10 }) as any);
      if (searchProduits.fulfilled.match(action)) {
        setSuggestions(extractProduitList(action.payload));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Erreur autocomplete', err);
      setSuggestions([]);
    }
  }, [dispatch]);

  const handleSelectProduit = useCallback((e: AutoCompleteSelectEvent) => {
    const p = e.value as Produit;
    setSearchInput(p?.nom ?? '');
  }, []);

  const handleAddProduit = useCallback((produit: Produit | null, qte: number) => {
    if (!produit || qte <= 0) return;
    const id = (produit as any)?._id as string;
    const prix = safeNumber((produit as any)?.prix ?? (produit as any)?.prixVente ?? 0);

    setRows((prev) => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantite: next[idx].quantite + qte };
        return next;
      }
      return [
        ...prev,
        {
          id,
          produit,
          nom: produit.nom ?? 'Produit',
          prixUnitaire: prix,
          quantite: qte,
          statut: 'attente',
        },
      ];
    });

    setSearchInput('');
    setSuggestions([]);
    setQuantite(1);
  }, []);

  const handleRemoveProduit = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const routeInfo: RouteInfo | null = useMemo(() => {
    if (!user) return null;
    if (user.role === 'AdminPointVente' || user.role === 'Logisticien') {
      const pv = user.pointVente as PointVente | undefined;
      const reg = pv?.region as Region | undefined;
      return {
        requestedPointVente: pv?._id,
        region: reg?._id,
        display: { source: pv?.nom, destination: reg?.nom },
      };
    }
    if (user.role === 'AdminRegion') {
      const srcRegion = user.region as Region;
      const destRegion = selectedRegion ?? undefined;
      return {
        requestedRegion: srcRegion?._id,
        region: selectedFournisseur ? undefined : destRegion?._id,
        fournisseur: selectedFournisseur?._id,
        depotCentral: !selectedRegion && !selectedFournisseur,
        display: {
          source: srcRegion?.nom,
          destination: selectedFournisseur ? selectedFournisseur.nom : destRegion?.nom || 'Central',
        },
      };
    }
    if (user.role === 'SuperAdmin') {
      const dest = selectedFournisseur?.nom ?? selectedRegion?.nom ?? selectedPointVente?.nom ?? 'Non défini';
      return {
        depotCentral: true,
        region: selectedRegion?._id,
        pointVente: selectedPointVente?._id,
        fournisseur: selectedFournisseur?._id,
        display: { source: 'Central', destination: dest },
      };
    }
    return null;
  }, [user, selectedRegion, selectedPointVente, selectedFournisseur]);

  const totalCommande = useMemo(() => {
    return rows.reduce((acc, r) => acc + safeNumber(r.prixUnitaire) * safeNumber(r.quantite), 0);
  }, [rows]);

  const canSubmit = useMemo(() => rows.length > 0 && !!routeInfo && status !== 'loading', [rows, routeInfo, status]);

  const handleSubmit = useCallback(async () => {
    if (!routeInfo || rows.length === 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Erreur',
        detail: 'Champs requis manquants',
        life: 3000,
      });
      return;
    }
    setStatus('loading');
    const produitsPourAPI = rows.map(r => ({
      produit: r.id,
      quantite: r.quantite,
    }));
    const payload: any = {
      user: (user as any)?._id,
      produits: produitsPourAPI,
      print: true,
      format: 'pos80',
      organisation: null,
      ...routeInfo,
    };
    try {
      const result: any = await dispatch(createCommande(payload) as any);
      if (createCommande.fulfilled.match(result)) {
        const res = result.payload as { type?: string; blob?: Blob; filename?: string };
        if (res?.type === 'pdf' && res.blob && res.filename) {
          downloadBlob(res.blob, res.filename);
        }
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Commande créée', life: 3000 });
        setRows([]);
        setSearchInput('');
        setSelectedRegion(null);
        setSelectedPointVente(null);
        setSelectedFournisseur(null);
      } else {
        const errMsg = (result?.payload as any) || 'Erreur de création';
        toast.current?.show({ severity: 'error', summary: 'Erreur', detail: String(errMsg), life: 5000 });
      }
    } catch (err: any) {
      console.error('Erreur soumission', err);
      toast.current?.show({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Erreur inconnue', life: 5000 });
    } finally {
      setStatus('idle');
    }
  }, [dispatch, rows, routeInfo, user]);

  if (!mounted || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6 bg-gray-50">
      <Toast ref={toast} position="top-right" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Colonne Gauche */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg border-round-lg">
            <div className="flex align-items-center mb-3">
              <i className="pi pi-map-marker text-primary text-xl mr-2" />
              <h3 className="text-lg font-semibold text-900">Informations de livraison</h3>
            </div>
            
            {routeInfo?.display ? (
              <div className="grid">
                <div className="col-6 text-500">Source:</div>
                <div className="col-6 font-medium">{routeInfo.display.source ?? '—'}</div>
                
                <div className="col-6 text-500">Destination:</div>
                <div className="col-6 font-medium">{routeInfo.display.destination ?? '—'}</div>
                
                <div className="col-6 text-500">Date:</div>
                <div className="col-6">{new Date().toLocaleDateString()}</div>
              </div>
            ) : (
              <p className="text-500 italic">Sélectionnez une destination</p>
            )}
          </Card>

          {(user?.role === 'SuperAdmin' || user?.role === 'AdminRegion') && (
            <Card className="shadow-lg border-round-lg">
              <div className="flex align-items-center mb-3">
                <i className="pi pi-globe text-primary text-xl mr-2" />
                <h3 className="text-lg font-semibold text-900">Destination</h3>
              </div>
              
              <div className="space-y-3">
                <Dropdown
                  value={selectedRegion}
                  options={regions}
                  onChange={(e: DropdownChangeEvent) => {
                    setSelectedRegion(e.value as Region | null);
                    setSelectedPointVente(null);
                    setSelectedFournisseur(null);
                  }}
                  optionLabel="nom"
                  placeholder="Sélectionnez une région"
                  showClear
                  className="w-full"
                  filter
                  disabled={regionsLoading}
                />
                
                {user?.role === 'SuperAdmin' && (
                  <Dropdown
                    value={selectedPointVente}
                    options={pointsVente}
                    onChange={(e: DropdownChangeEvent) => {
                      setSelectedPointVente(e.value as PointVente | null);
                      setSelectedRegion(null);
                      setSelectedFournisseur(null);
                    }}
                    optionLabel="nom"
                    placeholder="Sélectionnez un point de vente"
                    showClear
                    className="w-full"
                    filter
                    disabled={pvLoading}
                  />
                )}
                
                <Dropdown
                  value={selectedFournisseur}
                  options={MOCK_FOURNISSEURS}
                  onChange={(e: DropdownChangeEvent) => {
                    setSelectedFournisseur(e.value as Fournisseur | null);
                    setSelectedRegion(null);
                    setSelectedPointVente(null);
                  }}
                  optionLabel="nom"
                  placeholder="Sélectionnez un fournisseur"
                  showClear
                  className="w-full"
                />
              </div>
            </Card>
          )}
        </div>

        {/* Colonne Centrale - Formulaire principal */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-round-lg">
            <div className="flex align-items-center mb-4">
              <i className="pi pi-shopping-cart text-primary text-2xl mr-2" />
              <h2 className="text-2xl font-bold text-900">Nouvelle Commande</h2>
            </div>

            {/* Recherche et ajout de produits */}
            <div className="grid grid-nogutter align-items-end gap-3 mb-6">
              <div className="col-12 md:col-7">
                <label htmlFor="produit-search" className="block text-500 text-sm mb-1">
                  Rechercher un produit
                </label>
                <AutoComplete
                  inputId="produit-search"
                  value={searchInput}
                  suggestions={suggestions}
                  completeMethod={completeProduits}
                  field="nom"
                  dropdown
                  forceSelection={false}
                  onChange={e => setSearchInput(e.value)}
                  onSelect={handleSelectProduit}
                  placeholder="Saisissez le nom du produit..."
                  className="w-full"
                  dropdownMode="current"
                />
              </div>
              
              <div className="col-12 md:col-3">
                <label htmlFor="quantite-input" className="block text-500 text-sm mb-1">
                  Quantité
                </label>
                <InputNumber
                  inputId="quantite-input"
                  value={quantite}
                  onValueChange={(e: InputNumberValueChangeEvent) => setQuantite(e.value ?? 1)}
                  min={1}
                  showButtons
                  className="w-full"
                />
              </div>
              
              <div className="col-12 md:col-2">
                <Button
                  label="Ajouter"
                  icon="pi pi-plus"
                  className="w-full p-button-success"
                  onClick={() => {
                    const selected = suggestions.find(p => p.nom === searchInput) ?? suggestions[0] ?? null;
                    handleAddProduit(selected, quantite);
                  }}
                  disabled={quantite <= 0 || suggestions.length === 0}
                />
              </div>
            </div>

            {/* Liste des produits */}
            <div className="border-round border-1 surface-border">
              {rows.length === 0 ? (
                <div className="py-6 text-center">
                  <i className="pi pi-inbox text-400 text-4xl mb-2" />
                  <p className="text-500">Aucun produit ajouté à la commande</p>
                </div>
              ) : (
                <DataTable
                  value={rows}
                  dataKey="id"
                  scrollable
                  scrollHeight="400px"
                  className="w-full"
                  responsiveLayout="stack"
                  rowHover
                >
                  <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: '60px' }} />
                  <Column field="nom" header="Produit" />
                  <Column field="quantite" header="Quantité" style={{ width: '120px' }} />
                  <Column
                    field="prixUnitaire"
                    header="Prix unitaire"
                    body={(row: CommandeProduitRow) => formatFc(safeNumber(row.prixUnitaire))}
                    style={{ width: '160px' }}
                  />
                  <Column
                    header="Total"
                    body={(row: CommandeProduitRow) =>
                      formatFc(safeNumber(row.prixUnitaire) * safeNumber(row.quantite))
                    }
                    style={{ width: '160px' }}
                  />
                  <Column
                    body={(row: CommandeProduitRow) => (
                      <Button
                        icon="pi pi-trash"
                        className="p-button-rounded p-button-text p-button-danger"
                        onClick={() => handleRemoveProduit(row.id)}
                        tooltip="Supprimer"
                        tooltipOptions={{ position: 'top' }}
                      />
                    )}
                    style={{ width: '80px' }}
                    headerStyle={{ textAlign: 'center' }}
                  />
                </DataTable>
              )}
            </div>

            {/* Total et validation */}
            <div className="mt-6 border-top-1 surface-border pt-4 flex flex-column md:flex-row justify-between align-items-center">
              <div className="mb-3 md:mb-0">
                <span className="text-xl font-semibold text-900">Total: </span>
                <span className="text-xl text-primary font-bold">{formatFc(totalCommande)}</span>
              </div>
              
              <Button
                label={status === 'loading' ? 'Traitement...' : 'Valider la commande'}
                icon={status === 'loading' ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                className="p-button-lg w-full md:w-auto"
                onClick={handleSubmit}
                disabled={!canSubmit}
                size="large"
              />
            </div>
          </Card>
        </div>

        {/* Colonne Droite - Informations supplémentaires */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-round-lg">
            <div className="flex align-items-center mb-3">
              <i className="pi pi-info-circle text-primary text-xl mr-2" />
              <h3 className="text-lg font-semibold text-900">Résumé</h3>
            </div>
            
            <div className="grid mb-4">
              <div className="col-6 text-500">Produits:</div>
              <div className="col-6 text-right font-medium">{rows.length}</div>
              
              <div className="col-6 text-500">Quantité totale:</div>
              <div className="col-6 text-right">{rows.reduce((acc, r) => acc + r.quantite, 0)}</div>
            </div>

            <div className="flex align-items-center mb-3">
              <i className="pi pi-comment text-primary text-xl mr-2" />
              <h3 className="text-lg font-semibold text-900">Notes</h3>
            </div>
            
            <textarea
              placeholder="Ajoutez des notes concernant cette commande..."
              className="w-full p-3 border-1 surface-border border-round"
              rows={4}
              style={{ resize: 'vertical' }}
            ></textarea>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommandeForm;