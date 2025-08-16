/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import { BreadCrumb } from 'primereact/breadcrumb';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';

import {
  deleteUser,
  fetchUsers,
  fetchUsersByPointVenteId,
  fetchUsersByRegionId,
  updateUser,
} from '@/stores/slices/users/userSlice';

import { registerUser } from '@/stores/slices/auth/authSlice';
import {
  fetchPointVentes,
  selectAllPointVentes,
} from '@/stores/slices/pointvente/pointventeSlice';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';

import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import UserDialog from '@/components/ui/userComponent/UserDialog';

import { downloadExportedFile, exportFile } from '@/stores/slices/document/importDocuments/exportDoc';

import { API_URL } from '@/lib/apiConfig';
import type { User, UserModel } from '@/Models/UserType';
import type { PointVente } from '@/Models/pointVenteType';
import { isPointVente, isRegion } from '@/Models/UserType';

/* --------------------------------- helpers -------------------------------- */
const breadcrumbItems = [{ label: 'Accueil', url: '/' }, { label: 'Gestion des utilisateurs' }];
const home = { icon: 'pi pi-home', url: '/' };

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const normalize = (s: unknown) =>
  (typeof s === 'string' ? s : '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

type MenuMap = Record<string, import('primereact/menu').Menu | null>;

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<import('primereact/toast').Toast | null>(null);

  /* store data */
  const pointsVente = useSelector((s: RootState) => selectAllPointVentes(s));
  const regions = useSelector((s: RootState) => selectAllRegions(s));

  /* user local (rôle / scope) */
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;

  /* ui state */
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingCreateOrUpdate, setLoadingCreateOrUpdate] = useState(false);

  /* création / édition */
  const initialUserState: UserModel = {
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
  };
  const [newUser, setNewUser] = useState<UserModel>(initialUserState);
  const [errors, setErrors] = useState<Partial<Record<keyof UserModel, string>>>({});
  const [previewUrl, setPreviewUrl] = useState<string>('');

  /* Menus par ligne */
  const menuRefs = useRef<MenuMap>({});
  const setMenuRef = useCallback((id: string, el: import('primereact/menu').Menu | null) => {
    if (!id) return;
    menuRefs.current[id] = el;
  }, []);
  const showMenu = useCallback((e: React.MouseEvent, id: string, row: User) => {
    setSelectedUser(row);
    menuRefs.current[id]?.toggle(e);
  }, []);

  /* ------------------------------ chargement data ------------------------------ */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([dispatch(fetchPointVentes()), dispatch(fetchRegions())]);

        let resp: any = null;
        if (user?.role === 'SuperAdmin') {
          resp = await dispatch(fetchUsers()).unwrap();
        } else if (user?.role === 'AdminRegion') {
          resp = await dispatch(fetchUsersByRegionId(user?.region?._id)).unwrap();
        } else {
          resp = await dispatch(fetchUsersByPointVenteId(user?.pointVente?._id)).unwrap();
        }
        if (!active) return;
        setUsers(asArray<User>(resp));
      } catch {
        if (!active) return;
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Échec du chargement des utilisateurs.',
          life: 3000,
        });
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  /* preview image */
  useEffect(() => {
    if (newUser.image instanceof File) {
      const url = URL.createObjectURL(newUser.image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (typeof newUser.image === 'string') {
      setPreviewUrl(newUser.image);
      return;
    }
    setPreviewUrl('');
  }, [newUser.image]);

  /* inject edit data */
  useEffect(() => {
    if (dialogType === 'edit' && selectedUser) {
      setNewUser({
        _id: selectedUser._id,
        nom: selectedUser.nom ?? '',
        prenom: selectedUser.prenom ?? '',
        email: selectedUser.email ?? '',
        telephone: selectedUser.telephone ?? '',
        adresse: selectedUser.adresse ?? '',
        password: '', // jamais pré-remplir
        role: selectedUser.role ?? '',
        region:
          typeof selectedUser.region === 'object' && selectedUser.region
            ? selectedUser.region._id ?? ''
            : (selectedUser.region as any) ?? '',
        pointVente:
          typeof selectedUser.pointVente === 'object' && selectedUser.pointVente
            ? selectedUser.pointVente._id ?? ''
            : (selectedUser.pointVente as any) ?? '',
        image: typeof selectedUser.image === 'string' ? selectedUser.image : null,
      });
    }
  }, [dialogType, selectedUser]);

  /* ------------------------------ recherche / filtre ------------------------------ */
  const [pvFilter, setPvFilter] = useState<PointVente | null>(null);

  const filteredUsers = useMemo(() => {
    const q = normalize(search);

    const base = users.filter((u) => {
      const fields = [
        normalize(u.nom),
        normalize(u.prenom),
        normalize(u.email),
        normalize(u.telephone),
        normalize(
          typeof u?.region === 'object' && u?.region ? u.region.nom : (u?.region as string)
        ),
        normalize(
          typeof u?.pointVente === 'object' && u?.pointVente ? u.pointVente.nom : (u?.pointVente as string)
        ),
        normalize(u.role),
      ];
      return !q || fields.some((f) => f.includes(q));
    });

    if (!pvFilter) return base;
    return base.filter(
      (u) =>
        typeof u?.pointVente === 'object' &&
        u?.pointVente &&
        '_id' in u.pointVente &&
        u.pointVente._id === pvFilter._id
    );
  }, [search, users, pvFilter]);

  /* ------------------------------ actions menu ------------------------------ */
  const handleAction = (action: 'details' | 'edit' | 'delete', row: User) => {
    setSelectedUser(row);
    if (action === 'delete') {
      setDeleteDialogOpen(true);
      return;
    }
    setDialogType(action);
  };

  /* ---------------------------------- CRUD ---------------------------------- */
  const refetchUsers = useCallback(async () => {
    try {
      let resp: any = null;
      if (user?.role === 'SuperAdmin') {
        resp = await dispatch(fetchUsers()).unwrap();
      } else if (user?.role === 'AdminRegion') {
        resp = await dispatch(fetchUsersByRegionId(user?.region?._id)).unwrap();
      } else {
        resp = await dispatch(fetchUsersByPointVenteId(user?.pointVente?._id)).unwrap();
      }
      setUsers(asArray<User>(resp));
    } catch {
      /* noop, géré ailleurs */
    }
  }, [dispatch, user?.role, user?.region?._id, user?.pointVente?._id]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser?._id) return;
    try {
      setLoading(true);
      await dispatch(deleteUser(selectedUser._id)).unwrap();
      toast.current?.show({
        severity: 'success',
        summary: 'Supprimé',
        detail: 'Utilisateur supprimé.',
        life: 2000,
      });
      await refetchUsers();
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la suppression.',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch, selectedUser?._id, refetchUsers]);

  const validateUserPayload = (payload: UserModel, isEdit: boolean) => {
    const errs: Partial<Record<keyof UserModel, string>> = {};
    if (!isNonEmptyString(payload.nom)) errs.nom = 'Requis';
    if (!isNonEmptyString(payload.prenom)) errs.prenom = 'Requis';
    if (!isNonEmptyString(payload.email)) errs.email = 'Requis';
    if (!isEdit && !isNonEmptyString(payload.password)) errs.password = 'Requis';
    return errs;
  };

  const handleCreateOrUpdate = useCallback(async () => {
    const isEditMode = !!newUser?._id;
    const errs = validateUserPayload(newUser, isEditMode);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Veuillez compléter les champs obligatoires.',
        life: 2500,
      });
      return;
    }

    try {
      setLoadingCreateOrUpdate(true);

      if (isEditMode) {
        await dispatch(updateUser(newUser as any)).unwrap();
        toast.current?.show({
          severity: 'success',
          summary: 'Modifié',
          detail: 'Utilisateur mis à jour.',
          life: 2000,
        });
        setDialogType(null);
        await refetchUsers();
      } else {
        const fd = new FormData();
        if (newUser._id) fd.append('_id', String(newUser._id));
        fd.append('nom', newUser.nom);
        fd.append('prenom', newUser.prenom);
        fd.append('telephone', newUser.telephone ?? '');
        fd.append('email', newUser.email);
        fd.append('adresse', newUser.adresse ?? '');
        fd.append('password', newUser.password);
        fd.append('role', newUser.role ?? '');

        if (newUser.region) {
          const regionValue = isRegion(newUser.region as any)
            ? (newUser.region as any)?._id
            : newUser.region;
          if (regionValue) fd.append('region', String(regionValue));
        }
        if (newUser.pointVente) {
          const pvValue = isPointVente(newUser.pointVente as any)
            ? (newUser.pointVente as any)?._id
            : newUser.pointVente;
          if (pvValue) fd.append('pointVente', String(pvValue));
        }
        if (newUser.image instanceof File) {
          fd.append('image', newUser.image);
        }

        await dispatch(registerUser(fd)).unwrap();
        toast.current?.show({
          severity: 'success',
          summary: 'Créé',
          detail: 'Utilisateur ajouté avec succès !',
          life: 2000,
        });
        setDialogType(null);
        setNewUser(initialUserState);
        await refetchUsers();
      }
    } catch (err: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: String(err?.message || "Échec de l'opération"),
        life: 3500,
      });
    } finally {
      setLoadingCreateOrUpdate(false);
    }
  }, [dispatch, newUser, refetchUsers]);

  /* ------------------------------- import/export ------------------------------ */
  const handleFileManagement = useCallback(
    async ({
      type,
      format,
      file,
    }: {
      type: 'import' | 'export';
      format: 'csv' | 'pdf' | 'excel';
      file?: File;
    }) => {
      if (type === 'import' && file) {
        toast.current?.show({
          severity: 'info',
          summary: `Import ${format.toUpperCase()}`,
          detail: `Fichier importé: ${file.name}`,
          life: 3000,
        });
        return;
      }

      if (type === 'export') {
        if (format === 'pdf') {
          toast.current?.show({
            severity: 'warn',
            summary: 'Export PDF non supporté',
            detail: "L'export PDF n'est pas disponible pour ce module.",
            life: 3000,
          });
          return;
        }
        const fileType: 'csv' | 'xlsx' = format === 'excel' ? 'xlsx' : 'csv';
        try {
          const r = await dispatch(
            exportFile({
              url: '/export/users',
              mouvements: filteredUsers,
              fileType,
            }) as any
          );
          if ((exportFile as any).fulfilled.match(r)) {
            const filename = `utilisateurs.${fileType === 'csv' ? 'csv' : 'xlsx'}`;
            downloadExportedFile((r as any).payload, filename);
            toast.current?.show({
              severity: 'success',
              summary: `Export ${format.toUpperCase()}`,
              detail: `Fichier téléchargé: ${filename}`,
              life: 3000,
            });
          } else {
            throw new Error();
          }
        } catch {
          toast.current?.show({
            severity: 'error',
            summary: `Export ${format.toUpperCase()} échoué`,
            detail: 'Une erreur est survenue.',
            life: 3000,
          });
        }
      }
    },
    [dispatch, filteredUsers]
  );

  /* ------------------------------- rendu image ------------------------------- */
  const avatarTemplate = (data: User) => {
    const srcRaw = typeof data?.image === 'string' ? data.image : '';
    const src = isNonEmptyString(srcRaw) ? `${API_URL()}/${srcRaw.replace('../', '')}` : '';
    if (!src) {
      return (
        <div
          className="w-10 h-10 rounded-full border border-gray-300 bg-gray-200 flex items-center justify-center text-gray-600 text-xs"
          title="Aucune image"
        >
          —
        </div>
      );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={`${data?.prenom ?? ''} ${data?.nom ?? ''}`}
        className="w-10 h-10 rounded-full object-cover border border-gray-300"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  };

  /* ------------------------------- handlers UI ------------------------------- */
  const onPageChange = (event: { first?: number; rows?: number }) => {
    setFirst(event.first ?? 0);
    setRows(event.rows ?? 10);
  };
  const handlePointVenteSelect = (pointVente: PointVente | null) => setPvFilter(pointVente);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />

      <div className="flex items-center justify-between mt-5 mb-5">
        <BreadCrumb model={breadcrumbItems} home={home} className="bg-none" />
        <h2 className="text-2xl font-bold text-gray-700">Gestion des utilisateurs</h2>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="gap-4 mb-4 flex justify-between flex-wrap md:flex-nowrap">
          <div className="relative w-full md:w-4/5 flex flex-row gap-2 flex-wrap">
            <InputText
              className="p-2 pl-10 border rounded w-full md:w-1/3"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => {
                setFirst(0);
                setSearch(e.target.value ?? '');
              }}
            />
            <DropdownPointVenteFilter onSelect={(pv) => { setFirst(0); handlePointVenteSelect(pv); }} />
          </div>

          <div className="w-full md:w-1/5 flex justify-end items-center gap-2">
            <DropdownImportExport onAction={handleFileManagement} />
            {!(user?.role === 'Logisticien' || user?.role === 'Vendeur') && (
              <Button
                icon="pi pi-plus"
                label="Nouveau"
                className="!bg-green-700 text-white p-2 rounded"
                onClick={() => {
                  setNewUser(initialUserState);
                  setDialogType('create');
                }}
              />
            )}
          </div>
        </div>

        <DataTable
          value={filteredUsers}
          dataKey="_id"
          paginator
          loading={loading}
          rows={rows}
          first={first}
          onPage={onPageChange}
          size="small"
          scrollable
          responsiveLayout="scroll"
          stripedRows
          showGridlines
          className="rounded-lg text-sm"
          tableStyle={{ minWidth: '70rem' }}
          //@ts-ignore
          rowClassName={(_, opt) => (opt?.rowIndex % 2 === 0 ? '!bg-gray-100 !text-gray-900' : '!bg-green-50 !text-gray-900')}
          emptyMessage="Aucun utilisateur trouvé."
        >
          <Column
            header="#"
            body={(_, options) => (Number.isFinite(options?.rowIndex) ? first + (options!.rowIndex as number) + 1 : '-')}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header=""
            body={avatarTemplate}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column field="nom" header="Nom" sortable className="px-4 py-1 text-sm" headerClassName="text-sm !bg-green-800 !text-white" />
          <Column field="prenom" header="Prénom" sortable className="px-4 py-1 text-sm" headerClassName="text-sm !bg-green-800 !text-white" />
          <Column field="email" header="Email" sortable className="px-4 py-1 text-sm" headerClassName="text-sm !bg-green-800 !text-white" />
          <Column field="telephone" header="Téléphone" className="px-4 py-1 text-sm" headerClassName="text-sm !bg-green-800 !text-white" />
          <Column
            header="Région"
            body={(rowData: User) => {
              const r =
                typeof rowData?.region === 'object' && rowData?.region
                  ? rowData.region.nom
                  : (rowData as any)?.pointVente?.region?.nom || 'Depot Central';
              return <span>{r}</span>;
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column
            header="Point de vente"
            body={(rowData: User) => {
              const pv =
                typeof rowData?.pointVente === 'object' && rowData?.pointVente
                  ? rowData.pointVente.nom
                  : 'Depot Central';
              return <span>{pv}</span>;
            }}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
          <Column field="role" header="Rôle" className="px-4 py-1 text-sm" headerClassName="text-sm !bg-green-800 !text-white" />

          <Column
            header="Actions"
            body={(row: User) => (
              <>
                <Button
                  icon="pi pi-bars"
                  className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                  onClick={(e) => showMenu(e, row?._id ?? '', row)}
                  disabled={!isNonEmptyString(row?._id)}
                  aria-haspopup
                />
                <Menu
                  popup
                  ref={(el) => setMenuRef(row?._id ?? '', el)}
                  model={[
                    { label: 'Détails', icon: 'pi pi-eye', command: () => handleAction('details', row) },
                    { label: 'Modifier', icon: 'pi pi-pencil', command: () => handleAction('edit', row) },
                    { label: 'Supprimer', icon: 'pi pi-trash', command: () => handleAction('delete', row) },
                  ]}
                />
              </>
            )}
            className="px-4 py-1 text-sm"
            headerClassName="text-sm !bg-green-800 !text-white"
          />
        </DataTable>
      </div>

      {/* Dialog de création/édition */}
      <UserDialog
        dialogType={dialogType as any}
        setDialogType={setDialogType as any}
        newUser={newUser as any}
        setNewUser={setNewUser as any}
        errors={errors}
        showRegionField
        showPointVenteField
        UserRoleModel={['Admin', 'Manager', 'Vendeur']}
        //@ts-ignore
        regions={regions}
        pointsVente={pointsVente}
        previewUrl={previewUrl}
        handleCreateOrUpdate={handleCreateOrUpdate}
        loadingCreateOrUpdate={loadingCreateOrUpdate}
      />

      {/* Dialog suppression */}
      <ConfirmDeleteDialog
        visible={deleteDialogOpen}
        onHide={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          handleDeleteUser();
          setDeleteDialogOpen(false);
        }}
        item={selectedUser ?? { _id: '', nom: '' }}
        objectLabel="l'utilisateur"
        displayField="nom"
      />
    </div>
  );
};

export default Page;
