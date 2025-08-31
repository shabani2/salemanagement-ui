/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/stores/store';

import { BreadCrumb } from 'primereact/breadcrumb';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';

import {
  deleteUser as deleteUserThunk,
  fetchUsers,
  fetchUsersByPointVenteId,
  fetchUsersByRegionId,
  updateUser as updateUserThunk,
  selectAllUsers,
  selectUserMeta,
  selectUserStatus,
} from '@/stores/slices/users/userSlice';

import { registerUser } from '@/stores/slices/auth/authSlice';
import { fetchPointVentes, selectAllPointVentes } from '@/stores/slices/pointvente/pointventeSlice';
import { fetchRegions, selectAllRegions } from '@/stores/slices/regions/regionSlice';

import DropdownImportExport from '@/components/ui/FileManagement/DropdownImportExport';
import DropdownPointVenteFilter from '@/components/ui/dropdowns/DropdownPointventeFilter';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import UserDialog from '@/components/ui/userComponent/UserDialog';

import {
  downloadExportedFile,
  exportFile,
} from '@/stores/slices/document/importDocuments/exportDoc';

import { API_URL } from '@/lib/apiConfig';
import type { User, UserModel } from '@/Models/UserType';
import type { PointVente } from '@/Models/pointVenteType';
import { isPointVente, isRegion } from '@/Models/UserType';

/* --------------------------------- helpers -------------------------------- */
const breadcrumbItems = [{ label: 'Accueil', url: '/' }, { label: 'Gestion des utilisateurs' }];
const home = { icon: 'pi pi-home', url: '/' };

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const SortIcon: React.FC<{ order: 'asc' | 'desc' | null }> = ({ order }) => (
  <span className="inline-block align-middle ml-1">
    {order === 'asc' ? '▲' : order === 'desc' ? '▼' : '↕'}
  </span>
);

