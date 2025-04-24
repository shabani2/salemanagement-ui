/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import CategorieList from '@/components/ui/produitComponent/CategoriesList';
import { Categorie, Produit } from '@/Models/produitsType';
import {
  addCategorie,
  deleteCategorie,
  fetchCategories,
  selectAllCategories,
  updateCategorie,
} from '@/stores/slices/produits/categoriesSlice';
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
import { FileUpload } from 'primereact/fileupload';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

const page = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [produits, setProduits] = useState<Produit[]>([]); //useSelector((state: RootState) => selectAllProduits(state));
  const [allProduits, setAllProduits] = useState<Produit[]>([]);
  const categories = useSelector((state: RootState) => selectAllCategories(state));
  const [search, setSearch] = useState('');
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<Categorie | null>(null);
  const selectedRowDataRef = useRef<any>(null);
  const [isDeleteProduit, setIsDeleteProduit] = useState<boolean>(false);

  const [newProduit, setNewProduit] = useState<Produit>({
    nom: '',
    categorie: '',
    prix: 0,
    prixVente: 0,
    tva: 0,
    marge: 0,
    netTopay: 0,
    unite: '',
  });

  //@ts-ignore
  // const [newCategory, setNewCategory] = useState<Categorie | null>(null);
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProduits()).then((resp) => {
      setAllProduits(resp.payload); // garde la version complète
      setProduits(resp.payload); // version visible (filtrée ou pas)
    });
  }, [dispatch]);

  const filterProduitByCategorie = (categorie: Categorie | null) => {
    if (!categorie) {
      setProduits(allProduits); // réinitialise
      return;
    }

    const filtered = allProduits.filter((p) => p.categorie._id === categorie._id);

    setProduits(filtered);
    console.log('Produits filtrés pour:', categorie.nom, filtered);
  };

  const handleAction = (action: string, rowData: any) => {
    console.log('Produit cliqué :', rowData);
    setSelectedProduit(rowData);
    setDialogType(action);
    if (action === 'delete') {
      setIsDeleteProduit(true);
    }
  };

  //@ts-ignore

  const actionBodyTemplate = (rowData: any) => (
    <div>
      <Menu
        model={[
          {
            label: 'Détails',
            command: () => handleAction('details', selectedRowDataRef.current),
          },
          {
            label: 'Modifier',
            command: () => handleAction('edit', selectedRowDataRef.current),
          },
          {
            label: 'Supprimer',
            command: () => handleAction('delete', selectedRowDataRef.current),
          },
        ]}
        popup
        ref={menuRef}
      />
      <Button
        icon="pi pi-bars"
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData; // 👈 on stocke ici le bon rowData
          menuRef.current.toggle(event);
        }}
        aria-haspopup
      />
    </div>
  );

  const handleSubmitProduit = async () => {
    if (newProduit._id) {
      // Cas modification
      await dispatch(updateProduit(newProduit)).then((resp) => {
        console.log('resp ', resp.payload);
      }); // updateProduit doit prendre l'objet complet
    } else {
      // Cas création
      await dispatch(addProduit(newProduit));
    }

    await dispatch(fetchProduits()).then((resp) => {
      setProduits(resp.payload);
    });

    setNewProduit({
      nom: '',
      categorie: '',
      prix: 0,
      prixVente: 0,
      tva: 0,
    }); // reset le form

    setDialogType(null);
  };

  useEffect(() => {
    if (dialogType === 'edit' && selectedProduit) {
      setNewProduit({
        nom: selectedProduit.nom || '',
        categorie: selectedProduit.categorie?._id || selectedProduit.categorie || '',
        prix: selectedProduit.prix || 0,
        prixVente: selectedProduit.prixVente || 0,
        tva: selectedProduit.tva || 0,
        _id: selectedProduit._id, // si tu en as besoin pour l'update
      });
    }
  }, [dialogType, selectedProduit]);

  const handleInputChange = (field: keyof Produit, value: number | string) => {
    const updated = { ...newProduit, [field]: value };
    if (typeof updated.prix === 'number' && typeof updated.marge === 'number') {
      updated.netTopay = updated.prix + (updated.prix * updated.marge) / 100;
    }
    if (typeof updated.netTopay === 'number' && typeof updated.tva === 'number') {
      updated.prixVente = updated.netTopay + (updated.netTopay * updated.tva) / 100;
    }
    setNewProduit(updated);
  };

  //gestion de variable de categorie

  const [newCategorie, setNewCategorie] = useState<Categorie>({
    nom: '',
    type: '',
    image: null,
  });
  const [formState, setFormState] = useState<Categorie>(newCategorie);
  const [isDeleteCat, setIsDeleteCat] = useState<boolean>(false);

  const handleOpenCreate = () => {
    setNewCategorie({ nom: '', type: '', image: null });
    setActionMade('create');
  };

  const [actionMade, setActionMade] = useState<string | null>(null);

  const geteActionMade = (action: 'edit' | 'delete', categorie: Categorie) => {
    if (action === 'edit') {
      setActionMade('update');
      setSelectedCategorie(categorie);
      console.log('selected categorie => ', selectedCategorie);
    } else if (action === 'delete') {
      setActionMade('delete');
      setIsDeleteCat(true);
      setSelectedCategorie(categorie);
    }
  };

  useEffect(() => {
    if (actionMade === 'create') {
      setFormState(newCategorie);
    } else if (actionMade === 'update' && selectedCategorie) {
      setFormState({
        _id: selectedCategorie._id,
        nom: selectedCategorie.nom,
        type: selectedCategorie.type,
        image: null,
      });
    }
  }, [actionMade, newCategorie, selectedCategorie]);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('nom', formState.nom);
    formData.append('type', formState.type);
    if (formState.image) {
      formData.append('image', formState.image);
    }
    if (actionMade === 'create') {
      console.log('categorie created : ', formData, formState);
      dispatch(addCategorie(formState)).then((resp) => {
        console.log('resp ', resp.payload);
      });
    } else if (actionMade === 'update') {
      if (formState.image == null) {
        console.log('image', selectedCategorie?.image);
        setFormState({ ...formState, image: selectedCategorie?.image });
      }
      dispatch(updateCategorie({ id: selectedCategorie?._id, data: formState }));
      console.log('categorie updated : ', formState);
    }

    setActionMade(null);
  };
  useEffect(() => {
    if (!formState.image && selectedCategorie?.image) {
      console.log('Image injectée dans formState:', selectedCategorie.image);
      setFormState((prev) => ({ ...prev, image: selectedCategorie.image }));
    }
  }, [selectedCategorie, formState.image]);

  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des Produits1' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des Produits</h2>
      </div>
      <div className="gap-3 rounded-lg shadow-md flex justify-between flex-row">
        <div className=" w-3/12 bg-white p-2 rounded-lg">
          <div className="flex flex-row justify-between p-1 items-center mb-2">
            <h3 className="text-lg font-bold">categories</h3>
            <div>
              <Button
                label="nouveau"
                icon="pi pi-plus"
                className="bg-blue-500 text-white p-1 rounded"
                onClick={() => handleOpenCreate()}
              />
            </div>
          </div>
          <CategorieList
            categories={categories}
            filterProduitByCategorie={filterProduitByCategorie}
            onAction={geteActionMade}
          />
        </div>
        <div className="w-9/12 bg-white p-2 rounded-lg">
          <div className="gap-4 mb-4   flex justify-between">
            <div className="relative w-2/3 flex flex-row ">
              <InputText
                className="p-2 border rounded flex-grow"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="ml-3 flex gap-2 w-2/5">
                <Button
                  label="import"
                  icon="pi pi-upload"
                  className="p-button-primary text-[16px]"
                />
                <Button
                  label="export"
                  icon="pi pi-download"
                  className="p-button-success text-[16px]"
                />
              </div>
            </div>
            <Button
              label="nouveau"
              icon="pi pi-plus"
              className="bg-blue-500 text-white p-2 rounded"
              onClick={() => setDialogType('create')}
            />
          </div>
          <div>
            <DataTable
              value={produits}
              paginator
              rows={5}
              className="rounded-lg"
              tableStyle={{ minWidth: '70rem' }}
            >
              <Column field="_id" header="#" body={(_, options) => options.rowIndex + 1} />
              <Column field="nom" header="Nom" sortable />

              <Column field="prix" header="Prix" sortable />
              <Column
                field="marge"
                header="Marge (%)"
                body={(rowData: Produit) => rowData.marge ?? 'N/A'}
                sortable
              />
              <Column
                header="Valeur Marge"
                body={(rowData: Produit) =>
                  rowData.prix && rowData.marge !== undefined
                    ? ((rowData.prix * rowData.marge) / 100).toFixed(2)
                    : 'N/A'
                }
              />
              <Column field="tva" header="TVA (%)" sortable />
              <Column
                header="Valeur TVA"
                body={(rowData: Produit) =>
                  rowData.netTopay && rowData.tva !== undefined
                    ? ((rowData.netTopay * rowData.tva) / 100).toFixed(2)
                    : 'N/A'
                }
              />
              <Column
                field="netTopay"
                header="Net à Payer"
                body={(rowData: Produit) => rowData.netTopay?.toFixed(2) ?? 'N/A'}
              />
              <Column
                field="prixVente"
                header="Prix de Vente"
                body={(rowData: Produit) => rowData.prixVente?.toFixed(2) ?? 'N/A'}
              />
              <Column
                field="unite"
                header="Unité"
                body={(rowData: Produit) => rowData.unite || 'N/A'}
              />

              <Column body={actionBodyTemplate} header="Actions" className="px-4 py-1" />
            </DataTable>
          </div>
        </div>
      </div>
      {/* dialog pour la creation d'un produit */}
      <Dialog
        visible={dialogType === 'create' || dialogType === 'edit'}
        header={dialogType === 'edit' ? 'Modifier le produit' : 'Ajouter un produit'}
        onHide={() => setDialogType(null)}
        style={{ width: '50vw' }}
        modal
      >
        <div className="p-4 space-y-4">
          {/* Ligne 1: nom et catégorie */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom</label>
              <InputText
                type="text"
                value={newProduit.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Catégorie</label>
              <Dropdown
                value={
                  typeof newProduit.categorie === 'string'
                    ? newProduit.categorie
                    : newProduit.categorie?._id
                }
                options={categories.map((cat) => ({ label: cat.nom, value: cat._id }))}
                onChange={(e) => handleInputChange('categorie', e.value)}
                placeholder="Sélectionner une catégorie"
                className="w-full border rounded"
              />
            </div>
          </div>

          {/* Ligne 2: prix, marge, tva */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Prix</label>
              <InputText
                type="number"
                value={newProduit.prix}
                onChange={(e) => handleInputChange('prix', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Marge (%)</label>
              <InputText
                type="number"
                value={newProduit.marge}
                onChange={(e) => handleInputChange('marge', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">TVA (%)</label>
              <InputText
                type="number"
                value={newProduit.tva}
                onChange={(e) => handleInputChange('tva', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Ligne 3: unité */}
          <div>
            <label className="block mb-1 text-sm font-medium">Unité</label>
            <InputText
              type="text"
              value={newProduit.unite}
              onChange={(e) => handleInputChange('unite', e.target.value)}
              placeholder="Unité (ex: kg, l, pièce)"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Ligne 4: valeurs calculées */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm">
                Valeur Marge: {((newProduit.prix * (newProduit.marge || 0)) / 100).toFixed(2)}{' '}
              </label>
              <label className="block text-sm">
                Valeur TVA:{' '}
                {(((newProduit.netTopay || 0) * (newProduit.tva || 0)) / 100).toFixed(2)}
              </label>
            </div>
            <div className="flex-1 text-right">
              <label className="block text-sm font-medium">
                Net à payer: {newProduit.netTopay?.toFixed(2)}
              </label>
              <label className="block text-sm font-medium">
                Prix de vente: {newProduit.prixVente?.toFixed(2)}
              </label>
            </div>
          </div>

          {/* Bouton action */}
          <div className="flex justify-end">
            <Button
              label={dialogType === 'edit' ? 'Modifier' : 'Ajouter'}
              className="bg-green-500 text-white"
              onClick={handleSubmitProduit}
            />
          </div>
        </div>
      </Dialog>
      {/* dialog cote categorie */}
      <Dialog
        visible={actionMade === 'create' || actionMade === 'update'}
        header={actionMade === 'create' ? 'Ajouter une catégorie' : 'Modifier la catégorie'}
        onHide={() => setActionMade(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4 space-y-4">
          {/* Ligne Nom + Type */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Nom</label>
              <InputText
                type="text"
                value={formState.nom}
                onChange={(e) => setFormState({ ...formState, nom: e.target.value })}
                required
                className="w-full p-2 border rounded"
                placeholder="Nom de la catégorie"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Type</label>
              <InputText
                type="text"
                value={formState.type}
                onChange={(e) => setFormState({ ...formState, type: e.target.value })}
                required
                className="w-full p-2 border rounded"
                placeholder="Type de la catégorie"
              />
            </div>
          </div>

          {/* Champ FileUpload + image preview côte à côte */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Sélectionner une image</label>
              <FileUpload
                mode="basic"
                accept="image/*"
                maxFileSize={1000000}
                chooseLabel="Choisir une image"
                className="w-full mt-2"
                customUpload
                uploadHandler={() => {}}
                onSelect={(e) => {
                  const file = e.files?.[0];
                  if (file) {
                    setFormState({ ...formState, image: file });
                  }
                }}
              />
            </div>

            {/* Image sélectionnée (preview) ou image actuelle */}
            {formState.image instanceof File ? (
              <img
                src={URL.createObjectURL(formState.image)}
                alt="Aperçu sélectionné"
                className="h-24 w-auto object-contain border rounded"
              />
            ) : (
              actionMade === 'update' &&
              selectedCategorie?.image && (
                <img
                  src={`http://localhost:8000/${selectedCategorie.image}`}
                  alt="Image actuelle"
                  className="h-24 w-auto object-contain border rounded"
                />
              )
            )}
          </div>

          {/* Bouton Ajouter/Modifier */}
          <div className="flex justify-end">
            <Button
              label={actionMade === 'create' ? 'Ajouter' : 'Modifier'}
              className="bg-blue-600 text-white"
              onClick={handleSubmit}
            />
          </div>
        </div>
      </Dialog>

      {/* delete categorie Dialogue */}

      <ConfirmDeleteDialog
        visible={isDeleteCat}
        onHide={() => setIsDeleteCat(false)}
        onConfirm={(item) => {
          dispatch(deleteCategorie(item._id)).then(() => {
            dispatch(fetchCategories());
            setIsDeleteCat(false);
          });
        }}
        item={selectedCategorie}
        objectLabel="la catégorie"
        displayField="nom"
      />

      {/* delete dialog pour produit */}

      <ConfirmDeleteDialog
        visible={isDeleteProduit}
        onHide={() => setIsDeleteProduit(false)}
        onConfirm={(item) => {
          dispatch(deleteProduit(item._id)).then(() => {
            dispatch(fetchProduits()).then((resp) => {
              setAllProduits(resp.payload); // garde la version complète
              setProduits(resp.payload); // version visible (filtrée ou pas)
            });
            setIsDeleteProduit(false);
          });
        }}
        item={selectedProduit}
        objectLabel="le produit"
        displayField="nom"
      />
    </div>
  );
};

export default page;
