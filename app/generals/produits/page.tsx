/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
'use client';
import CategorieList from '@/components/ui/produitComponent/CategoriesList';
import { Categorie, Produit, ProduitModel } from '@/Models/produitsType';
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

  const [newProduit, setNewProduit] = useState<ProduitModel>({
    nom: '',
    categorie: '',
    prix: 0,
    prixVente: 0,
    tva: 0,
  });
  //@ts-ignore
  const [newCategory, setNewCategory] = useState<Categorie | null>(null);
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
    setSelectedProduit(rowData);
    setDialogType(action);
  };

  const handleCreate = async () => {
    await dispatch(addProduit(newProduit));
    await dispatch(fetchProduits()).then((resp) => {
      setProduits(resp.payload);
    });
    setDialogType(null);
  };

  const handleDelete = async () => {
    if (selectedProduit) {
      await dispatch(deleteProduit(selectedProduit._id));
      await dispatch(fetchProduits()).then((resp) => {
        setProduits(resp.payload);
      });
      setDialogType(null);
    }
  };
  //@ts-ignore
  const handleUpdate = async () => {
    //@ts-ignore
    await dispatch(updateProduit(selectedProduit));
    await dispatch(fetchProduits()).then((resp) => {
      setProduits(resp.payload);
    });
    setDialogType(null);
  };

  const actionBodyTemplate = (rowData: any) => (
    <div>
      <Menu
        model={[
          {
            label: 'Détails',
            command: () => handleAction('details', rowData),
          },
          { label: 'Modifier', command: () => handleAction('edit', rowData) },
          {
            label: 'Supprimer',
            command: () => handleAction('delete', rowData),
          },
        ]}
        popup
        ref={menuRef}
      />
      <Button
        icon="pi pi-bars"
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white bg-green-700"
        onClick={(event) => menuRef.current.toggle(event)}
        aria-haspopup
      />
    </div>
  );

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
          <h3>categories</h3>
          <CategorieList
            categories={categories}
            filterProduitByCategorie={filterProduitByCategorie}
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
                <Button label="up" icon="pi pi-upload" className="p-button-primary text-[16px]" />
                <Button
                  label="down"
                  icon="pi pi-download"
                  className="p-button-success text-[16px]"
                />
              </div>
            </div>
            <Button
              label="Créer un produit"
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
              tableStyle={{ minWidth: '60rem' }}
            >
              <Column field="_id" header="#" body={(_, options) => options.rowIndex + 1} />
              <Column field="nom" header="Nom" sortable />
              {/* <Column
                field="categorie"
                header="Catégorie"
                body={(rowData) =>
                  typeof rowData.categorie === "string"
                    ? rowData.categorie
                    : rowData.categorie?.nom || "N/A"
                }
                sortable
              /> */}
              <Column
                field="categorie.nom"
                header="Catégorie"
                sortable
                body={(rowData: Produit) =>
                  rowData.categorie?.nom ? (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-sm font-medium">
                      {rowData?.categorie?.nom}
                    </span>
                  ) : (
                    'N/A'
                  )
                }
              />

              <Column field="prix" header="Prix" sortable />
              <Column field="tva" header="TVA (%)" sortable />
              <Column field="prixVente" header="Prix de vente" sortable />

              <Column body={actionBodyTemplate} header="Actions" className="px-4 py-1" />
            </DataTable>
          </div>
        </div>
      </div>
      <Dialog
        visible={dialogType === 'create'}
        header="Ajouter un produit"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4 space-y-4">
          {/* Champ nom */}
          <div>
            <InputText
              type="text"
              placeholder="Nom"
              value={newProduit.nom}
              onChange={(e) => setNewProduit({ ...newProduit, nom: e.target.value })}
              required
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Prix et TVA sur la même ligne */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Prix</label>
              <InputText
                type="number"
                //@ts-ignore
                value={newProduit.prix}
                onChange={(e) =>
                  setNewProduit({
                    ...newProduit,
                    prix: parseFloat(e.target.value) || 0,
                  })
                }
                required
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">TVA (%)</label>
              <InputText
                type="number"
                //@ts-ignore
                value={newProduit.tva}
                onChange={(e) =>
                  setNewProduit({
                    ...newProduit,
                    tva: parseFloat(e.target.value) || 0,
                  })
                }
                required
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Sélecteur de catégorie */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Categorie</label>
              <Dropdown
                value={
                  typeof newProduit.categorie === 'string'
                    ? newProduit.categorie
                    : newProduit.categorie?._id
                }
                options={categories.map((cat) => ({
                  label: cat.nom,
                  value: cat._id,
                }))}
                onChange={(e) => setNewProduit({ ...newProduit, categorie: e.value })}
                placeholder="Sélectionner une catégorie"
                className="w-full border rounded"
              />
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium">Prix de vente</label>
              <InputText
                type="number"
                //@ts-ignore
                value={newProduit.prixVente}
                onChange={(e) =>
                  setNewProduit({ ...newProduit, prixVente: parseFloat(e.target.value) || 0 })
                }
                placeholder="Prix de vente"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Bouton d'ajout */}
          <div className="flex justify-end">
            <Button label="Ajouter" className="bg-green-500 text-white" onClick={handleCreate} />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default page;