const Page: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<import('primereact/toast').Toast | null>(null);

  /* store data */
  const pointsVente = useSelector((s: RootState) => asArray(selectAllPointVentes(s)));
  const regions = useSelector((s: RootState) => asArray(selectAllRegions(s)));
  const users = useSelector((s: RootState) => asArray<User>(selectAllUsers(s)));
  const meta = useSelector(selectUserMeta);
  const status = useSelector(selectUserStatus);
  const loading = status === 'loading';

  /* user local (rôle / scope) */
  const user =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user-agricap') || '{}') : null;
  const isAdminRegion = user?.role === 'AdminRegion' && user?.region?._id;
  const isAdminPV = user?.role === 'AdminPointVente' && user?.pointVente?._id;
  const forcedRegionId: string | null = isAdminRegion ? user?.region?._id : null;
  const forcedPVId: string | null = isAdminPV ? user?.pointVente?._id : null;

  /* ui state */
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<'create' | 'edit' | 'details' | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // params serveur (1-based)
  const [rows, setRows] = useState(10);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<
    'nom' | 'prenom' | 'email' | 'telephone' | 'region' | 'pointVente' | 'role' | 'createdAt'
  >('createdAt');
  const [pvFilterId, setPvFilterId] = useState<string>(forcedPVId ?? '');

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

  /* --------- Menu contextuel global (corrige le bug de sélection) --------- */
  const menuRef = useRef<Menu>(null);
  const selectedRowDataRef = useRef<User | null>(null);
  const handleAction = useCallback((action: 'details' | 'edit' | 'delete', row: User) => {
    setSelectedUser(row ?? null);
    if (action === 'delete') {
      setDeleteDialogOpen(true);
      setDialogType(null);
    } else {
      setDialogType(action);
    }
  }, []);
  const menuModel = useMemo(
    () => [
      {
        label: 'Détails',
        command: () =>
          selectedRowDataRef.current && handleAction('details', selectedRowDataRef.current),
      },
      {
        label: 'Modifier',
        command: () =>
          selectedRowDataRef.current && handleAction('edit', selectedRowDataRef.current),
      },
      {
        label: 'Supprimer',
        command: () =>
          selectedRowDataRef.current && handleAction('delete', selectedRowDataRef.current),
      },
    ],
    [handleAction]
  );

  /* ------------------------------ chargement data ------------------------------ */
  useEffect(() => {
    dispatch(fetchPointVentes());
    dispatch(fetchRegions());
  }, [dispatch]);

  // Si AdminPV, impose le filtre PV
  useEffect(() => {
    if (forcedPVId) setPvFilterId(forcedPVId);
  }, [forcedPVId]);

  // mapping champ tri -> backend
  const mapSortByToServer = (f: typeof sortBy) => {
    if (f === 'region') return 'region.nom';
    if (f === 'pointVente') return 'pointVente.nom';
    return f;
  };

  const fetchAtPage = useCallback(
    (targetPage: number) => {
      const common = {
        page: targetPage,
        limit: rows,
        q: search || undefined,
        sortBy: mapSortByToServer(sortBy),
        order,
        includeTotal: true,
      } as const;

      if (user?.role === 'SuperAdmin') {
        // filtre PV optionnel
        dispatch(
          fetchUsers({
            ...common,
            pointVente: pvFilterId || undefined,
          }) as any
        );
      } else if (isAdminRegion && forcedRegionId) {
        // on peut aussi filtrer par PV en plus
        dispatch(
          fetchUsersByRegionId({
            regionId: forcedRegionId,
            ...common,
            // @ts-ignore - l’endpoint côté controller accepte d’autres query
            pointVente: pvFilterId || undefined,
          }) as any
        );
      } else if (isAdminPV && forcedPVId) {
        dispatch(
          fetchUsersByPointVenteId({
            pointVenteId: forcedPVId,
            ...common,
          }) as any
        );
      } else {
        // fallback: scope PV si pvFilterId choisi
        dispatch(
          fetchUsers({
            ...common,
            pointVente: pvFilterId || undefined,
          }) as any
        );
      }
    },
    [
      dispatch,
      rows,
      search,
      sortBy,
      order,
      user?.role,
      isAdminRegion,
      isAdminPV,
      forcedRegionId,
      forcedPVId,
      pvFilterId,
    ]
  );

  const fetchServer = useCallback(() => {
    fetchAtPage(page);
  }, [fetchAtPage, page]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

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
        password: '',
        role: selectedUser.role ?? '',
        region:
          typeof selectedUser.region === 'object' && selectedUser.region
            ? (selectedUser.region._id ?? '')
            : ((selectedUser.region as any) ?? ''),
        pointVente:
          typeof selectedUser.pointVente === 'object' && selectedUser.pointVente
            ? (selectedUser.pointVente._id ?? '')
            : ((selectedUser.pointVente as any) ?? ''),
        image: typeof selectedUser.image === 'string' ? selectedUser.image : null,
      });
    }
  }, [dialogType, selectedUser]);

  /* ------------------------------ filtre PV ------------------------------ */
  const handlePointVenteSelect = (pointVente: PointVente | null) => {
    const id = pointVente?._id ?? '';
    setPvFilterId(id);
  };

  /* ------------------------------ tri (serveur) ------------------------------ */
  const toggleSort = (field: typeof sortBy) => {
    if (sortBy !== field) {
      setSortBy(field);
      setOrder('asc');
      setPage(1);
      fetchAtPage(1);
    } else {
      const next = order === 'asc' ? 'desc' : 'asc';
      setOrder(next);
      setPage(1);
      fetchAtPage(1);
    }
  };

  /* ------------------------------ pagination (serveur) ------------------------------ */
  const total = meta?.total ?? users.length;
  const totalPages = Math.max(1, Math.ceil(total / rows));
  const firstIndex = (page - 1) * rows;

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) {
      setPage(next);
      fetchAtPage(next);
    }
  };

  const onChangeRows = (n: number) => {
    const newRows = Number(n);
    setRows(newRows);
    const newTotalPages = Math.max(1, Math.ceil(total / newRows));
    const fixedPage = Math.min(page, newTotalPages);
    setPage(fixedPage);
    fetchAtPage(fixedPage);
  };

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
              mouvements: users, // exporte la page affichée
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
    [dispatch, users]
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

  /* ---------------------------------- CRUD ---------------------------------- */
  const refetchCurrent = useCallback(() => {
    fetchAtPage(page);
  }, [fetchAtPage, page]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser?._id) return;
    try {
      await dispatch(deleteUserThunk(selectedUser._id) as any);
      toast.current?.show({
        severity: 'success',
        summary: 'Supprimé',
        detail: 'Utilisateur supprimé.',
        life: 2000,
      });
      // reculer si la page devient vide
      const totalBefore = meta?.total ?? users.length;
      const countAfter = Math.max(0, totalBefore - 1);
      const lastPage = Math.max(1, Math.ceil(countAfter / rows));
      const nextPage = Math.min(page, lastPage);
      setPage(nextPage);
      fetchAtPage(nextPage);
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Échec de la suppression.',
        life: 3000,
      });
    }
  }, [dispatch, selectedUser?._id, meta?.total, users.length, rows, page, fetchAtPage]);

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

      // Toujours FormData (image possible)
      const fd = new FormData();

      if (isEditMode && newUser._id) {
        fd.append('_id', String(newUser._id));
      }

      fd.append('nom', newUser.nom);
      fd.append('prenom', newUser.prenom);
      fd.append('telephone', newUser.telephone ?? '');
      fd.append('email', newUser.email);
      fd.append('adresse', newUser.adresse ?? '');

      if (!isEditMode || newUser.password) {
        fd.append('password', newUser.password);
      }

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

      if (isEditMode) {
        await dispatch(updateUserThunk(fd) as any);
        toast.current?.show({
          severity: 'success',
          summary: 'Modifié',
          detail: 'Utilisateur mis à jour.',
          life: 2000,
        });
      } else {
        await dispatch(registerUser(fd) as any);
        toast.current?.show({
          severity: 'success',
          summary: 'Créé',
          detail: 'Utilisateur ajouté avec succès !',
          life: 2000,
        });
        setNewUser(initialUserState);
      }

      setDialogType(null);
      refetchCurrent();
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
  }, [dispatch, newUser, refetchCurrent]);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="min-h-screen">
      <Toast ref={toast} />
      {/* Menu global */}
      <Menu model={menuModel} popup ref={menuRef} />

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
              onChange={(e) => setSearch(e.target.value ?? '')}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (() => {
                  setPage(1);
                  fetchAtPage(1);
                })()
              }
            />
            {/* Filtre PV masqué si AdminPV (car imposé) */}
            {!isAdminPV && (
              <DropdownPointVenteFilter
                onSelect={(pv) => {
                  setPage(1);
                  handlePointVenteSelect(pv);
                  fetchAtPage(1);
                }}
              />
            )}
            <Button
              label="Filtrer"
              icon="pi pi-search"
              className="!bg-green-700 text-white"
              onClick={() => {
                setPage(1);
                fetchAtPage(1);
              }}
            />
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

        {/* ----------- TABLE TAILWIND ----------- */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[70rem] w-full text-sm">
            <thead>
              <tr className="bg-green-800 text-white">
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left"> </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('nom')}
                >
                  Nom <SortIcon order={sortBy === 'nom' ? order : null} />
                </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('prenom')}
                >
                  Prénom <SortIcon order={sortBy === 'prenom' ? order : null} />
                </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('email')}
                >
                  Email <SortIcon order={sortBy === 'email' ? order : null} />
                </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('telephone')}
                >
                  Téléphone <SortIcon order={sortBy === 'telephone' ? order : null} />
                </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('region')}
                >
                  stock <SortIcon order={sortBy === 'region' ? order : null} />
                </th>

                

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('role')}
                >
                  Rôle <SortIcon order={sortBy === 'role' ? order : null} />
                </th>

                <th
                  className="px-4 py-2 text-left cursor-pointer select-none"
                  onClick={() => toggleSort('createdAt')}
                >
                  Créé le <SortIcon order={sortBy === 'createdAt' ? order : null} />
                </th>

                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={11}>
                    Chargement...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={11}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                users.map((row, idx) => {
                  const idxGlobal = firstIndex + idx + 1;
                  const regionNom =
                    typeof row?.region === 'object' && row?.region
                      ? ((row.region as any)?.nom ?? '—')
                      : (row as any)?.pointVente?.region?.nom || 'Depot Central';
                  const pvNom =
                    typeof row?.pointVente === 'object' && row?.pointVente
                      ? ((row.pointVente as any)?.nom ?? '—')
                      : 'Depot Central';
                  const created = (row as any)?.createdAt
                    ? new Date((row as any).createdAt).toLocaleDateString()
                    : '—';

                  return (
                    <tr
                      key={row?._id ?? idx}
                      className={(idx % 2 === 0 ? 'bg-gray-100' : 'bg-green-50') + ' text-gray-900'}
                    >
                      <td className="px-4 py-2">{idxGlobal}</td>
                      <td className="px-4 py-2">{avatarTemplate(row)}</td>
                      <td className="px-4 py-2">{row?.nom ?? '—'}</td>
                      <td className="px-4 py-2">{row?.prenom ?? '—'}</td>
                      <td className="px-4 py-2">{row?.email ?? '—'}</td>
                      <td className="px-4 py-2">{row?.telephone ?? '—'}</td>
                     <td className="px-4 py-2">
  {typeof row?.pointVente === "object" && row?.pointVente
    ? row.pointVente.nom
    : typeof row?.region === "object" && row?.region
    ? row.region.nom
    : "Depot Central"}
</td>

                      {/* <td className="px-4 py-2">{pvNom}</td> */}
                      <td className="px-4 py-2">{row?.role ?? '—'}</td>
                      <td className="px-4 py-2">{created}</td>
                      <td className="px-4 py-2">
                        <Button
                          icon="pi pi-bars"
                          className="w-8 h-8 flex items-center justify-center p-1 rounded text-white !bg-green-700"
                          onClick={(event) => {
                            selectedRowDataRef.current = row ?? null;
                            menuRef.current?.toggle(event);
                          }}
                          aria-haspopup
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* -------- PAGINATION -------- */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-700">
            Page <span className="font-semibold">{page}</span> / {totalPages} —{' '}
            <span className="font-semibold">{total}</span> éléments
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 mr-2">Lignes:</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={rows}
              onChange={(e) => onChangeRows(Number(e.target.value))}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(1)}
              disabled={page <= 1}
            >
              «
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
            >
              ‹
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages}
            >
              ›
            </button>
            <button
              className="px-2 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
              onClick={() => goTo(totalPages)}
              disabled={page >= totalPages}
            >
              »
            </button>
          </div>
        </div>
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
        // @ts-expect-error - compat: external lib types mismatch
        regions={regions}
        // @ts-expect-error - compat: external lib types mismatch
        pointsVente={pointsVente ?? null}
        previewUrl={previewUrl}
        handleCreateOrUpdate={handleCreateOrUpdate}
        loadingCreateOrUpdate={loadingCreateOrUpdate}
      />

      {/* Dialog suppression */}
      <ConfirmDeleteDialog
        visible={deleteDialogOpen}
        onHide={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          setDeleteDialogOpen(false);
          handleDeleteUser();
        }}
        item={selectedUser ?? { _id: '', nom: '' }}
        objectLabel="l'utilisateur"
        displayField="nom"
      />
    </div>
  );
};

export default Page;
