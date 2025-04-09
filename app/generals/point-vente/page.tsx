"use client";
import { useState, useEffect, useRef } from "react";
import { BreadCrumb } from "primereact/breadcrumb";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Menu } from "primereact/menu";
import { Dropdown } from "primereact/dropdown";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/stores/store";
//import { addPointVente, deletePointVente, fetchPointsVente, selectAllPointsVente } from "@/stores/slices/pointVenteSlice";
import {
  fetchRegions,
  selectAllRegions,
} from "@/stores/slices/regions/regionSlice";
import {
  addPointVente,
  deletePointVente,
  fetchPointVentes,
  selectAllPointVentes,
} from "@/stores/slices/pointvente/pointventeSlice";

export default function PointVenteManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const pointsVente = useSelector((state: RootState) =>
    selectAllPointVentes(state),
  );
  const regions = useSelector((state: RootState) => selectAllRegions(state));
  const [search, setSearch] = useState("");
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedPointVente, setSelectedPointVente] = useState<any>(null);
  const [newPointVente, setNewPointVente] = useState<{
    nom: string;
    adresse: string;
    region: string | null;
  }>({ nom: "", adresse: "", region: null });
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
    dispatch(addPointVente(newPointVente));
    setDialogType(null);
  };

  const handleDelete = () => {
    if (selectedPointVente) {
      dispatch(deletePointVente(selectedPointVente._id));
      setDialogType(null);
    }
  };

  const actionBodyTemplate = (rowData: any) => (
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
  const handleUpdate = () => {
    dispatch(deletePointVente(selectedPointVente));
    setDialogType(null);
  };

  console.log("point de vente = ", pointsVente);
  return (
    <div className="bg-gray-100 min-h-screen ">
      <div className="flex items-center justify-between mb-6">
        <BreadCrumb
          model={[
            { label: "Accueil", url: "/" },
            { label: "Gestion des points de vente" },
          ]}
          home={{ icon: "pi pi-home", url: "/" }}
          className="bg-none"
        />
        <h2 className="text-2xl font-bold">Gestion des Points de Vente</h2>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
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
                label="upload"
                icon="pi pi-upload"
                className="p-button-primary text-[16px]"
              />
              <Button
                label="download"
                icon="pi pi-download"
                className="p-button-success text-[16px]"
              />
            </div>
          </div>
          <Button
            label="Créer un point de vente"
            className="bg-blue-500 text-white p-2 rounded"
            onClick={() => setDialogType("create")}
          />
        </div>
        <DataTable
          value={pointsVente}
          paginator
          rows={5}
          className="rounded-lg"
          tableStyle={{ minWidth: "50rem" }}
        >
          <Column
            field="_id"
            header="#"
            body={(_, options) => options.rowIndex + 1}
          />
          <Column field="nom" header="Nom" sortable />
          <Column field="adresse" header="Adresse" sortable />
          <Column
            field="region"
            header="Région"
            body={(rowData) => rowData.region?.nom || "N/A"}
            sortable
          />
          <Column
            body={actionBodyTemplate}
            header="Actions"
            className="px-4 py-1"
          />
        </DataTable>
      </div>

      <Dialog
        visible={dialogType === "create"}
        header="Ajouter un point de vente"
        onHide={() => setDialogType(null)}
        style={{ width: "40vw" }}
        modal
      >
        <div className="p-4">
          {[
            { name: "nom", placeholder: "Nom" },
            { name: "adresse", placeholder: "Adresse" },
          ].map(({ name, placeholder }) => (
            <div key={name} className="mb-4">
              <InputText
                type="text"
                placeholder={placeholder}
                value={newPointVente[name as keyof typeof newPointVente]}
                onChange={(e) =>
                  setNewPointVente({ ...newPointVente, [name]: e.target.value })
                }
                required
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
          <div className="mb-4">
            <Dropdown
              value={newPointVente.region}
              options={regions.map((r) => ({ label: r.nom, value: r._id }))}
              onChange={(e) =>
                setNewPointVente({ ...newPointVente, region: e.value })
              }
              placeholder="Sélectionner une région"
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button
              label="Ajouter"
              className="bg-green-500 text-white"
              onClick={handleCreate}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        visible={dialogType === "delete"}
        header="Confirmation"
        onHide={() => setDialogType(null)}
        style={{ width: "30vw" }}
        modal
      >
        <div className="p-4">
          <p>Voulez-vous vraiment supprimer ce point de vente ?</p>
          <div className="flex justify-end mt-4 gap-2">
            <Button
              label="Annuler"
              className="p-button-secondary"
              onClick={() => setDialogType(null)}
            />
            <Button
              label="Supprimer"
              className="bg-red-500 text-white"
              onClick={handleDelete}
            />
          </div>
        </div>
      </Dialog>
      <Dialog
        visible={dialogType === "details"}
        header="Détails du point de vente"
        onHide={() => setDialogType(null)}
        style={{ width: "40vw" }}
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
            <strong>Région:</strong>{" "}
            {regions.find((r) => r._id === selectedPointVente?.region)?.nom ||
              "Non défini"}
          </p>
        </div>
      </Dialog>
      <Dialog
        visible={dialogType === "edit"}
        header="Modifier le point de vente"
        onHide={() => setDialogType(null)}
        style={{ width: "40vw" }}
        modal
      >
        <div className="p-4">
          <div className="mb-2">
            <label htmlFor="nom">nom</label>
            <InputText
              placeholder="Nom"
              value={selectedPointVente?.nom || ""}
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
              value={selectedPointVente?.adresse || ""}
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

          <Button
            label="Mettre à jour"
            className="bg-blue-500 text-white"
            onClick={handleUpdate}
          />
        </div>
      </Dialog>
    </div>
  );
}
