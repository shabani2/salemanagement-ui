/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useRef } from 'react';
import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Menu } from 'primereact/menu';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import {
  addRegion,
  deleteRegion,
  fetchRegions,
  selectAllRegions,
} from '@/stores/slices/regions/regionSlice';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

export default function RegionManagement() {
  const [deleteDialogType, setDeleteDialogType] = useState<boolean | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const regions = useSelector((state: RootState) => selectAllRegions(state));
  const [search, setSearch] = useState('');
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [newRegion, setNewRegion] = useState<{ nom: string; ville: string }>({
    nom: '',
    ville: '',
  });
  const menuRef = useRef<any>(null);
  const initialRegion = { nom: '', ville: '' };

  useEffect(() => {
    dispatch(fetchRegions());
  }, [dispatch]);

  const handleAction = (action: string, rowData: any) => {
    setSelectedRegion(rowData);
    if (action == 'delete') {
      setDeleteDialogType(true);
    } else {
      setDialogType(action);
    }
  };

  const handleCreate = () => {
    dispatch(addRegion(newRegion));
    setDialogType(null);
    setNewRegion(initialRegion);
  };

  const handleUpdate = () => {
    if (selectedRegion) {
      dispatch(addRegion(selectedRegion));
      setDialogType(null);
    }
  };

  const handleDelete = () => {
    if (selectedRegion) {
      dispatch(deleteRegion(selectedRegion._id));
      setDialogType(null);
    }
  };

  const actionBodyTemplate = (rowData: any) => {
    const menuRef = useRef<any>(null);

    return (
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
  };

  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des régions' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des Régions</h2>
      </div>
      <div className="bg-white p-2 rounded-lg">
        <div className="flex justify-between my-4">
          <div className="relative w-2/3 flex justify-between">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ml-3 flex gap-2 w-2/5">
              <Button icon="pi pi-upload" label="Upload" className="p-button-primary text-[16px]" />
              <Button icon="pi pi-download" label="download" className="p-button-success" />
            </div>
          </div>

          <Button
            label="ajouter une region"
            className="bg-blue-500 text-white p-2 rounded"
            onClick={() => setDialogType('create')}
          />
        </div>
        <div className=" rounded-lg shadow-md">
          <DataTable
            value={regions}
            paginator
            stripedRows
            rows={5}
            className="rounded-lg"
            tableStyle={{ minWidth: '50rem' }}
          >
            <Column field="_id" header="#" body={(_, options) => options.rowIndex + 1} />
            <Column field="nom" header="Nom" sortable />
            <Column field="pointVenteCount" header="Points de vente" />
            <Column field="ville" header="Ville" sortable />
            <Column body={actionBodyTemplate} header="Actions" className="px-4 py-1" />
          </DataTable>
        </div>
      </div>

      <Dialog
        visible={dialogType === 'edit'}
        header="Modifier une région"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4">
          {[
            { name: 'nom', placeholder: 'Nom' },
            { name: 'ville', placeholder: 'Ville' },
          ].map(({ name, placeholder }) => (
            <div key={name} className="mb-4">
              <InputText
                type="text"
                placeholder={placeholder}
                value={selectedRegion?.[name]}
                onChange={(e) =>
                  setSelectedRegion({
                    ...selectedRegion,
                    [name]: e.target.value,
                  })
                }
                required
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <Button label="Modifier" className="bg-blue-500 text-white" onClick={handleUpdate} />
          </div>
        </div>
      </Dialog>
      <ConfirmDeleteDialog
        // @ts-ignore
        visible={deleteDialogType}
        onHide={() => setDeleteDialogType(false)}
        onConfirm={(item) => {
          handleDelete();
          setDeleteDialogType(false);
        }}
        item={selectedRegion}
        objectLabel="la region  "
        displayField="nom"
      />

      {/* Dialog for Creating Region */}
      <Dialog
        visible={dialogType === 'create'}
        header="Ajouter une région"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4">
          {[
            { name: 'nom', placeholder: 'Nom' },
            { name: 'ville', placeholder: 'Ville' },
          ].map(({ name, placeholder }) => (
            <div key={name} className="mb-4">
              <InputText
                type="text"
                placeholder={placeholder}
                value={newRegion[name as keyof typeof newRegion]}
                onChange={(e) => setNewRegion({ ...newRegion, [name]: e.target.value })}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <Button label="Ajouter" className="bg-green-500 text-white" onClick={handleCreate} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
