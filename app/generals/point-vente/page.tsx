/* eslint-disable @typescript-eslint/ban-ts-comment */
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
import { Dropdown } from 'primereact/dropdown';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
//import { addPointVente, deletePointVente, fetchPointsVente, selectAllPointsVente } from "@/stores/slices/pointVenteSlice";
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import {
  addPointVente,
  deletePointVente,
  fetchPointVentes,
  selectAllPointVentes,
  updatePointVente,
} from '@/stores/slices/pointvente/pointventeSlice';
import { PointVente } from '@/Models/pointVenteType';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import { saveAs } from 'file-saver';
import { Toast } from 'primereact/toast';

export default function PointVenteManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));
  const regions = useSelector((state: RootState) => selectAllRegions(state));

  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<any>(null);
  const [newPointVente, setNewPointVente] = useState<{
    nom: string;
    adresse: string;
    region: string | null;
  }>({ nom: '', adresse: '', region: null });
  const menuRef = useRef<any>(null);

  useEffect(() => {
    dispatch(fetchPointVentes());
    dispatch(fetchRegions());
  }, [dispatch]);

  const handleAction = (action: string, rowData: any) => {
    setSelectedPointVente(rowData);
    setDialogType(action);
  };

  const handleCreate = () => {
    //@ts-ignore
    dispatch(addPointVente(newPointVente));
    setDialogType(null);
  };
  //@ts-ignore
  const handleDelete = () => {
    if (selectedPointVente) {
      dispatch(deletePointVente(selectedPointVente._id));
      setDialogType(null);
    }
  };
  const selectedRowDataRef = useRef<any>(null);
  const actionBodyTemplate = (rowData: PointVente) => (
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
        className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
        onClick={(event) => {
          selectedRowDataRef.current = rowData; // 👈 on stocke ici le bon rowData
          menuRef.current.toggle(event);
        }}
        aria-haspopup
        severity={undefined}
      />
    </div>
  );

  const handleUpdate = () => {
    dispatch(
      updatePointVente({ id: selectedPointVente?._id, updateData: selectedPointVente })
    ).then(() => {
      dispatch(fetchPointVentes());
    });
    setSelectedPointVente(null);
    setDialogType(null);
  };

  console.log('point de vente = ', pointsVente);

  // traitement de la recherche
  const [searchPV, setSearchPV] = useState('');
  const [filteredPointsVente, setFilteredPointsVente] = useState(pointsVente || []);

  useEffect(() => {
    const filtered = pointsVente.filter((pv) => {
      const query = searchPV.toLowerCase();
      return (
        pv.nom?.toLowerCase().includes(query) ||
        pv.adresse?.toLowerCase().includes(query) ||
        pv.region?.nom?.toLowerCase().includes(query)
      );
    });
    setFilteredPointsVente(filtered);
  }, [searchPV, pointsVente]);

  //file management
  const toast = useRef<Toast>(null);

  const handleFileManagement = ({
    type,
    format,
    file,
  }: {
    type: 'import' | 'export';
    format: 'csv' | 'pdf';
    file?: File;
  }) => {
    if (type === 'import' && file) {
      setImportedFiles((prev) => [...prev, { name: file.name, format }]);
      toast.current?.show({
        severity: 'info',
        summary: `Import ${format.toUpperCase()}`,
        detail: `File imported: ${file.name}`,
        life: 3000,
      });
      return;
    }

    if (type === 'export') {
      const content = format === 'csv' ? 'name,age\nJohn,30\nJane,25' : 'Excel simulation content';
      const blob = new Blob([content], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `export.${format === 'csv' ? 'csv' : 'xlsx'}`;
      saveAs(blob, filename);

      toast.current?.show({
        severity: 'success',
        summary: `Export ${format.toUpperCase()}`,
        detail: `File downloaded: ${filename}`,
        life: 3000,
      });
    }
  };
  return (
    <div className="  min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des points de vente' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-500">Gestion des Points de Vente</h2>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="gap-4 mb-4   flex justify-between">
          <div className="relative w-2/3 flex flex-row ">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher ..."
              value={searchPV}
              onChange={(e) => setSearchPV(e.target.value)}
            />
            <div className="ml-3 flex w-2/5 ">
              <DropdownImportExport onAction={handleFileManagement} />
            </div>
          </div>
          <Button
            icon="pi pi-plus"
            label="nouveau"
            className=" text-white p-2 rounded !bg-green-700"
            onClick={() => setDialogType('create')}
            severity={undefined}
          />
        </div>
        <DataTable
          value={filteredPointsVente}
          paginator
          
          rows={5}
          className="rounded-lg"
          tableStyle={{ minWidth: '50rem' }}
        >
          <Column field="_id" header="#" body={(_, options) => options.rowIndex + 1} />
          <Column
            field="region"
            header="Région"
            body={(rowData) => rowData.region?.nom || 'N/A'}
            sortable
          />
          <Column field="nom" header="Nom" sortable />
          <Column field="adresse" header="Adresse" sortable />

          <Column body={actionBodyTemplate} header="Actions" className="px-4 py-1" />
        </DataTable>
      </div>

      <Dialog
        visible={dialogType === 'create'}
        header="Ajouter un point de vente"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4">
          {[
            { name: 'nom', placeholder: 'Nom' },
            { name: 'adresse', placeholder: 'Adresse' },
          ].map(({ name, placeholder }) => (
            <div key={name} className="mb-4">
              <InputText
                type="text"
                placeholder={placeholder}
                value={newPointVente[name as keyof typeof newPointVente]}
                onChange={(e) => setNewPointVente({ ...newPointVente, [name]: e.target.value })}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          <div className="mb-4">
            <Dropdown
              value={newPointVente.region}
              options={regions.map((r) => ({ label: r.nom, value: r._id }))}
              onChange={(e) => setNewPointVente({ ...newPointVente, region: e.value })}
              placeholder="Sélectionner une région"
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button label="Ajouter" className="!bg-green-700 text-white" onClick={handleCreate} severity={undefined}/>
          </div>
        </div>
      </Dialog>

      <Dialog
        visible={dialogType === 'delete'}
        header="Confirmation"
        onHide={() => setDialogType(null)}
        style={{ width: '30vw' }}
        modal
      >
        <div className="p-4">
          <p>Voulez-vous vraiment supprimer ce point de vente ?</p>
          <div className="flex justify-end mt-4 gap-2">
            <Button
              severity={undefined}
              label="Annuler"
              className="p-button-secondary"
              onClick={() => setDialogType(null)}
             
            />
            <Button label="Supprimer" className="bg-red-700 text-white" onClick={handleDelete} severity={undefined}/>
          </div>
        </div>
      </Dialog>
      <Dialog
        visible={dialogType === 'details'}
        header="Détails du point de vente"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4">
          <p>
            <strong>Nom:</strong> {selectedPointVente?.nom}
          </p>
          <p>
            <strong>Adresse:</strong> {selectedPointVente?.adresse}
          </p>
          <p>
            <strong>Région:</strong>{' '}
            {regions.find((r) => r._id === selectedPointVente?.region)?.nom || 'Non défini'}
          </p>
        </div>
      </Dialog>
      <Dialog
        visible={dialogType === 'edit'}
        header="Modifier le point de vente"
        onHide={() => setDialogType(null)}
        style={{ width: '40vw' }}
        modal
      >
        <div className="p-4">
          <div className="mb-2">
            <label htmlFor="nom">nom</label>
            <InputText
              placeholder="Nom"
              value={selectedPointVente?.nom || ''}
              onChange={(e) =>
                setSelectedPointVente({
                  ...selectedPointVente,
                  nom: e.target.value,
                })
              }
              className="w-full p-2 border rounded mb-4"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="adresse">lAdresse</label>
            <InputText
              placeholder="Adresse"
              value={selectedPointVente?.adresse || ''}
              onChange={(e) =>
                setSelectedPointVente({
                  ...selectedPointVente,
                  adresse: e.target.value,
                })
              }
              className="w-full p-2 border rounded mb-4"
            />
          </div>
          <div className="mb-2"></div>

          <Button label="Mettre à jour" className="bg-blue-700 text-white" onClick={handleUpdate} />
        </div>
      </Dialog>
    </div>
  );
}
