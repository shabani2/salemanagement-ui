/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/finance/CurrencyManager.tsx
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useEffect, useRef, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { TabPanel, TabView } from 'primereact/tabview';
import { DiscountType } from '@/Models/FinanceModel';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';

interface Discount {
  //@ts-ignore
  _id: string;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  startDate: string;
  endDate?: string;
  maxAmount?: number;
  minPurchase?: number;
  appliesTo: 'ALL' | 'CATEGORY' | 'PRODUCT';
  targetIds?: string[];
  isActive: boolean;
}

const DiscountCenter = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [activeDiscount, setActiveDiscount] = useState<Discount | null>(null);
  const [visibleDialog, setVisibleDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    type: { value: null, matchMode: FilterMatchMode.EQUALS },
    isActive: { value: null, matchMode: FilterMatchMode.EQUALS },
  });
  const toast = useRef<Toast>(null);

  useEffect(() => {
    fetchDiscounts();
  });

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/finance/discounts');
      const data = await response.json();
      setDiscounts(data);
    } catch (error) {
      showError('Erreur de chargement des réductions');
    } finally {
      setLoading(false);
    }
  };

  const showError = (message: string) => {
    toast.current?.show({
      severity: 'error',
      summary: 'Erreur',
      detail: message,
      life: 3000,
    });
  };

  const showSuccess = (message: string) => {
    toast.current?.show({
      severity: 'success',
      summary: 'Succès',
      detail: message,
      life: 3000,
    });
  };

  const handleFormSubmit = async (discount: Discount) => {
    try {
      const url = discount._id ? `/finance/discounts/${discount._id}` : '/finance/discounts';

      const method = discount._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discount,
          startDate: discount.startDate.toString(),
          endDate: discount.endDate?.toString(),
        }),
      });

      if (response.ok) {
        const updatedDiscount = await response.json();

        if (discount._id) {
          setDiscounts(discounts.map((d) => (d._id === updatedDiscount._id ? updatedDiscount : d)));
        } else {
          setDiscounts([...discounts, updatedDiscount]);
        }

        setVisibleDialog(false);
        showSuccess(discount._id ? 'Réduction mise à jour' : 'Réduction créée avec succès');
      } else {
        const errorData = await response.json();
        showError(errorData.message || "Erreur lors de l'opération");
      }
    } catch (error: unknown) {
      //@ts-ignore
      showError('Erreur réseau');
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    try {
      const response = await fetch(`/finance/discounts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDiscounts(discounts.filter((d) => d._id !== id));
        showSuccess('Réduction supprimée avec succès');
      } else {
        showError('Erreur lors de la suppression');
      }
    } catch (error) {
      showError('Erreur réseau');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/finance/discounts/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        const updatedDiscount = await response.json();
        setDiscounts(discounts.map((d) => (d._id === id ? updatedDiscount : d)));
        showSuccess(`Réduction ${!currentStatus ? 'activée' : 'désactivée'}`);
      } else {
        showError('Erreur lors de la mise à jour');
      }
    } catch (error) {
      //@ts-ignore
      showError('Erreur réseau');
    }
  };

  const getDiscountTypeLabel = (type: DiscountType) => {
    switch (type) {
      case DiscountType.PERCENTAGE:
        return 'Pourcentage';
      case DiscountType.FIXED_AMOUNT:
        return 'Montant Fixe';
      default:
        return type;
    }
  };

  const getDiscountTypeTag = (type: DiscountType) => {
    switch (type) {
      case DiscountType.PERCENTAGE:
        return <Tag severity="info" value="%" />;
      case DiscountType.FIXED_AMOUNT:
        return <Tag severity="success" value="€" />;
      default:
        return <Tag value={type} />;
    }
  };

  const getAppliesToLabel = (scope: string) => {
    switch (scope) {
      case 'ALL':
        return 'Tous produits';
      case 'CATEGORY':
        return 'Catégorie';
      case 'PRODUCT':
        return 'Produit';
      default:
        return scope;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusSeverity = (isActive: boolean) => {
    return isActive ? 'success' : 'danger';
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  return (
    <div className="discount-center">
      <Toast ref={toast} position="top-right" />

      <Card title="Centre de Gestion des Réductions" className="shadow-2">
        <div className="flex justify-content-between align-items-center mb-4">
          <h2 className="text-xl font-semibold">Gestion des promotions et réductions</h2>
          <Button
            label="Nouvelle Réduction"
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => {
              setActiveDiscount(null);
              setVisibleDialog(true);
            }}
          />
        </div>

        <TabView className="custom-tabview">
          <TabPanel header="Toutes les Réductions">
            <div className="mb-4">
              <DataTable
                value={discounts}
                loading={loading}
                paginator
                rows={10}
                filters={filters}
                filterDisplay="row"
                emptyMessage="Aucune réduction trouvée"
                className="p-datatable-sm"
              >
                <Column field="name" header="Nom" filter filterPlaceholder="Rechercher par nom" />
                <Column field="code" header="Code" filter filterPlaceholder="Rechercher par code" />
                <Column
                  field="type"
                  header="Type"
                  body={(data) => (
                    <div className="flex align-items-center gap-2">
                      {getDiscountTypeTag(data.type)}
                      <span>{getDiscountTypeLabel(data.type)}</span>
                    </div>
                  )}
                  filter
                  filterField="type"
                  filterMenuStyle={{ width: '14rem' }}
                  filterElement={(options) => (
                    <Dropdown
                      value={options.value}
                      options={[
                        { label: 'Pourcentage', value: DiscountType.PERCENTAGE },
                        { label: 'Montant Fixe', value: DiscountType.FIXED_AMOUNT },
                      ]}
                      onChange={(e) => options.filterCallback(e.value, options.index)}
                      placeholder="Tous types"
                      className="p-column-filter"
                    />
                  )}
                />
                <Column
                  field="value"
                  header="Valeur"
                  body={(data) => (
                    <div className="text-right font-bold">
                      {data.type === DiscountType.PERCENTAGE
                        ? `${data.value}%`
                        : `${data.value.toFixed(2)} €`}
                    </div>
                  )}
                />
                <Column
                  field="appliesTo"
                  header="Applicable à"
                  body={(data) => getAppliesToLabel(data.appliesTo)}
                />
                <Column
                  field="startDate"
                  header="Début"
                  body={(data) => formatDate(data.startDate)}
                />
                <Column field="endDate" header="Fin" body={(data) => formatDate(data.endDate)} />
                <Column
                  field="isActive"
                  header="Statut"
                  body={(data) => (
                    <Tag
                      value={getStatusLabel(data.isActive)}
                      severity={getStatusSeverity(data.isActive)}
                    />
                  )}
                  filter
                  filterField="isActive"
                  filterElement={(options) => (
                    <Dropdown
                      value={options.value}
                      options={[
                        { label: 'Actif', value: true },
                        { label: 'Inactif', value: false },
                      ]}
                      onChange={(e) => options.filterCallback(e.value, options.index)}
                      placeholder="Tous statuts"
                      className="p-column-filter"
                    />
                  )}
                />
                <Column
                  header="Actions"
                  body={(rowData) => (
                    <div className="flex gap-1">
                      <Button
                        icon="pi pi-pencil"
                        className="p-button-rounded p-button-text p-button-success"
                        tooltip="Modifier"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => {
                          setActiveDiscount(rowData);
                          setVisibleDialog(true);
                        }}
                      />
                      <Button
                        icon={rowData.isActive ? 'pi pi-ban' : 'pi pi-check'}
                        className={`p-button-rounded p-button-text ${rowData.isActive ? 'p-button-warning' : 'p-button-info'}`}
                        tooltip={rowData.isActive ? 'Désactiver' : 'Activer'}
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => handleToggleStatus(rowData._id, rowData.isActive)}
                      />
                      <Button
                        icon="pi pi-trash"
                        className="p-button-rounded p-button-text p-button-danger"
                        tooltip="Supprimer"
                        tooltipOptions={{ position: 'top' }}
                        onClick={() => handleDeleteDiscount(rowData._id)}
                      />
                    </div>
                  )}
                />
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel header="Remises Actives">
            <DataTable
              value={discounts.filter((d) => d.isActive)}
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucune réduction active"
            >
              <Column field="name" header="Nom" />
              <Column field="code" header="Code" />
              <Column field="type" header="Type" body={(data) => getDiscountTypeLabel(data.type)} />
              <Column
                field="value"
                header="Valeur"
                body={(data) =>
                  data.type === DiscountType.PERCENTAGE
                    ? `${data.value}%`
                    : `${data.value.toFixed(2)} €`
                }
                className="text-right"
              />
              <Column
                field="endDate"
                header="Expire le"
                body={(data) => (data.endDate ? formatDate(data.endDate) : 'Illimité')}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Rabais">
            <DataTable
              value={discounts.filter((d) => d.type === DiscountType.FIXED_AMOUNT)}
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucun rabais configuré"
            >
              <Column field="name" header="Nom" />
              <Column field="code" header="Code" />
              <Column
                field="value"
                header="Montant"
                body={(data) => `${data.value.toFixed(2)} €`}
                className="text-right"
              />
              <Column
                field="minPurchase"
                header="Achat min."
                body={(data) => (data.minPurchase ? `${data.minPurchase.toFixed(2)} €` : '-')}
                className="text-right"
              />
              <Column
                field="isActive"
                header="Statut"
                body={(data) => (
                  <Tag
                    value={getStatusLabel(data.isActive)}
                    severity={getStatusSeverity(data.isActive)}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Fidélité">
            <DataTable
              value={discounts.filter(
                (d) =>
                  d.name.toLowerCase().includes('fidélité') ||
                  d.name.toLowerCase().includes('fidelite')
              )}
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucune réduction fidélité"
            >
              <Column field="name" header="Nom" />
              <Column field="code" header="Code" />
              <Column
                field="value"
                header="Valeur"
                body={(data) =>
                  data.type === DiscountType.PERCENTAGE
                    ? `${data.value}%`
                    : `${data.value.toFixed(2)} €`
                }
                className="text-right"
              />
              <Column header="Utilisations" body={() => 'Illimité'} />
            </DataTable>
          </TabPanel>
        </TabView>
      </Card>

      <Dialog
        visible={visibleDialog}
        onHide={() => setVisibleDialog(false)}
        header={activeDiscount ? 'Modifier Réduction' : 'Créer une Nouvelle Réduction'}
        style={{ width: '50vw' }}
        className="discount-dialog"
        draggable={false}
        resizable={false}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
      >
        <DiscountForm
          discount={activeDiscount}
          onSubmit={handleFormSubmit}
          onCancel={() => setVisibleDialog(false)}
        />
      </Dialog>

      <style jsx>{`
        .discount-center :global(.p-card) {
          border-radius: 12px;
          overflow: hidden;
        }

        .discount-center :global(.p-tabview) {
          margin-top: 1rem;
        }

        .discount-center :global(.p-tabview-panels) {
          padding: 1.5rem 0 0;
        }

        .discount-center :global(.discount-dialog .p-dialog-content) {
          padding: 0 1.5rem 2rem;
        }
      `}</style>
    </div>
  );
};

export { DiscountCenter };

interface Discount {
  //@ts-ignore
  _id?: string;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  //@ts-ignore
  startDate: Date;
  //@ts-ignore
  endDate?: Date;
  maxAmount?: number;
  minPurchase?: number;
  appliesTo: 'ALL' | 'CATEGORY' | 'PRODUCT';
  targetIds?: string[];
  isActive: boolean;
}

interface DiscountFormProps {
  discount?: Discount | null;
  onSubmit: (discount: Discount) => void;
  onCancel: () => void;
}

const discountTypes = [
  { label: 'Pourcentage', value: DiscountType.PERCENTAGE },
  { label: 'Montant Fixe', value: DiscountType.FIXED_AMOUNT },
];

const appliesToOptions = [
  { label: 'Tous les produits', value: 'ALL' },
  { label: 'Catégorie spécifique', value: 'CATEGORY' },
  { label: 'Produit spécifique', value: 'PRODUCT' },
];

const DiscountForm = ({ discount, onSubmit, onCancel }: DiscountFormProps) => {
  const toast = useRef<Toast>(null);
  const [formData, setFormData] = useState<Discount>({
    name: '',
    code: '',
    type: DiscountType.PERCENTAGE,
    // @ts-ignore
    value: 0,
    //@ts-ignore
    startDate: new Date(),
    appliesTo: 'ALL',

    // @ts-ignore
    isActive: true,
    ...discount,
    //@ts-ignore
    startDate: discount?.startDate ? new Date(discount.startDate) : new Date(),
    //@ts-ignore
    endDate: discount?.endDate ? new Date(discount.endDate) : undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Le code est requis';
    }

    if (formData.value <= 0) {
      newErrors.value = 'La valeur doit être positive';
    }

    if (formData.type === DiscountType.PERCENTAGE && formData.value > 100) {
      newErrors.value = 'Le pourcentage ne peut dépasser 100%';
    }

    if (formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'La date de fin doit être après la date de début';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setSaving(true);
    onSubmit(formData);
  };

  const showError = (message: string) => {
    toast.current?.show({
      severity: 'error',
      summary: 'Erreur',
      detail: message,
      life: 5000,
    });
  };
  //@ts-ignore

  const handleChange = (field: keyof Discount, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="discount-form">
      <Toast ref={toast} position="top-right" />

      <div className="p-fluid grid">
        <div className="field col-12 md:col-6">
          <label>Nom*</label>
          <InputText
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full ${errors.name ? 'p-invalid' : ''}`}
            placeholder="Ex: Remise été 2023"
          />
          {errors.name && <small className="p-error">{errors.name}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Code*</label>
          <InputText
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
            className={`w-full ${errors.code ? 'p-invalid' : ''}`}
            placeholder="Ex: ETE2023"
          />
          {errors.code && <small className="p-error">{errors.code}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Type*</label>
          <Dropdown
            value={formData.type}
            options={discountTypes}
            onChange={(e) => handleChange('type', e.value)}
            placeholder="Sélectionner un type"
            className={`w-full ${errors.type ? 'p-invalid' : ''}`}
          />
          {errors.type && <small className="p-error">{errors.type}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Valeur*</label>
          <InputNumber
            value={formData.value}
            onValueChange={(e) => handleChange('value', e.value)}
            mode={formData.type === DiscountType.PERCENTAGE ? 'decimal' : 'currency'}
            min={0}
            max={formData.type === DiscountType.PERCENTAGE ? 100 : undefined}
            suffix={formData.type === DiscountType.PERCENTAGE ? '%' : '€'}
            className={`w-full ${errors.value ? 'p-invalid' : ''}`}
          />
          {errors.value && <small className="p-error">{errors.value}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Date de Début*</label>
          <Calendar
            //@ts-ignore
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.value as Date)}
            showTime
            dateFormat="dd/mm/yy"
            className={`w-full ${errors.startDate ? 'p-invalid' : ''}`}
          />
          {errors.startDate && <small className="p-error">{errors.startDate}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Date de Fin</label>
          <Calendar
            //@ts-ignore
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.value as Date)}
            showTime
            dateFormat="dd/mm/yy"
            className={`w-full ${errors.endDate ? 'p-invalid' : ''}`}
          />
          {errors.endDate && <small className="p-error">{errors.endDate}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Montant Maximum</label>
          <InputNumber
            value={formData.maxAmount}
            onValueChange={(e) => handleChange('maxAmount', e.value)}
            mode="currency"
            currency="EUR"
            className="w-full"
            placeholder="Limite de réduction"
          />
          <small className="text-500">(Optionnel)</small>
        </div>

        <div className="field col-12 md:col-6">
          <label>Achat Minimum</label>
          <InputNumber
            value={formData.minPurchase}
            onValueChange={(e) => handleChange('minPurchase', e.value)}
            mode="currency"
            currency="EUR"
            className="w-full"
            placeholder="Montant minimum d'achat"
          />
          <small className="text-500">(Optionnel)</small>
        </div>

        <div className="field col-12">
          <label>Applicable à*</label>
          <Dropdown
            value={formData.appliesTo}
            options={appliesToOptions}
            onChange={(e) => handleChange('appliesTo', e.value)}
            placeholder="Sélectionner"
            className={`w-full ${errors.appliesTo ? 'p-invalid' : ''}`}
          />
          {errors.appliesTo && <small className="p-error">{errors.appliesTo}</small>}
        </div>

        <div className="field col-12">
          <div className="flex align-items-center">
            <Checkbox
              inputId="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.checked)}
              className={errors.isActive ? 'p-invalid' : ''}
            />
            <label htmlFor="isActive" className="ml-2">
              Réduction active
            </label>
          </div>
          {errors.isActive && <small className="p-error">{errors.isActive}</small>}
        </div>

        <div className="col-12 flex justify-content-end gap-2 mt-4">
          <Button
            label="Annuler"
            icon="pi pi-times"
            className="p-button-secondary"
            onClick={onCancel}
            disabled={saving}
          />
          <Button
            label={saving ? 'Enregistrement...' : 'Enregistrer'}
            icon="pi pi-check"
            onClick={handleSubmit}
            disabled={saving}
            loading={saving}
          />
        </div>
      </div>

      <style jsx>{`
        .discount-form :global(.p-invalid) {
          border-color: #e24c4c;
        }
      `}</style>
    </div>
  );
};

export default DiscountForm;
