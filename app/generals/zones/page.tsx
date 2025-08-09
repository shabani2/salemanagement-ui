/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  updateRegion,
  deleteRegion,
  fetchRegions,
  selectAllRegions,
} from '@/stores/slices/regions/regionSlice';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
//import { saveAs } from 'file-saver';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';
import { Toast } from 'primereact/toast';

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

  // const [loading, setLoading] = useState(false);
  // const [rows, setRows] = useState(10);
  // const [rowIndexes, setRowIndexes] = useState<{ [key: string]: number }>({});
  const [first, setFirst] = useState(0);
  // const onPageChange = (event: { first: SetStateAction<number>; rows: SetStateAction<number> }) => {
  //   setFirst(event.first);
  //   setRows(event.rows);
  // };
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
    dispatch(fetchRegions()); // Re-fetch regions after adding a new one
    setNewRegion(initialRegion);
  };

  const handleUpdate = async () => {
    if (!selectedRegion) return;

    try {
      // Si tu veux gérer la promesse et capturer erreurs / retours
      const result = await dispatch(updateRegion(selectedRegion)).unwrap();
      console.log('Mise à jour réussie :', result);
      dispatch(fetchRegions()); // Re-fetch regions after updating
    } catch (err) {
      console.error('Erreur lors de la mise à jour :', err);
    }

    setDialogType(null);
  };

  const [importedFiles, setImportedFiles] = useState<{ name: string; format: string }[]>([]);
  const handleDelete = () => {
    if (selectedRegion) {
      dispatch(deleteRegion(selectedRegion._id));
      setDialogType(null);
    }
  };

  const actionBodyTemplate = (rowData: any) => {
    const menuRef = useRef<any>(null);
    // console.log('regions : ',zones)
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
          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
          onClick={(event) => menuRef.current.toggle(event)}
          aria-haspopup
        />
      </div>
    );
  };

  // gestion de la recherche

  const [filteredRegions, setFilteredRegions] = useState(regions || []);

  useEffect(() => {
    const filtered = (regions ?? []).filter((region) => {
      const query = search.toLowerCase();
      return (
        region.nom?.toLowerCase().includes(query) ||
        region.ville?.toLowerCase().includes(query) ||
        String(region.pointVenteCount).includes(query)
      );
    });
    setFilteredRegions(filtered);
  }, [search, regions]);

  //file management
  const toast = useRef<Toast>(null);

  const handleFileManagement = async ({
    type,
    format,
    file,
  }: {
    type: 'import' | 'export';
    format: 'csv' | 'pdf' | 'excel';
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
      // Only allow "csv" or "xlsx" as fileType
      if (format === 'pdf') {
        toast.current?.show({
          severity: 'warn',
          summary: 'Export PDF non supporté',
          detail: "L'export PDF n'est pas disponible pour ce module.",
          life: 3000,
        });
        return;
      }
      // Map "excel" to "xlsx" for backend compatibility
      const exportFileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : format;
      const result = await dispatch(
        exportFile({
          url: '/export/regions',
          mouvements: regions,
          fileType: exportFileType,
        })
      );

      if (exportFile.fulfilled.match(result)) {
        const filename = `regions.${format === 'csv' ? 'csv' : 'xlsx'}`;
        downloadExportedFile(result.payload, filename);

        toast.current?.show({
          severity: 'success',
          summary: `Export ${format.toUpperCase()}`,
          detail: `File downloaded: ${filename}`,
          life: 3000,
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: `Export ${format.toUpperCase()} Échoué`,
          detail: String(result.payload || 'Une erreur est survenue.'),
          life: 3000,
        });
      }
    }
  };
  return (
    <div className="  min-h-screen ">
      <div className="flex items-center justify-between mb-3 mt-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Gestion des régions' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold  text-gray-5000">Gestion des Régions</h2>
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
              <DropdownImportExport onAction={handleFileManagement} />
            </div>
          </div>

          <Button
            icon="pi pi-plus"
            label="nouvau"
            className="!bg-green-700 text-white p-2 rounded border-none"
            onClick={() => setDialogType('create')}
          />
        </div>
        <div className=" rounded-lg shadow-md">
          <DataTable
            value={Array.isArray(filteredRegions[0]) ? filteredRegions.flat() : filteredRegions}
            paginator
            rows={5}
            size="small"
            className="rounded-lg text-[11px]"
            tableStyle={{ minWidth: '50rem' }}
            rowClassName={(rowData, options) => {
              //@ts-ignore
              const index = options?.index ?? 0;
              const globalIndex = first + index;
              return globalIndex % 2 === 0
                ? '!bg-gray-300 !text-gray-900'
                : '!bg-green-900 !text-white';
            }}
          >
            <Column
              field="_id"
              header="#"
              body={(_, options) => <span className="text-[11px]">{options.rowIndex + 1}</span>}
              // className="px-4  text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column
              field="nom"
              header="Nom"
              sortable
              // className="px-4  text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column
              field="pointVenteCount"
              header="Points de vente"
              // className="px-4 !text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column
              field="ville"
              header="Ville"
              sortable
              // className="px-4 !text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
            <Column
              body={actionBodyTemplate}
              header="Actions"
              // className="px-4  !text-[11px]"
              headerClassName="!text-[11px] !bg-green-900 !text-white"
            />
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
            <Button
              label="Modifier"
              className="!bg-green-700 text-white"
              onClick={handleUpdate}
              severity={undefined}
            />
          </div>
        </div>
      </Dialog>
      <ConfirmDeleteDialog
        visible={!!deleteDialogType}
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
            <Button
              label="Ajouter"
              className="!bg-green-700 text-white"
              onClick={handleCreate}
              severity={undefined}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
