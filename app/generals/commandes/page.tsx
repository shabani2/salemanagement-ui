// components/CommandeManager.tsx
'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// PrimeReact components
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Menu } from 'primereact/menu';
import { BreadCrumb } from 'primereact/breadcrumb';
import { RadioButton, RadioButtonChangeEvent } from 'primereact/radiobutton';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Card } from 'primereact/card';
import { Fieldset } from 'primereact/fieldset';
import { Commande } from '@/Models/commandeType';
import { Region } from '@/Models/regionTypes';
import { PointVente } from '@/Models/pointVenteType';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import { addCommande, deleteCommande, fetchCommandes, selectAllCommandes, selectCommandeStatus } from '@/stores/slices/commandes/commandeSlice';
import { fetchCommandeProduitsByCommande, selectAllCommandeProduits, updateStatutProduitCommande } from '@/stores/slices/commandes/commandeProduitSlice';
import { Produit } from '@/Models/produitsType';
import { CommandeProduit } from '@/Models/CommandeProduitType';
import { createMouvementStock } from '@/stores/slices/mvtStock/mvtStock';

// Données de démonstration
const regions: Region[] = [
  { _id: '1', nom: 'Région Nord', ville: 'Kinshasa' },
  { _id: '2', nom: 'Région Sud', ville: 'Lubumbashi' },
  { _id: '3', nom: 'Région Est', ville: 'Goma' },
  { _id: '4', nom: 'Région Ouest', ville: 'Matadi' },
];

const pointsVente: PointVente[] = [
  { _id: '1', nom: 'Point de vente A', region: '1', adresse: 'ngaliema' },
  { _id: '2', nom: 'Point de vente B', region: '1', adresse: 'gombe' },
  { _id: '3', nom: 'Point de vente C', region: '2', adresse: 'katanga' },
  { _id: '4', nom: 'Point de vente D', region: '3', adresse: 'goma' },
];

const produits: Produit[] = [
  { _id: '1', nom: 'Produit A', prix: 10 },
  { _id: '2', nom: 'Produit B', prix: 20 },
  { _id: '3', nom: 'Produit C', prix: 30 },
  { _id: '4', nom: 'Produit D', prix: 40 },
];

const CommandeManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);
  const commandes = useSelector(selectAllCommandes);
  const commandeProduits = useSelector(selectAllCommandeProduits);
  const commandeStatus = useSelector(selectCommandeStatus);

  // États
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [detailDialogVisible, setDetailDialogVisible] = useState(false);
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loadingProduits, setLoadingProduits] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<PointVente | null>(null);
  const [destinationType, setDestinationType] = useState<'region' | 'pointVente' | 'depotCentral'>('region');
  const [newCommande, setNewCommande] = useState<Partial<Commande>>({
    statut: 'attente',
    depotCentral: false,
    produits: []
  });
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  const [productQuantity, setProductQuantity] = useState<number>(1);

  // Fil d'Ariane
  const breadcrumbItems = useMemo(() => [
    { label: 'Accueil', url: '/' },
    { label: 'Gestion des commandes', url: '/gestion-commandes' }
  ], []);

  const breadcrumbHome = useMemo(() => ({ icon: 'pi pi-home', url: '/' }), []);

  // Chargement de l'utilisateur
  useEffect(() => {
    const userData = localStorage.getItem('user-agricap');
    if (userData) setCurrentUser(JSON.parse(userData));
  }, []);

  // Chargement des commandes
  useEffect(() => {
    dispatch(fetchCommandes());
  }, [dispatch]);

  // Chargement des produits de la commande sélectionnée
  useEffect(() => {
    if (!selectedCommande?._id || !detailDialogVisible) return;
    
    const loadProducts = async () => {
      setLoadingProduits(true);
      try {
        await dispatch(fetchCommandeProduitsByCommande(selectedCommande._id)).unwrap();
      } catch {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec du chargement des produits',
          life: 3000
        });
      } finally {
        setLoadingProduits(false);
      }
    };

    loadProducts();
  }, [selectedCommande, detailDialogVisible, dispatch]);

  // Filtrage des commandes
  const filteredCommandes = useMemo(() => {
    return commandes.filter(commande => {
      const matchesGlobalFilter = commande.numero.toLowerCase().includes(globalFilter.toLowerCase());
      const matchesRegion = selectedRegion 
        ? (commande.region && (typeof commande.region === 'object' 
          ? commande.region._id === selectedRegion._id 
          : commande.region === selectedRegion._id)) 
        : true;
      
      const matchesPointVente = selectedPointVente 
        ? (commande.pointVente && (typeof commande.pointVente === 'object' 
          ? commande.pointVente._id === selectedPointVente._id 
          : commande.pointVente === selectedPointVente._id)) 
        : true;
      
      return matchesGlobalFilter && matchesRegion && matchesPointVente;
    });
  }, [commandes, globalFilter, selectedRegion, selectedPointVente]);

  // Gestion des produits de la nouvelle commande
  const addProductToCommande = useCallback(() => {
    if (!selectedProduct || productQuantity < 1) return;
    
    setNewCommande(prev => ({
      ...prev,
      produits: [
        ...(prev.produits || []),
        { produit: selectedProduct, quantite: productQuantity, statut: 'attente' }
      ]
    }));
    
    setSelectedProduct(null);
    setProductQuantity(1);
    
    toast.current?.show({
      severity: 'success',
      summary: 'Produit ajouté',
      detail: 'Le produit a été ajouté à la commande',
      life: 2000
    });
  }, [selectedProduct, productQuantity]);

  const removeProductFromCommande = useCallback((index: number) => {
    setNewCommande(prev => {
      const newProduits = [...(prev.produits || [])];
      newProduits.splice(index, 1);
      return { ...prev, produits: newProduits };
    });
  }, []);

  // Création de commande
  const createNewCommande = useCallback(() => {
    if (!newCommande.produits?.length) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez ajouter au moins un produit',
        life: 3000
      });
      return;
    }

    if (!currentUser?._id) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Utilisateur non identifié',
        life: 3000
      });
      return;
    }

    const commandeData = {
      ...newCommande,
      user: currentUser._id,
      region: destinationType === 'region' && newCommande.region 
        ? (typeof newCommande.region === 'object' ? newCommande.region._id : newCommande.region)
        : undefined,
      pointVente: destinationType === 'pointVente' && newCommande.pointVente 
        ? (typeof newCommande.pointVente === 'object' ? newCommande.pointVente._id : newCommande.pointVente)
        : undefined,
      depotCentral: destinationType === 'depotCentral',
      produits: newCommande.produits.map(p => ({
        produit: typeof p.produit === 'object' ? p.produit._id : p.produit,
        quantite: p.quantite
      }))
    };

    dispatch(addCommande(commandeData))
      .unwrap()
      .then(() => {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande créée avec succès',
          life: 3000
        });
        setCreateDialogVisible(false);
        setNewCommande({
          statut: 'attente',
          depotCentral: false,
          produits: []
        });
      })
      .catch((error: Error) => {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: `Échec de la création: ${error.message || 'Erreur inconnue'}`,
          life: 5000
        });
      });
  }, [newCommande, currentUser, destinationType, dispatch]);

  // Gestion des statuts de produit
  const updateProductStatus = useCallback((
    commandeId: string,
    produitId: string,
    newStatus: 'attente' | 'livré' | 'annulé'
  ) => {
    dispatch(updateStatutProduitCommande({ commandeId, produitId, statut: newStatus }))
      .unwrap()
      .then(() => {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: `Statut mis à jour: ${newStatus}`,
          life: 3000
        });
      })
      .catch(() => {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec de la mise à jour',
          life: 3000
        });
      });
  }, [dispatch]);

  // Livraison de produit
  const handleLivraison = useCallback(async (produit: CommandeProduit) => {
    if (!selectedCommande || !currentUser?._id) return;

    try {
      const mouvementData = {
        produit: typeof produit.produit === 'string' ? produit.produit : produit.produit._id,
        type: 'Livraison',
        quantite: produit.quantite,
        montant: 0,
        statut: true,
        depotCentral: selectedCommande.depotCentral || false,
        region: selectedCommande.region,
        pointVente: selectedCommande.pointVente,
        user: currentUser._id,
        commandeId: selectedCommande._id as string
      };

      const mouvementResult = await dispatch(createMouvementStock(mouvementData)).unwrap();
      
      updateProductStatus(
        selectedCommande._id as string,
        produit._id as string,
        'livré'
      );
      
      setSelectedCommande(prev => prev ? {
        ...prev,
        produits: (prev.produits || []).map(p => 
          p._id === produit._id ? { ...p, mouvementStockId: mouvementResult._id } : p
        )
      } : null);

      toast.current?.show({
        severity: 'success',
        summary: 'Livraison effectuée',
        detail: 'Produit livré avec succès',
        life: 3000
      });
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la livraison',
        life: 3000
      });
    }
  }, [selectedCommande, currentUser, dispatch, updateProductStatus]);

  // Gestion des commandes
  const openDetailDialog = useCallback((commande: Commande) => {
    setSelectedCommande(commande);
    setDetailDialogVisible(true);
  }, []);

  const confirmDeleteCommande = useCallback((commande: Commande) => {
    confirmDialog({
      message: 'Êtes-vous sûr de vouloir annuler cette commande ?',
      header: 'Confirmation d\'annulation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => deleteSelectedCommande(commande),
    });
  }, []);

  const deleteSelectedCommande = useCallback((commande: Commande) => {
    if (!commande._id) return;
    
    dispatch(deleteCommande(commande._id))
      .unwrap()
      .then(() => {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Commande annulée',
          life: 3000
        });
      })
      .catch(() => {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec de l\'annulation',
          life: 3000
        });
      });
  }, [dispatch]);

  const validateCommande = useCallback((commande: Commande) => {
    toast.current?.show({
      severity: 'success',
      summary: 'Commande validée',
      detail: `Commande ${commande.numero} validée`,
      life: 3000
    });
  }, []);

  // Templates pour DataTable
  const statusBodyTemplate = useCallback((commande: Commande) => (
    <Tag 
      severity={
        commande.statut === 'livrée' ? 'success' : 
        commande.statut === 'annulée' ? 'danger' : 'warning'
      }
      value={commande.statut.toUpperCase()}
    />
  ), []);

  const destinationBodyTemplate = useCallback((commande: Commande) => {
    if (commande.depotCentral) {
      return <Tag icon="pi pi-building" severity="info" value="Dépôt Central" />;
    }
    
    if (commande.region) {
      return (
        <div>
          <Tag icon="pi pi-map-marker" severity="info" value="Région" />
          <div className="mt-1">
            {typeof commande.region === 'object' ? commande.region.nom : ''}
          </div>
        </div>
      );
    }
    
    if (commande.pointVente) {
      return (
        <div>
          <Tag icon="pi pi-shopping-cart" severity="info" value="Point de vente" />
          <div className="mt-1">
            {typeof commande.pointVente === 'object' ? commande.pointVente.nom : ''}
          </div>
        </div>
      );
    }
    
    return <Tag severity="warning" value="N/A" />;
  }, []);

  const actionBodyTemplate = useCallback((commande: Commande) => {
    const menuItems = [
      { label: 'Détails', icon: 'pi pi-eye', command: () => openDetailDialog(commande) },
      { 
        label: 'Valider', 
        icon: 'pi pi-check', 
        command: () => validateCommande(commande),
        disabled: commande.statut !== 'attente' 
      },
      { 
        label: 'Annuler', 
        icon: 'pi pi-times', 
        command: () => confirmDeleteCommande(commande),
        disabled: commande.statut !== 'attente' 
      }
    ];

    return (
      <div className="flex justify-content-center">
        <Menu model={menuItems} popup />
        <Button 
          icon="pi pi-ellipsis-v" 
          className="p-button-rounded p-button-text"
          onClick={(e) => e.currentTarget.nextSibling?.show(e)}
        />
      </div>
    );
  }, [openDetailDialog, validateCommande, confirmDeleteCommande]);

  const productStatusBodyTemplate = useCallback((produit: CommandeProduit) => (
    <Tag 
      severity={
        produit.statut === 'livré' ? 'success' : 
        produit.statut === 'annulé' ? 'danger' : 'warning'
      }
      value={produit.statut.toUpperCase()}
    />
  ), []);

  const productActionBodyTemplate = useCallback((produit: CommandeProduit) => (
    <div className="flex gap-2 justify-content-center">
      {produit.statut === 'attente' && (
        <Button
          icon="pi pi-truck"
          className="p-button-success p-button-sm"
          onClick={() => handleLivraison(produit)}
          tooltip="Livrer ce produit"
          tooltipOptions={{ position: 'top' }}
        />
      )}
      {produit.statut === 'livré' && (
        <Tag icon="pi pi-check-circle" severity="success" value="Livré" />
      )}
    </div>
  ), [handleLivraison]);

  // Composants réutilisables
  const RegionFilter = useMemo(() => (
    <Dropdown
      value={selectedRegion}
      onChange={(e: DropdownChangeEvent) => setSelectedRegion(e.value)}
      options={regions}
      optionLabel="nom"
      placeholder="Sélectionnez une région"
      className="w-full"
    />
  ), [selectedRegion]);

  const PointVenteFilter = useMemo(() => (
    <Dropdown
      value={selectedPointVente}
      onChange={(e: DropdownChangeEvent) => setSelectedPointVente(e.value)}
      options={pointsVente}
      optionLabel="nom"
      placeholder="Sélectionnez un point de vente"
      className="w-full"
    />
  ), [selectedPointVente]);

  const ProductForm = useMemo(() => (
    <div className="grid">
      <div className="col-12 md:col-6">
        <div className="p-field mb-3">
          <label className="block mb-2 font-medium">Produit</label>
          <Dropdown
            value={selectedProduct}
            onChange={(e: DropdownChangeEvent) => setSelectedProduct(e.value)}
            options={produits}
            optionLabel="nom"
            placeholder="Sélectionnez un produit"
            className="w-full"
          />
        </div>
      </div>
      
      <div className="col-12 md:col-4">
        <div className="p-field mb-3">
          <label className="block mb-2 font-medium">Quantité</label>
          <InputNumber
            value={productQuantity}
            onValueChange={(e: InputNumberValueChangeEvent) => setProductQuantity(e.value || 1)}
            min={1}
            className="w-full"
          />
        </div>
      </div>
      
      <div className="col-12 md:col-2 flex align-items-end">
        <Button
          label="Ajouter"
          icon="pi pi-plus"
          className="p-button-success w-full"
          onClick={addProductToCommande}
          disabled={!selectedProduct}
        />
      </div>
    </div>
  ), [selectedProduct, productQuantity, addProductToCommande]);

  const ProductList = useMemo(() => (
    <div className="mt-4">
      <h4 className="font-medium mb-3">Produits ajoutés</h4>
      
      {!newCommande.produits?.length ? (
        <p className="text-gray-500">Aucun produit ajouté</p>
      ) : (
        <div className="border rounded">
          {newCommande.produits.map((produit, index) => (
            <div key={index} className="flex justify-content-between align-items-center p-3 border-bottom">
              <div>
                <span className="font-medium">
                  {typeof produit.produit === 'object' ? produit.produit.nom : 'Produit'}
                </span>
                <span className="ml-3">x {produit.quantite}</span>
              </div>
              <Button
                icon="pi pi-trash"
                className="p-button-danger p-button-rounded p-button-text"
                onClick={() => removeProductFromCommande(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  ), [newCommande.produits, removeProductFromCommande]);

  const DetailDialogFooter = useMemo(() => (
    <Button 
      label="Fermer" 
      icon="pi pi-times" 
      onClick={() => setDetailDialogVisible(false)} 
      className="p-button-text" 
    />
  ), []);

  const ProductContent = useMemo(() => (
    <DataTable 
      value={commandeProduits} 
      paginator 
      rows={5}
      rowsPerPageOptions={[5, 10, 25]}
      loading={loadingProduits}
      emptyMessage="Aucun produit trouvé"
      className="p-datatable-sm"
    >
      <Column 
        header="Produit" 
        body={(rowData: CommandeProduit) => typeof rowData.produit === 'object' ? rowData.produit.nom : 'N/A'} 
      />
      <Column field="quantite" header="Quantité" />
      <Column header="Statut" body={productStatusBodyTemplate} />
      <Column header="Actions" body={productActionBodyTemplate} align="center" />
    </DataTable>
  ), [commandeProduits, loadingProduits, productStatusBodyTemplate, productActionBodyTemplate]);

  // Affichage du chargement
  if (commandeStatus === 'loading') {
    return (
      <div className="flex justify-content-center align-items-center h-20rem">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <ConfirmDialog />
      
      {/* En-tête */}
      <div className="flex justify-content-between align-items-center mb-4">
        <BreadCrumb model={breadcrumbItems} home={breadcrumbHome} className="border-none p-0" />
        <h1 className="text-2xl font-bold text-gray-800">Gestion des Commandes</h1>
      </div>
      
      {/* Filtres */}
      <Card className="mb-6">
        <div className="grid">
          <div className="col-12 md:col-3">
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-search"></i>
              </span>
              <InputText 
                placeholder="Rechercher par numéro..." 
                value={globalFilter} 
                onChange={(e) => setGlobalFilter(e.target.value)} 
                className="w-full"
              />
            </div>
          </div>
          
          <div className="col-12 md:col-3">{RegionFilter}</div>
          <div className="col-12 md:col-3">{PointVenteFilter}</div>
          
          <div className="col-12 md:col-3 flex align-items-center justify-content-end">
            <Button 
              label="Créer une commande" 
              icon="pi pi-plus" 
              className="p-button-primary"
              onClick={() => setCreateDialogVisible(true)}
            />
          </div>
        </div>
      </Card>
      
      {/* Tableau principal */}
      <Card>
        <DataTable 
          value={filteredCommandes} 
          paginator 
          rows={10}
          footer={`Total: ${filteredCommandes.length} commande${filteredCommandes.length !== 1 ? 's' : ''}`}
          emptyMessage="Aucune commande trouvée"
          className="p-datatable-striped p-datatable-gridlines"
        >
          <Column field="numero" header="Numéro" sortable style={{ minWidth: '120px' }} />
          <Column 
            header="Émetteur" 
            body={(rowData: Commande) => typeof rowData.user === 'object' ? rowData.user.nom : 'N/A'} 
            sortable 
            style={{ minWidth: '150px' }} 
          />
          <Column header="Destination" body={destinationBodyTemplate} style={{ minWidth: '180px' }} />
          <Column 
            header="Date" 
            body={(rowData: Commande) => new Date(rowData.createdAt!).toLocaleDateString('fr-FR')} 
            sortable 
            style={{ minWidth: '120px' }} 
          />
          <Column header="Statut" body={statusBodyTemplate} sortable style={{ minWidth: '130px' }} />
          <Column header="Actions" body={actionBodyTemplate} style={{ width: '80px' }} align="center" />
        </DataTable>
      </Card>
      
      {/* Dialogue Détails */}
      <Dialog 
        visible={detailDialogVisible} 
        style={{ width: '75vw' }} 
        header={`Détails de la commande: ${selectedCommande?.numero}`}
        modal 
        footer={DetailDialogFooter}
        onHide={() => setDetailDialogVisible(false)}
      >
        {selectedCommande && (
          <div className="grid">
            <div className="col-12 md:col-4">
              <div className="field mb-4">
                <label className="font-medium block mb-2">Émetteur</label>
                <div>
                  {typeof selectedCommande.user === 'object' ? selectedCommande.user.nom : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="col-12 md:col-4">
              <div className="field mb-4">
                <label className="font-medium block mb-2">Statut</label>
                {statusBodyTemplate(selectedCommande)}
              </div>
            </div>
            
            <div className="col-12 md:col-4">
              <div className="field mb-4">
                <label className="font-medium block mb-2">Date de création</label>
                <div>
                  {new Date(selectedCommande.createdAt!).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>
            
            <div className="col-12">
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-xl font-semibold mb-4">Produits commandés</h3>
                {ProductContent}
              </div>
            </div>
          </div>
        )}
      </Dialog>
      
      {/* Dialogue Création */}
      <Dialog 
        visible={createDialogVisible} 
        style={{ width: '50vw' }} 
        header="Créer une nouvelle commande"
        modal 
        onHide={() => setCreateDialogVisible(false)}
      >
        <div className="grid">
          <div className="col-12 mb-4">
            <div className="p-field">
              <label className="block mb-2 font-medium">Émetteur</label>
              <div className="p-3 bg-gray-100 rounded">
                {currentUser ? (
                  <div className="flex align-items-center">
                    <i className="pi pi-user mr-3"></i>
                    <span>{currentUser.nom} ({currentUser.role})</span>
                  </div>
                ) : (
                  <div className="text-red-500">Aucun utilisateur connecté</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-12 mb-4">
            <label className="block mb-2 font-medium">Destination</label>
            <div className="flex flex-wrap gap-4">
              <div className="flex align-items-center">
                <RadioButton 
                  inputId="region" 
                  name="destination" 
                  value="region" 
                  checked={destinationType === 'region'} 
                  onChange={(e: RadioButtonChangeEvent) => setDestinationType(e.value)}
                />
                <label htmlFor="region" className="ml-2">Région</label>
              </div>
              <div className="flex align-items-center">
                <RadioButton 
                  inputId="pointVente" 
                  name="destination" 
                  value="pointVente" 
                  checked={destinationType === 'pointVente'} 
                  onChange={(e: RadioButtonChangeEvent) => setDestinationType(e.value)}
                />
                <label htmlFor="pointVente" className="ml-2">Point de vente</label>
              </div>
              <div className="flex align-items-center">
                <RadioButton 
                  inputId="depotCentral" 
                  name="destination" 
                  value="depotCentral" 
                  checked={destinationType === 'depotCentral'} 
                  onChange={(e: RadioButtonChangeEvent) => setDestinationType(e.value)}
                />
                <label htmlFor="depotCentral" className="ml-2">Dépôt central</label>
              </div>
            </div>
          </div>
          
          {destinationType === 'region' && (
            <div className="col-12 mb-4">
              <div className="p-field">
                <label className="block mb-2 font-medium">Région</label>
                <Dropdown
                  value={newCommande.region}
                  onChange={(e: DropdownChangeEvent) => setNewCommande({...newCommande, region: e.value})}
                  options={regions}
                  optionLabel="nom"
                  placeholder="Sélectionnez une région"
                  className="w-full"
                />
              </div>
            </div>
          )}
          
          {destinationType === 'pointVente' && (
            <div className="col-12 mb-4">
              <div className="p-field">
                <label className="block mb-2 font-medium">Point de vente</label>
                <Dropdown
                  value={newCommande.pointVente}
                  onChange={(e: DropdownChangeEvent) => setNewCommande({...newCommande, pointVente: e.value})}
                  options={pointsVente}
                  optionLabel="nom"
                  placeholder="Sélectionnez un point de vente"
                  className="w-full"
                />
              </div>
            </div>
          )}
          
          <div className="col-12">
            <Fieldset legend="Ajouter des produits" className="mb-4">
              {ProductForm}
              {ProductList}
            </Fieldset>
          </div>
          
          <div className="col-12 flex justify-content-end gap-2 mt-4">
            <Button 
              label="Annuler" 
              icon="pi pi-times" 
              className="p-button-text" 
              onClick={() => setCreateDialogVisible(false)}
            />
            <Button 
              label="Créer" 
              icon="pi pi-check" 
              className="p-button-primary"
              onClick={createNewCommande}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CommandeManager;