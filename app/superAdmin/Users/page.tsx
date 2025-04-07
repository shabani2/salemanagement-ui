"use client";

import { useState, useEffect, SetStateAction, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { apiClient } from "@/lib/apiConfig";
import { BreadCrumb } from "primereact/breadcrumb";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/stores/store";
import {
  addUser,
  deleteUser,
  fetchUsers,
  selectAllUsers,
  updateUser,
} from "@/stores/slices/users/userSlice";
import { User, UserModel } from "@/Models/UserType";
import { Menu } from "primereact/menu";
import { UserRoleModel } from "@/lib/utils";
import { FileUpload } from "primereact/fileupload";
//import { Menu } from 'lucide-react';
import { Toast } from "primereact/toast";
import { registerUser } from "@/stores/slices/auth/authSlice";
import { fetchPointVentes, selectAllPointVentes } from "@/stores/slices/pointvente/pointventeSlice";
import { fetchRegions, selectAllRegions } from "@/stores/slices/regions/regionSlice";

const breadcrumbItems = [{ label: "SuperAdmin" }, { label: "Users" }];

const Page = () => {
  const toastRef = useRef<Toast>(null);
  const [users, setUsers] = useState<User[] | null[]>([]); //useSelector((state: RootState) => selectAllUsers(state));
  const [loading, setLoading] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const pointsVente = useSelector((state: RootState) =>
    selectAllPointVentes(state),
  );
  const regions = useSelector((state: RootState) => selectAllRegions(state));
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [newUser, setNewUser] = useState<UserModel>({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    password: "",
    role: "",
    region: "",
    pointVente: "",
    image: null,
  });
  const initialUserState = {
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    adresse: "",
    password: "",
    role: "",
    region: "",
    pointVente: "",
    image: null as File | null, // Permet de stocker un fichier
  };

  const [errors, setErrors] = useState<{ [key in keyof UserModel]?: string }>(
    {},
  );
  const [rowIndexes, setRowIndexes] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    console.log("Row Index Map Updated:", rowIndexes);
  }, [rowIndexes]);

  const validate = () => {
    const newErrors: { [key in keyof User]?: string } = {};
    ["nom", "prenom", "email", "telephone", "adresse", "password"].forEach(
      (field) => {
        if (!newUser[field as keyof UserModel])
          newErrors[field as keyof UserModel] = "Ce champ est obligatoire";
      },
    );
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const handleSubmit = () => {
  //   if (validate()) handleCreateUser();
  // };

  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchUsers()).then((resp) => {
      setUsers(resp.payload);
    });
  }, [dispatch]);

  const onPageChange = (event: {
    first: SetStateAction<number>;
    rows: SetStateAction<number>;
  }) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  const handleAction = (action: string, user: any) => {
    setSelectedUser(user);
    setDialogType(action);
  };

  const showRegionField = newUser.role === "AdminRegion";
  const showPointVenteField = newUser.role === "AdminPointVente";

  const actionBodyTemplate = (rowData: any) => {
    const menuRef = useRef<any>(null);

    return (
      <div>
        <Menu
          model={[
            {
              label: "Détails",
              command: () => handleAction("details", rowData),
            },
            { label: "Modifier", command: () => handleAction("edit", rowData) },
            {
              label: "Supprimer",
              command: () => handleAction("delete", rowData),
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

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await dispatch(deleteUser(selectedUser._id)).then(async () => {
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
  const handleUpdate = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      //await apiClient.delete(`/users/${selectedUser._id}`);
      dispatch(updateUser(selectedUser)).then(() => {
        dispatch(fetchUsers()).then((resp) => {
          toastRef.current?.show({
            severity: "success",
            summary: "Succès",
            detail: "Utilisateur ajouté avec succès !",
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
  };

  const home = { icon: "pi pi-home", url: "/" };
  const handleCreate = async () => {
    if (
      !newUser.nom ||
      !newUser.prenom ||
      !newUser.email ||
      !newUser.password
    ) {
      setErrors({
        ...errors,
        global: "Veuillez remplir tous les champs requis.",
      });
      return;
    }

    try {
      setLoadingCreate(true);

      const formData = new FormData();
      if (newUser?._id) {
        formData.append("_id", newUser?._id.toString()); // Cast en string si nécessaire
      }
      formData.append("nom", newUser.nom);
      formData.append("prenom", newUser.prenom);
      formData.append("telephone", newUser.telephone);
      formData.append("email", newUser.email);
      formData.append("adresse", newUser.adresse);
      formData.append("password", newUser.password);
      formData.append("role", newUser.role);

      if (newUser.region) {
        formData.append("region", newUser.region);
      }
      if (newUser.pointVente) {
        formData.append("pointVente", newUser.pointVente);
      }
      if (newUser.image instanceof File) {
        formData.append("image", newUser.image);
      }

      await dispatch(registerUser(formData)).then(async (response) => {
        await dispatch(fetchUsers()).then((resp) => {
          toastRef.current?.show({
            severity: "success",
            summary: "Succès",
            detail: "Utilisateur ajouté avec succès !",
            life: 3000,
          });
          setUsers(resp.payload);
        });
      });

      setDialogType(null);
      setNewUser(initialUserState);
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur :", error);
      if (error instanceof Error) {
        toastRef.current?.show({
          severity: "error",
          summary: "Erreur",
          detail: error.message || "Échec de l'inscription",
          life: 1000,
        });
      }
      setDialogType(null);
      setNewUser(initialUserState);
    } finally {
      setLoadingCreate(false);
      setNewUser(initialUserState);
    }
  };

   useEffect(() => {
      dispatch(fetchPointVentes());
      dispatch(fetchRegions());
    }, [dispatch]);

  return (
    <div className="bg-gray-100 h-screen-min">
      <div className="flex items-center justify-between mb-4">
        <BreadCrumb model={breadcrumbItems} home={home} className="bg-none" />
        <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
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
              <Button
                icon="pi pi-upload"
                label="Upload"
                className="p-button-primary text-[16px]"
              />
              <Button
                icon="pi pi-download"
                label="download"
                className="p-button-success"
              />
            </div>
            {/* <i className="pi pi-search absolute -3 top-1/2 transform -translate-y-1/2 text-gray-400"></i> */}
          </div>

          <Button
            label="Créer un utilisateur"
            className="bg-blue-500 text-white p-2 rounded"
            onClick={() => setDialogType("create")}
          />
        </div>
        <div className=" p-1 rounded-lg shadow-md ">
          <DataTable
            value={
              Array.isArray(users)
                ? users.filter((user): user is User => user !== null)
                : []
            }
            dataKey="_id"
            paginator
            loading={loading}
            rows={rows}
            stripedRows
            first={first}
            onPage={onPageChange}
            className="rounded-lg  custom-datatable"
            tableStyle={{ minWidth: "50rem" }}
            rowClassName={(data, options) => {
              const index = options?.props.rows; //rowIndexes[data._id]; // 🔹 Récupérer l'index de l'état
              console.log("Row Index in rowClassName:", index);
              return index && index % 2 === 0
                ? "bg-gray-300 text-gray-900"
                : "bg-green-700 text-white";
            }}
          >
            <Column
              field="_id"
              header="#"
              body={(_data, options) => options.rowIndex + 1}
            />
            <Column
              header="Avatar"
              body={(data) => (
                <img
                  src={`http://localhost:8000/${data.image.replace("../", "")}`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border border-gray-300"
                />
              )}
            />
            <Column
              field="nom"
              header="Nom"
              sortable
              filter
              className="px-4 py-1"
            />
            <Column
              field="prenom"
              header="Prénom"
              sortable
              filter
              className="px-4 py-1"
            />
            <Column
              field="email"
              header="Email"
              sortable
              filter
              className="px-4 py-1"
            />
            <Column
              field="telephone"
              header="Téléphone"
              sortable
              filter
              className="px-4 py-1"
            />
            <Column
              field="role"
              header="Rôle"
              sortable
              filter
              className="px-4 py-1"
            />
            <Column
              body={actionBodyTemplate}
              header="Actions"
              className="px-4 py-1"
            />
          </DataTable>
        </div>
      </div>

      {/* Dialogs of create */}
      <Dialog
        visible={dialogType === "create"}
        header="Ajouter un utilisateur"
        onHide={() => setDialogType(null)}
        style={{ width: "50vw", height: "70vh" }}
        modal
      >
        <div className="flex flex-col h-full">
          {/* Scrollable fields */}
          <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
            {/* Nom et Prénom */}
            <div className="flex space-x-4">
              {[
                { name: "nom", placeholder: "Nom" },
                { name: "prenom", placeholder: "Prénom" },
              ].map(({ name, placeholder }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={newUser[name as keyof UserModel] as string}
                    onChange={(e) =>
                      setNewUser({ ...newUser, [name]: e.target.value })
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i className="pi pi-user absolute right-2 text-gray-500 text-lg flex items-center" />
                  {errors[name as keyof UserModel] && (
                    <small className="text-red-500">
                      {errors[name as keyof UserModel]}
                    </small>
                  )}
                </div>
              ))}
            </div>

            {/* Téléphone et Email */}
            <div className="flex space-x-4">
              {[
                {
                  name: "telephone",
                  placeholder: "Téléphone",
                  icon: "pi-phone",
                },
                { name: "email", placeholder: "Email", icon: "pi-envelope" },
              ].map(({ name, placeholder, icon }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={newUser[name as keyof UserModel] as string}
                    onChange={(e) =>
                      setNewUser({ ...newUser, [name]: e.target.value })
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i
                    className={`pi ${icon} absolute right-2 text-gray-500 text-lg flex items-center`}
                  />
                  {errors[name as keyof UserModel] && (
                    <small className="text-red-500">
                      {errors[name as keyof UserModel]}
                    </small>
                  )}
                </div>
              ))}
            </div>

            {/* Adresse et Mot de passe */}
            {[
              {
                name: "adresse",
                placeholder: "Adresse",
                icon: "pi-map-marker",
              },
              {
                name: "password",
                placeholder: "Mot de passe",
                icon: "pi-key",
                type: "password",
              },
            ].map(({ name, placeholder, icon, type }) => (
              <div key={name} className="relative flex items-center">
                <InputText
                  type={type || "text"}
                  placeholder={placeholder}
                  value={newUser[name as keyof UserModel] as string}
                  onChange={(e) =>
                    setNewUser({ ...newUser, [name]: e.target.value })
                  }
                  required
                  className="w-full pr-10"
                />
                <i
                  className={`pi ${icon} absolute right-2 text-gray-500 text-lg flex items-center`}
                />
                {errors[name as keyof UserModel] && (
                  <small className="text-red-500">
                    {errors[name as keyof UserModel]}
                  </small>
                )}
              </div>
            ))}

            {/* Rôle */}
            <div className="mb-2">
              <Dropdown
                value={newUser.role}
                options={UserRoleModel.map((role: string) => ({
                  label: role,
                  value: role,
                }))}
                placeholder="Sélectionner un rôle"
                onChange={(e) => setNewUser({ ...newUser, role: e.value })}
                className="w-full mb-3"
              />
              {showRegionField && (
               <Dropdown
               value={newUser.region}
               options={regions}
               onChange={(e) =>
                 setNewUser({ ...newUser, region: e.value })
               }
               optionLabel="nom"
               optionValue="_id"
               placeholder="Sélectionnez une région"
               className="w-full"
             />
              )}
              {showPointVenteField && (
                <Dropdown
                value={newUser.pointVente}
                options={pointsVente}
                onChange={(e) =>
                  setNewUser({ ...newUser, pointVente: e.value })
                }
                optionLabel="nom"
                optionValue="_id"
                placeholder="Sélectionnez un point de vente"
                className="w-full"
              />
              )}
            </div>

            {/* Upload d'image */}
            <FileUpload
              mode="basic"
              accept="image/*"
              maxFileSize={1000000}
              chooseLabel="Choisir une image"
              onSelect={(e) => setNewUser({ ...newUser, image: e.files[0] })}
              className="w-full mt-2"
            />
          </div>

          {/* Fixed Submit Button */}
          <div className="p-2 border-t flex justify-end bg-white">
            <Button
              label="Ajouter"
              className="bg-green-500 text-white"
              onClick={handleCreate}
              loading={loadingCreate}
            />
          </div>
        </div>
      </Dialog>

      {/* dialog of detail */}
      <Dialog
        visible={dialogType === "details"}
        header="Détails de l’utilisateur"
        onHide={() => setDialogType(null)}
        style={{ width: "50vw", height: "70vh" }}
        modal
      >
        <div className="flex flex-col h-full">
          {/* Scrollable fields */}
          <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
            {/* Nom et Prénom */}
            <div className="flex space-x-4">
              {[
                { name: "nom", placeholder: "Nom" },
                { name: "prenom", placeholder: "Prénom" },
              ].map(({ name, placeholder }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={
                      selectedUser &&
                      (selectedUser[name as keyof UserModel] as string)
                    }
                    onChange={(e) =>
                      setSelectedUser(
                        selectedUser && {
                          ...selectedUser,
                          [name]: e.target.value,
                        },
                      )
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i className="pi pi-user absolute right-2 text-gray-500 text-lg flex items-center" />
                </div>
              ))}
            </div>

            {/* Téléphone et Email */}
            <div className="flex space-x-4">
              {[
                {
                  name: "telephone",
                  placeholder: "Téléphone",
                  icon: "pi-phone",
                },
                { name: "email", placeholder: "Email", icon: "pi-envelope" },
              ].map(({ name, placeholder, icon }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={
                      selectedUser &&
                      (selectedUser[name as keyof UserModel] as string)
                    }
                    onChange={(e) =>
                      setSelectedUser(
                        selectedUser && {
                          ...selectedUser,
                          [name]: e.target.value,
                        },
                      )
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i
                    className={`pi ${icon} absolute right-2 text-gray-500 text-lg flex items-center`}
                  />
                </div>
              ))}
            </div>

            {/* Adresse */}
            <div className="relative flex items-center">
              <InputText
                type="text"
                placeholder="Adresse"
                value={selectedUser?.adresse}
                onChange={(e) =>
                  setSelectedUser(
                    selectedUser && {
                      ...selectedUser,
                      adresse: e.target.value,
                    },
                  )
                }
                required
                className="w-full pr-10"
              />
              <i className="pi pi-map-marker absolute right-2 text-gray-500 text-lg flex items-center" />
            </div>

            {/* Rôle */}
            <div className="mb-2">
              <Dropdown
                value={selectedUser?.role}
                options={UserRoleModel.map((role: string) => ({
                  label: role,
                  value: role,
                }))}
                placeholder="Sélectionner un rôle"
                onChange={(e) =>
                  setSelectedUser(
                    selectedUser && { ...selectedUser, role: e.value },
                  )
                }
                className="w-full mb-3"
              />
            </div>

            {/* Upload d'image */}
            <FileUpload
              mode="basic"
              accept="image/*"
              maxFileSize={1000000}
              chooseLabel="Choisir une image"
              onSelect={(e) => {
                const file = e.files[0];
                if (file) {
                  const fileUrl = URL.createObjectURL(file); // Génère une URL temporaire
                  setSelectedUser(
                    selectedUser && { ...selectedUser, image: fileUrl },
                  );
                }
              }}
              className="w-full mt-2"
            />
          </div>

          {/* Fixed Update Button */}
          <div className="p-2 border-t flex justify-end bg-white">
            <Button
              label="Mettre à jour"
              className="bg-blue-500 text-white"
              onClick={handleUpdate}
              loading={loading}
            />
          </div>
        </div>
      </Dialog>

      {/* dialog of Edit */}
      <Dialog
        visible={dialogType === "edit"}
        header="Modifier l’utilisateur"
        onHide={() => setDialogType(null)}
        style={{ width: "50vw", height: "70vh" }}
        modal
      >
        <div className="flex flex-col h-full">
          {/* Scrollable fields */}
          <div className="overflow-y-auto flex-grow px-4 py-2 space-y-4">
            {/* Nom et Prénom */}
            <div className="flex space-x-4">
              {[
                { name: "nom", placeholder: "Nom" },
                { name: "prenom", placeholder: "Prénom" },
              ].map(({ name, placeholder }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={
                      selectedUser &&
                      (selectedUser[name as keyof UserModel] as string)
                    }
                    onChange={(e) =>
                      setSelectedUser(
                        selectedUser && {
                          ...selectedUser,
                          [name]: e.target.value,
                        },
                      )
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i className="pi pi-user absolute right-2 text-gray-500 text-lg flex items-center" />
                </div>
              ))}
            </div>

            {/* Téléphone et Email */}
            <div className="flex space-x-4">
              {[
                {
                  name: "telephone",
                  placeholder: "Téléphone",
                  icon: "pi-phone",
                },
                { name: "email", placeholder: "Email", icon: "pi-envelope" },
              ].map(({ name, placeholder, icon }) => (
                <div key={name} className="relative w-1/2 flex items-center">
                  <InputText
                    type="text"
                    placeholder={placeholder}
                    value={
                      selectedUser &&
                      (selectedUser[name as keyof UserModel] as string)
                    }
                    onChange={(e) =>
                      setSelectedUser(
                        selectedUser && {
                          ...selectedUser,
                          [name]: e.target.value,
                        },
                      )
                    }
                    required
                    className="w-full pr-10"
                  />
                  <i
                    className={`pi ${icon} absolute right-2 text-gray-500 text-lg flex items-center`}
                  />
                </div>
              ))}
            </div>

            {/* Adresse */}
            <div className="relative flex items-center">
              <InputText
                type="text"
                placeholder="Adresse"
                value={selectedUser?.adresse}
                onChange={(e) =>
                  setSelectedUser(
                    selectedUser && {
                      ...selectedUser,
                      adresse: e.target.value,
                    },
                  )
                }
                required
                className="w-full pr-10"
              />
              <i className="pi pi-map-marker absolute right-2 text-gray-500 text-lg flex items-center" />
            </div>

            {/* Rôle */}
            <div className="mb-2">
              <Dropdown
                value={selectedUser?.role}
                options={UserRoleModel.map((role: string) => ({
                  label: role,
                  value: role,
                }))}
                placeholder="Sélectionner un rôle"
                onChange={(e) =>
                  setSelectedUser(
                    selectedUser && { ...selectedUser, role: e.value },
                  )
                }
                className="w-full mb-3"
              />
            </div>

            {/* Upload d'image */}
            <FileUpload
              mode="basic"
              accept="image/*"
              maxFileSize={1000000}
              chooseLabel="Choisir une image"
              onSelect={(e) => {
                const file = e.files[0];
                if (file) {
                  const fileUrl = URL.createObjectURL(file); // Génère une URL temporaire
                  setSelectedUser(
                    selectedUser && { ...selectedUser, image: fileUrl },
                  );
                }
              }}
              className="w-full mt-2"
            />
          </div>

          {/* Fixed Update Button */}
          <div className="p-2 border-t flex justify-end bg-white">
            <Button
              label="Mettre à jour"
              className="bg-blue-500 text-white"
              onClick={handleUpdate}
              loading={loading}
            />
          </div>
        </div>
      </Dialog>
      {/* dialog of deletion */}
      <Dialog
        visible={dialogType === "delete"}
        header="Confirmation de suppression"
        onHide={() => setDialogType(null)}
      >
        <p>Êtes-vous sûr de vouloir supprimer cet utilisateur ?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            label="Annuler"
            className="bg-gray-400 text-white p-2 rounded"
            onClick={() => setDialogType(null)}
          />
          <Button
            label="Supprimer"
            className="bg-red-500 text-white p-2 rounded"
            onClick={handleDeleteUser}
            loading={loading}
          />
        </div>
      </Dialog>
      <Toast ref={toastRef} />
    </div>
  );
};

export default Page;
