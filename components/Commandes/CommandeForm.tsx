/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { AutoComplete } from 'primereact/autocomplete';
import { CommandeProduit } from '@/Models/CommandeProduitType';
import { Toast } from 'primereact/toast';
import { Categorie, Produit } from '@/Models/produitsType';
import { searchProduits, selectAllProduits } from '@/stores/slices/produits/produitsSlice';
import { Region } from '@/Models/regionTypes';
import { PointVente } from '@/Models/pointVenteType';
import { Dropdown } from 'primereact/dropdown';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import {
  fetchPointVenteById,
  fetchPointVentes,
  fetchPointVentesByRegionId,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
import { createCommande } from '@/stores/slices/commandes/commandeSlice';
import { CommandeNotification } from '../CommandeNotification';

const CommandeForm = () => {
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const dispatch = useDispatch<AppDispatch>();
  const produits = useSelector((state: RootState) => selectAllProduits(state));
  const regions = useSelector((state: RootState) => selectAllRegions(state));
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));

  const [searchTerm, setSearchTerm] = useState('');
  const [quantite, setQuantite] = useState<number>(1);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [commandeProduits, setCommandeProduits] = useState<CommandeProduit[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const toast = useRef<Toast>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleRemoveProduit = (produitId: string) => {
    setCommandeProduits((prev) =>
      prev.filter((p) => {
        const id = typeof p.produit === 'object' ? p.produit._id : p.produit;
        return id !== produitId;
      })
    );
  };

  useEffect(() => {
    setSuggestions(produits);
  }, [produits]);

  useEffect(() => {
    if (user?.role === 'AdminRegion') {
      dispatch(fetchPointVentesByRegionId(user?.region._id));
    } else if (user?.role === 'SuperAdmin') {
      dispatch(fetchPointVentes());
      dispatch(fetchRegions());
    } else {
      dispatch(fetchPointVenteById(user?.pointVente?._id));
    }
  }, [dispatch, user?.role, user?.region?._id]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim().length > 1) {
        dispatch(searchProduits(searchTerm));
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, dispatch]);

  const handleAddProduit = () => {
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
      //@ts-ignore
      setCommandeProduits((prev) => [
        ...prev,
        {
          produit: selectedProduit,
          quantite,
          nom: selectedProduit.nom,
          prixUnitaire: selectedProduit.prix,
          statut: 'attente',
        },
      ]);
    }

    setSelectedProduit(null);
    setSearchTerm('');
    setQuantite(1);
  };

  //   const handleSubmit = () => {
  //     if (commandeProduits.length === 0) {
  //       toast.current?.show({
  //         severity: 'warn',
  //         summary: 'Commande vide',
  //         detail: 'Veuillez ajouter au moins un produit',
  //         life: 3000,
  //       });
  //       return;
  //     }

  //     setStatus('loading');
  //     setTimeout(() => {
  //       setStatus('success');
  //       toast.current?.show({
  //         severity: 'success',
  //         summary: 'Succès',
  //         detail: 'Commande validée avec succès',
  //         life: 3000,
  //       });
  //       setCommandeProduits([]);
  //       setSelectedRegion(null);
  //       setSelectedPointVente(null);
  //       setStatus('idle');
  //     }, 2000);
  //   };

  const handleSubmit = async () => {
    if (commandeProduits.length === 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Commande vide',
        detail: 'Veuillez ajouter au moins un produit',
        life: 3000,
      });
      return;
    }

    setStatus('loading');

    const produitsPourAPI = commandeProduits.map((item) => ({
      produit: typeof item.produit === 'object' ? item.produit._id : item.produit,
      quantite: item.quantite,
      statut: 'attente',
    }));

    const payload = {
      user: user?._id,
      region: selectedRegion?._id || null,
      pointVente: selectedPointVente?._id || null,
      depotCentral: false,
      produits: produitsPourAPI,
    };

    try {
      // @ts-ignore
      const resultAction = await dispatch(createCommande(payload));

      if (createCommande.fulfilled.match(resultAction)) {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande créée avec succès',
          life: 3000,
        });
        setCommandeProduits([]);
        setSelectedRegion(null);
        setSelectedPointVente(null);
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          // @ts-expect-error
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
  };

  const totalCommande = commandeProduits.reduce((total, p) => {
    const prix = typeof p.produit === 'object' ? p.produit.prix : 0;
    return total + prix * p.quantite;
  }, 0);

  const itemTemplate = (item: Produit) => (
    <div className="flex items-center gap-3 p-2 hover:bg-green-50 rounded-lg cursor-pointer">
      <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-lg border border-green-700 flex items-center justify-center text-white text-lg font-bold">
        {item.nom.charAt(0)}
      </div>
      <div>
        <div className="font-semibold text-gray-900">{item.nom}</div>
        <div className="text-xs text-gray-500">
          ${item.prix.toFixed(2)} • {(item.categorie as Categorie)?.nom || 'Sans catégorie'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <Toast ref={toast} position="top-right" />
      <header className="flex items-center mb-8 flex-row justify-between">
        <div className="flex items-center flex-row gap-3">
          <i
            className="pi pi-shopping-cart text-4xl mr-3"
            style={{ color: '#15803d', fontSize: '26px' }}
          />
          <h1 className="text-4xl font-extrabold" style={{ color: '#15803d' }}>
            Nouvelle Commande
          </h1>
        </div>

        <CommandeNotification />
      </header>

      <div className="flex flex-col md:flex-row gap-10">
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
                style={{
                  borderColor: '#15803d',
                  boxShadow: '0 0 0 0.2rem rgba(21, 128, 61, 0.25)',
                }}
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
                style={{
                  borderColor: '#15803d',
                  boxShadow: '0 0 0 0.2rem rgba(21, 128, 61, 0.25)',
                }}
              />
            </div>
          </div>
        </section>

        <section className="md:w-3/4 flex flex-col gap-8">
          <Card className="shadow-md p-6 border border-gray-100 rounded-lg">
            <h2 className="text-2xl font-semibold mb-5 text-green-700 flex items-center gap-2">
              <i className="pi pi-box text-2xl" style={{ color: '#15803d' }} /> Ajouter un produit
            </h2>

            <div className="grid grid-cols-12 gap-5 items-end">
              <div className="col-span-12 md:col-span-6">
                <AutoComplete
                  id="produit"
                  value={selectedProduit ? selectedProduit.nom : searchTerm}
                  suggestions={suggestions}
                  completeMethod={(e) => setSearchTerm(e.query)}
                  field="nom"
                  dropdown
                  forceSelection
                  itemTemplate={itemTemplate}
                  placeholder="Rechercher un produit..."
                  onChange={(e) => {
                    setSearchTerm(typeof e.value === 'string' ? e.value : e.value.nom);
                    if (typeof e.value === 'string') setSelectedProduit(null);
                  }}
                  onSelect={(e) => setSelectedProduit(e.value)}
                  className="w-full shadow-sm border border-gray-300 rounded-md"
                  //   style={{ borderColor: '#15803d', boxShadow: '0 0 0 0.2rem rgba(21, 128, 61, 0.25)' }}
                />
              </div>

              <div className="col-span-6 md:col-span-6">
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
                  //   style={{ borderColor: '#15803d', boxShadow: '0 0 0 0.2rem rgba(21, 128, 61, 0.25)' }}
                />
              </div>
            </div>
            <div className="flex   p-3 justify-end">
              <Button
                label="Ajouter un produit"
                icon="pi pi-plus"
                className="p-3 font-bold shadow-lg text-white"
                onClick={handleAddProduit}
                disabled={!selectedProduit}
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
                  value={commandeProduits ?? []}
                  className="shadow-sm rounded-lg"
                  scrollable
                  scrollHeight="280px"
                  responsiveLayout="scroll"
                  stripedRows
                  showGridlines
                >
                  <Column
                    field="produit.nom"
                    header="Produit"
                    body={(data) => (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                          {data.nom.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{data.nom}</span>
                      </div>
                    )}
                  />
                  <Column field="quantite" header="Quantité" />
                  <Column
                    field="prixUnitaire"
                    header="Prix Unitaire"
                    body={(rowData) => `fc${rowData.prixUnitaire.toFixed(2)}`}
                  />
                  <Column
                    field="total"
                    header="Total"
                    body={(rowData) => `fc${(rowData.prixUnitaire * rowData.quantite).toFixed(2)}`}
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
                  <div className="w-full max-w-md bg-green-50 rounded-lg p-4 shadow-inner text-gray-800">
                    <div className="flex justify-between mb-2">
                      <span>Total produits:</span>
                      <span className="font-semibold">
                        {commandeProduits.reduce((acc, p) => acc + p.quantite, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Sous-total:</span>
                      <span className="font-semibold">${totalCommande.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Livraison:</span>
                      <span className="font-semibold text-green-600">Gratuite</span>
                    </div>
                    <div className="flex justify-between mt-4 pt-3 font-bold text-lg border-t border-gray-300">
                      <span>Total à payer:</span>
                      <span className="text-green-700">${totalCommande.toFixed(2)}</span>
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
                      disabled={commandeProduits.length === 0 || status === 'loading'}
                      severity="success"
                    />
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
