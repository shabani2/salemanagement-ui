/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, SetStateAction, useRef, useMemo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
//import { Dropdown } from 'primereact/dropdown';
//import { Dialog } from 'primereact/dialog';
import { BreadCrumb } from 'primereact/breadcrumb';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';
import {
  deleteUser,
  fetchUsers,
  fetchUsersByPointVenteId,
  updateUser,
  fetchUsersByRegionId,
} from '@/stores/slices/users/userSlice';
import { isPointVente, isRegion, User, UserModel } from '@/Models/UserType';
import { Menu } from 'primereact/menu';
//import { UserRoleModel } from '@/lib/utils';
//import { FileUpload } from 'primereact/fileupload';
//import { Menu } from 'lucide-react';
import { Toast } from 'primereact/toast';
import { registerUser } from '@/stores/slices/auth/authSlice';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import UserDialog from '@/components/ui/userComponent/UserDialog';
import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
//import { saveAs } from 'file-saver';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import { PointVente } from '@/Models/pointVenteType';
import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

const breadcrumbItems = [{ label: 'SuperAdmin' }, { label: 'Users' }];

const Page = () => {
  const [setImportedFiles] = useState<{ name: string; format: string }[]>([]);
  const [loadingCreateOrUpdate] = useState(false);
  const toastRef = useRef<Toast>(null);
  const [users, setUsers] = useState<User[] | null[]>([]); //useSelector((state: RootState) => selectAllUsers(state));
  const [loading, setLoading] = useState(false);
  const [setLoadingCreate] = useState(false);
  const pointsVente = useSelector((state: RootState) => selectAllPointVentes(state));
  const regions = useSelector((state: RootState) => selectAllRegions(state));
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [deleteDialogType, setDeleteDialogType] = useState<boolean | null>(null);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [newUser, setNewUser] = useState<UserModel>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    password: '',
    role: '',
    region: '',
    pointVente: '',
    image: null,
  });
  const initialUserState = {
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    password: '',
    role: '',
    region: '',
    pointVente: '',
    image: null as File | null, // Permet de stocker un fichier
  };

  const [errors, setErrors] = useState<{ [key in keyof UserModel]?: string }>({});
  const [rowIndexes] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    console.log('Row Index Map Updated:', rowIndexes);
  }, [rowIndexes]);
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  const dispatch = useDispatch<AppDispatch>();

  const onPageChange = (event: { first: SetStateAction<number>; rows: SetStateAction<number> }) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const handleAction = (action: string, user: any) => {
    setSelectedUser(user);

    if (action == 'delete') {
      setDeleteDialogType(true);
    } else {
      setDialogType(action);
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
          severity={undefined}
          icon="pi pi-bars"
          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
          onClick={(event) => menuRef.current.toggle(event)}
          aria-haspopup
        />
      </div>
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await dispatch(deleteUser(selectedUser?._id)).then(async () => {
        await dispatch(fetchUsers()).then((resp) => {
          setUsers(resp.payload);
        });
      });
      dispatch(fetchUsers());
      setDialogType(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur", error);
    }
    setLoading(false);
  };

  const home = { icon: 'pi pi-home', url: '/' };

  const handleCreateOrUpdate = async () => {
    const isEditMode = !!newUser?._id;

    if (
      !newUser?.nom ||
      !newUser?.prenom ||
      !newUser?.email ||
      (!isEditMode && !newUser?.password)
    ) {
      setErrors({
        ...errors,
        // @ts-ignore
        global: 'Veuillez remplir tous les champs requis.',
      });
      return;
    }

    if (isEditMode) {
      setLoading(true);
      try {
        // @ts-ignore
        dispatch(updateUser(newUser)).then(() => {
          dispatch(fetchUsers()).then((resp) => {
            toastRef.current?.show({
              severity: 'success',
              summary: 'Succès',
              detail: 'Utilisateur ajouté avec succès !',
              life: 3000,
            });
            setUsers(resp.payload);
          });
        });
        setDialogType(null);
      } catch (error) {
        console.error("Erreur lors de la suppression de l'utilisateur", error);
      }
      setLoading(false);
    } else {
      try {
        //@ts-ignore
        setLoadingCreate(true);

        const formData = new FormData();
        if (newUser?._id) {
          formData.append('_id', newUser?._id.toString());
        }
        formData.append('nom', newUser.nom);
        formData.append('prenom', newUser.prenom);
        formData.append('telephone', newUser.telephone);
        formData.append('email', newUser.email);
        formData.append('adresse', newUser.adresse);
        formData.append('password', newUser.password);
        formData.append('role', newUser?.role);

        if (newUser?.region) {
          const regionValue = isRegion(newUser?.region) ? newUser?.region?._id : newUser?.region;
          formData.append('region', regionValue ? String(regionValue) : '');
        }

        if (newUser?.pointVente) {
          formData.append(
            'pointVente',
            isPointVente(newUser?.pointVente) ? newUser?.pointVente?._id : newUser?.pointVente
          );
        }

        if (newUser.image instanceof File) {
          formData.append('image', newUser.image);
        }

        await dispatch(registerUser(formData)).then(async (response) => {
          await dispatch(fetchUsers()).then((resp) => {
            toastRef.current?.show({
              severity: 'success',
              summary: 'Succès',
              detail: 'Utilisateur ajouté avec succès !',
              life: 3000,
            });
            setUsers(resp.payload);
          });
          console.log('user created : ', response.payload);
        });

        setDialogType(null);
        setNewUser(initialUserState);
      } catch (error) {
        console.error("Erreur lors de la création de l'utilisateur :", error);
        if (error instanceof Error) {
          toastRef.current?.show({
            severity: 'error',
            summary: 'Erreur',
            detail: error.message || "Échec de l'inscription",
            life: 1000,
          });
        }
        setDialogType(null);
        setNewUser(initialUserState);
      } finally {
        //@ts-ignore
        setLoadingCreate(false);
        setNewUser(initialUserState);
      }
    }
  };

  useEffect(() => {
    dispatch(fetchPointVentes());
    dispatch(fetchRegions());
  }, [dispatch]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (newUser.image instanceof File) {
      const url = URL.createObjectURL(newUser.image);
      setPreviewUrl(url);

      return () => URL.revokeObjectURL(url); // libère l'URL temporaire
    } else if (typeof newUser.image === 'string') {
      setPreviewUrl(newUser.image); // mode edit : image déjà hébergée
    } else {
      setPreviewUrl(''); // aucun fichier ou URL
    }
  }, [newUser.image]);

  useEffect(() => {
    if (dialogType === 'edit' && selectedUser) {
      setNewUser(selectedUser);
    }
  }, [dialogType, selectedUser]);

  useEffect(() => {
    if (user?.role === 'SuperAdmin') {
      dispatch(fetchUsers()).then((resp) => {
        console.log('users  : ', resp.payload);
        setUsers(resp.payload);
      });
    } else if (user?.role === 'AdminRegion') {
      dispatch(fetchUsersByRegionId(user?.region?._id)).then((resp) => {
        console.log('users de la region => : ', resp.payload);
        setUsers(resp.payload);
      });
    } else {
      dispatch(fetchUsersByPointVenteId(user?.pointVente?._id)).then((resp) => {
        console.log('users by point vente : ', resp.payload);
        setUsers(resp.payload);
      });
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);
  // console.log('users : ',users)
  //traitement de la recherche

  const filteredUsers = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    return (Array.isArray(users) ? users.filter((user): user is User => user !== null) : []).filter(
      (u) => {
        const nom = u.nom?.toLowerCase() || '';
        const prenom = u.prenom?.toLowerCase() || '';
        const email = u.email?.toLowerCase() || '';
        const tel = u.telephone?.toLowerCase() || '';

        const pv =
          typeof u?.pointVente === 'object' && u?.pointVente !== null && 'nom' in u?.pointVente
            ? u?.pointVente.nom?.toLowerCase() || ''
            : typeof u?.pointVente === 'string'
              ? u?.pointVente.toLowerCase()
              : 'depot central';

        const region =
          typeof u?.region === 'object' && u?.region !== null && 'nom' in u?.region
            ? u?.region.nom?.toLowerCase() || ''
            : typeof u?.region === 'string'
              ? u?.region.toLowerCase()
              : '';

        const role = u?.role?.toLowerCase() || '';

        return [nom, prenom, email, tel, region, pv, role].some((field) =>
          field.includes(lowerSearch)
        );
      }
    );
  }, [search, users]);

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
      //@ts-ignore
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
          url: '/export/users',
          mouvements: users,
          fileType: exportFileType,
        })
      );

      if (exportFile.fulfilled.match(result)) {
        const filename = `utilisateurs.${format === 'csv' ? 'csv' : 'xlsx'}`;
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
  console.log('users  : ', filteredUsers);
  //zone pour filtrer par point de vente
  const [setFilteredByPV] = useState<User[]>([]);

  const handlePointVenteSelect = (pointVente: PointVente | null) => {
    if (!pointVente) {
      // Réinitialiser avec tous les utilisateurs filtrés par la recherche
      //@ts-ignore
      setFilteredByPV(filteredUsers);
      return;
    }

    const filtered = filteredUsers.filter(
      (u) =>
        typeof u?.pointVente === 'object' &&
        u?.pointVente !== null &&
        '_id' in u?.pointVente &&
        u?.pointVente?._id === pointVente?._id
    );
    //@ts-ignore
    setFilteredByPV(filtered);
  };

  return (
    <div className="  h-screen-min">
      <div className="flex items-center justify-between mt-3 mb-3">
        <BreadCrumb model={breadcrumbItems} home={home} className="bg-none" />
        <h2 className="text-2xl font-bold  text-gray-5000">Gestion des utilisateurs</h2>
      </div>
      <div className="bg-white p-2 rounded-lg">
        <div className="flex justify-between my-4">
          <div className="relative w-2/3 flex justify-between gap-2">
            <InputText
              className="p-2 pl-10 border rounded w-full"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <DropdownPointVenteFilter onSelect={handlePointVenteSelect} />
            <DropdownImportExport onAction={handleFileManagement} />

            {/* <i className="pi pi-search absolute -3 top-1/2 transform -translate-y-1/2 text-gray-400"></i> */}
          </div>
          {!(user?.role === 'Logisticien' || user?.role === 'Vendeur') && (
            <Button
              severity={undefined}
              icon="pi pi-plus"
              label="nouveau"
              className="!bg-green-700 text-white p-2 rounded"
              onClick={() => setDialogType('create')}
            />
          )}
        </div>
        <div className=" p-1 rounded-lg shadow-md ">
          <DataTable
            value={filteredUsers}
            dataKey="_id"
            paginator
            loading={loading}
            rows={rows}
            first={first}
            size="small"
            onPage={onPageChange}
            className="rounded-lg custom-datatable text-[11px]"
            tableStyle={{ minWidth: '50rem' }}
            rowClassName={(rowData, options) => {
              //@ts-ignore
              const index = options?.rowIndex ?? 0;
              const globalIndex = first + index;
              return globalIndex % 2 === 0
                ? '!bg-gray-300 !text-gray-900'
                : '!bg-green-900 !text-white';
            }}
          >
            <Column
              field="_id"
              header="#"
              body={(_data, options) => <span className="text-[11px]">{options.rowIndex + 1}</span>}
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              header=""
              body={(data) => (
                <img
                  src={`http://localhost:8000/${data.image.replace('../', '')}`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-gray-300"
                />
              )}
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="nom"
              header="Nom"
              sortable
              filter
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="prenom"
              header="Prénom"
              sortable
              filter
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="email"
              header="Email"
              sortable
              filter
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="telephone"
              header="Téléphone"
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="region.nom"
              header="Region"
              filter
              body={(rowData) => (
                <span className="text-[11px]">
                  {rowData?.region?.nom || rowData?.pointVente?.region.nom || 'Depot Central'}
                </span>
              )}
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="pointVente.nom"
              header="point vente"
              filter
              body={(rowData) => (
                <span className="text-[11px]">{rowData?.pointVente?.nom || 'Depot Central'}</span>
              )}
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              field="role"
              header="Rôle"
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />

            <Column
              body={actionBodyTemplate}
              header="Actions"
              className="px-4 py-1 text-[11px]"
              headerClassName="text-[11px] !bg-green-900 !text-white"
            />
          </DataTable>
        </div>
      </div>

      <UserDialog
        // @ts-ignore
        dialogType={dialogType}
        setDialogType={setDialogType}
        //@ts-ignore
        newUser={newUser}
        //@ts-ignore
        setNewUser={setNewUser}
        errors={errors}
        showRegionField={true}
        showPointVenteField={true}
        // @ts-ignore
        UserRoleModel={['Admin', 'Manager', 'Vendeur']} // ou depuis un model
        //@ts-ignore
        regions={regions}
        pointsVente={pointsVente}
        previewUrl={previewUrl}
        handleCreateOrUpdate={handleCreateOrUpdate}
        loadingCreateOrUpdate={loadingCreateOrUpdate}
      />
      {/* dialog of deletion */}

      <ConfirmDeleteDialog
        // @ts-ignore
        visible={deleteDialogType}
        onHide={() => setDeleteDialogType(false)}
        onConfirm={() => {
          handleDeleteUser();
          setDeleteDialogType(false);
        }}
        item={selectedUser}
        objectLabel="l'utilisateur "
        displayField="nom"
      />

      <Toast ref={toastRef} />
    </div>
  );
};

export default Page;
