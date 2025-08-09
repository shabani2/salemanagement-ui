/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import { fetchCategories, selectAllCategories } from '@/stores/slices/produits/categoriesSlice';
import {
  addProduit,
  deleteProduit,
  fetchProduits,
  updateProduit,
} from '@/stores/slices/produits/produitsSlice';
import { AppDispatch, RootState } from '@/stores/store';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Categorie, Produit } from '@/Models/produitsType';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { Toast } from 'primereact/toast';
import DropdownCategorieFilter from '@/components/ui/dropdowns/DropdownCategories';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';
import { API_URL } from '@/lib/apiConfig';
import { ProgressSpinner } from 'primereact/progressspinner';

const Page = () => {
  const menuRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const categories = useSelector((state: RootState) => selectAllCategories(state));
  
  // États pour la gestion des dialogues
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [isDeleteProduit, setIsDeleteProduit] = useState<boolean>(false);
  
  // États pour la gestion des formulaires
  const [newProduit, setNewProduit] = useState<Omit<Produit, '_id'>>({
    nom: '',
    categorie: '',
    prix: 0,
    prixVente: 0,
    tva: 0,
    marge: 0,
    seuil: 0,
    netTopay: 0,
    unite: '',
  });

  // États pour la gestion des filtres
  const [searchProd, setSearchProd] = useState('');
  const [filteredProduits, setFilteredProduits] = useState<Produit[]>([]);
  const [categorieFilter, setCategorieFilter] = useState<Categorie | null>(null);
  
  // Références
  const selectedRowDataRef = useRef<any>(null);
  const toast = useRef<Toast>(null);

  // Chargement initial des données
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await dispatch(fetchCategories());
        const result = await dispatch(fetchProduits());
        
        if (fetchProduits.fulfilled.match(result)) {
          const produitsData = result.payload || [];
          setAllProduits(produitsData);
          setProduits(produitsData);
          setFilteredProduits(produitsData);
        } else {
          toast.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Échec du chargement des produits',
            life: 3000,
          });
        }
      } catch (error) {
        console.error('Erreur de chargement:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Une erreur est survenue lors du chargement',
          life: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dispatch]);

  // Filtrage des produits
  useEffect(() => {
    let result = allProduits;
    
    // Filtre par texte
    if (searchProd) {
      const query = searchProd.toLowerCase();
      result = result.filter(p => 
        p.nom?.toLowerCase().includes(query) ||
        String(p.prix || 0).includes(query) ||
        String(p.marge || 0).includes(query) ||
        String(p.netTopay || 0).includes(query) ||
        String(p.tva || 0).includes(query) ||
        String(p.prixVente || 0).includes(query) ||
        p.unite?.toLowerCase().includes(query)
      );
    }
    
    // Filtre par catégorie
    if (categorieFilter) {
      result = result.filter(p => {
        const categorieId = typeof p.categorie === 'object' ? p.categorie?._id : p.categorie;
        return categorieId === categorieFilter._id;
      });
    }
    
    setFilteredProduits(result);
  }, [searchProd, categorieFilter, allProduits]);

  // Gestion des actions
  const handleAction = (action: string, rowData: Produit) => {
    setSelectedProduit(rowData);
    setDialogType(action);
    if (action === 'delete') setIsDeleteProduit(true);
  };

  // Template pour les actions
  const actionBodyTemplate = (rowData: Produit) => (
    <div>
      <Menu
        model={[
          { label: 'Détails', command: () => handleAction('details', rowData) },
          { label: 'Modifier', command: () => handleAction('edit', rowData) },
          { label: 'Supprimer', command: () => handleAction('delete', rowData) },
        ]}
        popup
        ref={menuRef}
      />
      <Button
        icon="pi pi-bars"
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData;
          menuRef.current?.toggle(event);
        }}
        aria-haspopup
      />
    </div>
  );

  // Soumission du formulaire
  const handleSubmitProduit = async () => {
    if (!newProduit.nom.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champ requis',
        detail: 'Le nom du produit est obligatoire',
        life: 3000,
      });
      return;
    }

    try {
      let result;
      if (selectedProduit?._id) {
        // Modification
        result = await dispatch(updateProduit({ 
          ...newProduit, 
          _id: selectedProduit._id 
        }));
      } else {
        // Création
        result = await dispatch(addProduit(newProduit));
      }

      if (addProduit.fulfilled.match(result) || updateProduit.fulfilled.match(result)) {
        // Recharger les produits après modification
        const fetchResult = await dispatch(fetchProduits());
        if (fetchProduits.fulfilled.match(fetchResult)) {
          const produitsData = fetchResult.payload || [];
          setAllProduits(produitsData);
          setProduits(produitsData);
        }

        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: selectedProduit?._id 
            ? 'Produit mis à jour' 
            : 'Produit créé avec succès',
          life: 3000,
        });
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: "Échec de l'opération",
        life: 3000,
      });
    } finally {
      resetForm();
    }
  };

  // Réinitialisation du formulaire
  const resetForm = () => {
    setNewProduit({
      nom: '',
      categorie: '',
      prix: 0,
      prixVente: 0,
      tva: 0,
      marge: 0,
      seuil: 0,
      netTopay: 0,
      unite: '',
    });
    setDialogType(null);
    setSelectedProduit(null);
  };

  // Gestion des changements de formulaire
  const handleInputChange = (field: keyof typeof newProduit, value: any) => {
    const updated = { ...newProduit, [field]: value };
    
    // Calculs automatiques
    const prix = Number(updated.prix) || 0;
    const marge = Number(updated.marge) || 0;
    const tva = Number(updated.tva) || 0;
    
    const netTopay = prix + (prix * marge) / 100;
    const prixVente = netTopay + (netTopay * tva) / 100;
    
    setNewProduit({
      ...updated,
      netTopay: Number(netTopay.toFixed(2)),
      prixVente: Number(prixVente.toFixed(2)),
    });
  };

  // Initialisation de l'édition
  useEffect(() => {
    if (dialogType === 'edit' && selectedProduit) {
      setNewProduit({
        nom: selectedProduit.nom || '',
        categorie: (selectedProduit.categorie as any)?._id || selectedProduit.categorie || '',
        prix: selectedProduit.prix || 0,
        prixVente: selectedProduit.prixVente || 0,
        tva: selectedProduit.tva || 0,
        marge: selectedProduit.marge || 0,
        seuil: selectedProduit.seuil || 0,
        netTopay: selectedProduit.netTopay || 0,
        unite: selectedProduit.unite || '',
      });
    }
  }, [dialogType, selectedProduit]);

  // Gestion des fichiers
  const handleFileManagement = async ({
    type,
    format,
    file,
  }: {
    type: 'import' | 'export';
    format: 'csv' | 'pdf' | 'excel';
    file?: File;
  }) => {
    if (type === 'export') {
      if (format === 'pdf') {
        toast.current?.show({
          severity: 'warn',
          summary: 'Export non supporté',
          detail: "L'export PDF n'est pas disponible",
          life: 3000,
        });
        return;
      }

      try {
        const exportFileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : format;
        const result = await dispatch(
          exportFile({
            url: '/export/produits',
            mouvements: filteredProduits,
            fileType: exportFileType,
          })
        );

        if (exportFile.fulfilled.match(result)) {
          const filename = `produits.${format === 'csv' ? 'csv' : 'xlsx'}`;
          downloadExportedFile(result.payload, filename);
          
          toast.current?.show({
            severity: 'success',
            summary: 'Export réussi',
            detail: `Fichier téléchargé: ${filename}`,
            life: 3000,
          });
        }
      } catch (error) {
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: "Échec de l'export",
          life: 3000,
        });
      }
    }
  };

  // Suppression d'un produit
  const handleDeleteProduit = async () => {
    if (!selectedProduit) return;
    
    try {
      const result = await dispatch(deleteProduit(selectedProduit._id));
      
      if (deleteProduit.fulfilled.match(result)) {
        // Mettre à jour l'état local
        setAllProduits(prev => prev.filter(p => p._id !== selectedProduit._id));
        setProduits(prev => prev.filter(p => p._id !== selectedProduit._id));
        
        toast.current?.show({
          severity: 'success',
          summary: 'Supprimé',
          detail: 'Produit supprimé avec succès',
          life: 3000,
        });
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la suppression',
        life: 3000,
      });
    } finally {
      setIsDeleteProduit(false);
      setSelectedProduit(null);
    }
  };

  // Rendu des images de catégorie
  const renderCategoryImage = (rowData: Produit) => {
    const categorie = rowData.categorie;
    if (!categorie) return null;

    let imageUrl = '';
    let categorieName = '';

    if (typeof categorie === 'object' && categorie !== null) {
      // Cas où la catégorie est peuplée
      if (categorie.image) {
        imageUrl = `${API_URL}/${categorie.image.replace('../', '')}`;
      }
      categorieName = categorie.nom || '';
    } else {
      // Cas où on a seulement l'ID
      const foundCat = categories.find(c => c._id === categorie);
      if (foundCat) {
        if (foundCat.image) {
          imageUrl = `${API_URL}/${foundCat.image.replace('../', '')}`;
        }
        categorieName = foundCat.nom || '';
      }
    }

    return imageUrl ? (
      <img 
        src={imageUrl} 
        alt={categorieName}
        className="w-8 h-8 rounded-full object-cover border border-gray-100"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    ) : null;
  };

  // Rendu conditionnel pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toast ref={toast} position="top-right" />
      
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Produits' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des Produits</h2>
      </div>
      
      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row w-full">
        <div className="bg-white p-4 rounded-lg w-full">
          <div className="gap-4 mb-4 w-full flex justify-between flex-wrap">
            <div className="relative w-full md:w-2/3 flex flex-row gap-2 flex-wrap">
              <InputText
                className="p-2 pl-10 border rounded w-full md:w-1/3"
                placeholder="Rechercher un produit..."
                value={searchProd}
                onChange={(e) => setSearchProd(e.target.value)}
              />

              <DropdownCategorieFilter
                onSelect={(categorie) => setCategorieFilter(categorie)}
              />
              
              <DropdownImportExport onAction={handleFileManagement} />
            </div>
            
            <Button
              label="Nouveau"
              icon="pi pi-plus"
              className="!bg-green-700 text-white p-2 rounded"
              onClick={() => setDialogType('create')}
            />
          </div>
          
          <div>
            <DataTable
              value={filteredProduits}
              paginator
              size="small"
              rows={10}
              className="rounded-lg text-sm text-gray-900 w-full"
              tableStyle={{ minWidth: '70rem' }}
              rowClassName={(_, options) => 
                options.rowIndex % 2 === 0 
                  ? '!bg-gray-100 !text-gray-900' 
                  : '!bg-green-50 !text-gray-900'
              }
              emptyMessage="Aucun produit trouvé"
              loading={loading}
            >
              <Column
                header="#"
                body={(_, { rowIndex }) => rowIndex + 1}
                headerClassName="text-sm !bg-green-800 !text-white"
                className="text-sm"
              />
              
              <Column
                header=""
                body={renderCategoryImage}
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                field="nom"
                header="Nom"
                sortable
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                field="prix"
                header="Prix/U"
                body={(rowData: Produit) => rowData.prix?.toFixed(2) || '0.00'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="Marge (%)"
                body={(rowData: Produit) => rowData.marge?.toFixed(2) || '0.00'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="Valeur Marge"
                body={(rowData: Produit) => {
                  const prix = rowData.prix || 0;
                  const marge = rowData.marge || 0;
                  return ((prix * marge) / 100).toFixed(2);
                }}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="Prix de vente/U"
                body={(rowData: Produit) => rowData.netTopay?.toFixed(2) || '0.00'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="TVA (%)"
                body={(rowData: Produit) => rowData.tva?.toFixed(2) || '0.00'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="Valeur TVA"
                body={(rowData: Produit) => {
                  const netTopay = rowData.netTopay || 0;
                  const tva = rowData.tva || 0;
                  return ((netTopay * tva) / 100).toFixed(2);
                }}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="TTC/U"
                body={(rowData: Produit) => rowData.prixVente?.toFixed(2) || '0.00'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="Seuil de stock"
                body={(rowData: Produit) => rowData.seuil?.toFixed(2) || '0.00'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                header="Unité"
                body={(rowData: Produit) => rowData.unite || '-'}
                className="text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
              
              <Column
                body={actionBodyTemplate}
                header="Actions"
                className="px-4 py-1 text-sm"
                headerClassName="text-sm !bg-green-800 !text-white"
              />
            </DataTable>
          </div>
        </div>
      </div>
      
      {/* Dialogue de création/édition */}
      <Dialog
        visible={dialogType === 'create' || dialogType === 'edit'}
        header={dialogType === 'edit' ? 'Modifier le produit' : 'Ajouter un produit'}
        onHide={resetForm}
        style={{ width: '90vw', maxWidth: '600px' }}
        modal
      >
        <div className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom*</label>
              <InputText
                value={newProduit.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Catégorie</label>
              <Dropdown
                value={newProduit.categorie}
                options={[
                  { label: 'Sélectionner...', value: '' },
                  ...(categories?.map(cat => ({
                    label: cat.nom,
                    value: cat._id
                  })) || [])
                ]}
                onChange={(e) => handleInputChange('categorie', e.value)}
                className="w-full border rounded"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Prix d'acquisition</label>
              <InputText
                type="number"
                value={newProduit.prix.toString()}
                onChange={(e) => handleInputChange('prix', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Marge (%)</label>
              <InputText
                type="number"
                value={newProduit.marge.toString()}
                onChange={(e) => handleInputChange('marge', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">TVA (%)</label>
              <InputText
                type="number"
                value={newProduit.tva.toString()}
                onChange={(e) => handleInputChange('tva', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Seuil de stock</label>
              <InputText
                type="number"
                value={newProduit.seuil.toString()}
                onChange={(e) => handleInputChange('seuil', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Unité</label>
            <InputText
              value={newProduit.unite}
              onChange={(e) => handleInputChange('unite', e.target.value)}
              placeholder="kg, l, pièce..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
            <div>
              <label className="block text-sm text-gray-600">Valeur Marge:</label>
              <span className="font-medium">
                {((newProduit.prix * newProduit.marge) / 100).toFixed(2)}
              </span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600">Valeur TVA:</label>
              <span className="font-medium">
                {((newProduit.netTopay * newProduit.tva) / 100).toFixed(2)}
              </span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600">Net à payer:</label>
              <span className="font-medium">{newProduit.netTopay.toFixed(2)}</span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600">Prix de vente:</label>
              <span className="font-medium">{newProduit.prixVente.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              label="Annuler"
              className="!bg-gray-500 text-white"
              onClick={resetForm}
            />
            <Button
              label={dialogType === 'edit' ? 'Modifier' : 'Créer'}
              className="!bg-green-700 text-white"
              onClick={handleSubmitProduit}
            />
          </div>
        </div>
      </Dialog>
      
      {/* Dialogue de suppression */}
      <ConfirmDeleteDialog
        visible={isDeleteProduit}
        onHide={() => setIsDeleteProduit(false)}
        onConfirm={handleDeleteProduit}
        item={selectedProduit || { _id: '', nom: '' }}
        objectLabel="le produit"
        displayField="nom"
      />
    </div>
  );
};

export default Page;