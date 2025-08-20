/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/finance/CurrencyManager.tsx

'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';

import { AppDispatch, RootState } from '@/stores/store';

// --- Slices (Finance) ---
import {
  fetchDiscounts,
  addDiscount,
  selectAllDiscounts,
  selectDiscountsStatus,
  selectDiscountsError,
} from '../../stores/slices/finances/discountSlice';

import { fetchBaseCurrency, selectBaseCurrency } from '@/stores/slices/finances/currencySlice';

// --- Types ---
import { DiscountType } from '@/Models/FinanceModel';

/* -------------------------------- Types VM -------------------------------- */

type DiscountVM = {
  _id?: string;
  name?: string;
  code: string;
  type: DiscountType | string;
  value: number;
  startDate?: string;
  endDate?: string;
  maxAmount?: number;
  minPurchase?: number;
  appliesTo?: 'ALL' | 'CATEGORY' | 'PRODUCT'; // tolérant
  targetIds?: string[];
  isActive?: boolean;
};

type CurrencyVM = {
  _id?: string;
  code?: string;
  name?: string;
  symbol?: string;
  isBase?: boolean;
};

/* ------------------------------ Utils affichage ----------------------------- */

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('fr-FR');
  } catch {
    return '-';
  }
};

const discountTypeLabel = (type?: DiscountType | string) => {
  if (type === DiscountType.PERCENTAGE) return 'Pourcentage';
  if (type === DiscountType.FIXED_AMOUNT) return 'Montant Fixe';
  return typeof type === 'string' ? type : '-';
};

const discountTypeTag = (type?: DiscountType | string) => {
  if (type === DiscountType.PERCENTAGE) return <Tag severity="info" value="%" />;
  if (type === DiscountType.FIXED_AMOUNT) return <Tag severity="success" value="€" />;
  return <Tag value={discountTypeLabel(type)} />;
};

const appliesToLabel = (scope?: string) => {
  switch (scope) {
    case 'ALL':
      return 'Tous produits';
    case 'CATEGORY':
      return 'Catégorie';
    case 'PRODUCT':
      return 'Produit';
    default:
      return '-';
  }
};

const statusSeverity = (isActive?: boolean) => (isActive ? 'success' : 'danger');
const statusLabel = (isActive?: boolean) => (isActive ? 'Active' : 'Inactive');

/* ================================ Page ==================================== */

export default function DiscountCenter() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // --- Store ---
  const discounts = useSelector((s: RootState) => selectAllDiscounts(s)) as DiscountVM[];
  const dStatus = useSelector(selectDiscountsStatus);
  const dError = useSelector(selectDiscountsError);
  const baseCurrency = useSelector(selectBaseCurrency) as CurrencyVM | null;

  const loading = dStatus === 'loading';

  // --- UI State ---
  const [visibleDialog, setVisibleDialog] = useState<boolean>(false);
  const [activeDiscount, setActiveDiscount] = useState<DiscountVM | null>(null);

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    type: { value: null, matchMode: FilterMatchMode.EQUALS },
    isActive: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  // --- Fetch ---
  useEffect(() => {
    // sécurise: évite rerenders infinis
    dispatch(fetchDiscounts());
    dispatch(fetchBaseCurrency());
  }, [dispatch]);

  useEffect(() => {
    if (dStatus === 'failed' && dError) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: dError,
        life: 3500,
      });
    }
  }, [dStatus, dError]);

  // --- Actions ---
  const openCreate = () => {
    setActiveDiscount(null);
    setVisibleDialog(true);
  };

  const openEdit = (row: DiscountVM) => {
    // NB: pas d’endpoint PUT sur /finance/discounts pour l’instant.
    // On traite "Modifier" comme "Dupliquer" -> re-crée une remise similaire.
    setActiveDiscount(row);
    setVisibleDialog(true);
    toast.current?.show({
      severity: 'info',
      summary: 'Info',
      detail: "Les modifications créeront une nouvelle réduction (pas d'édition API).",
      life: 3000,
    });
  };

  const handleCreateOrDuplicate = async (payload: DiscountFormValue) => {
    // Adapter dates -> strings (backend tolère string/Date selon le schema, on force string ISO)
    const toISO = (d?: Date) => (d ? new Date(d).toISOString() : undefined);

    const newDiscount = {
      code: payload.code.trim(),
      name: payload.name?.trim(),
      type: payload.type,
      value: Number(payload.value ?? 0),
      startDate: toISO(payload.startDate),
      endDate: toISO(payload.endDate),
      maxAmount: payload.maxAmount ?? undefined,
      minPurchase: payload.minPurchase ?? undefined,
      appliesTo: payload.appliesTo ?? 'ALL',
      targetIds: payload.targetIds ?? [],
      isActive: !!payload.isActive,
    } as any;

    const res = await dispatch(addDiscount(newDiscount) as any);

    if ((addDiscount as any).fulfilled.match(res)) {
      toast.current?.show({
        severity: 'success',
        summary: 'Succès',
        detail: activeDiscount ? 'Réduction dupliquée' : 'Réduction créée',
        life: 2500,
      });
      setVisibleDialog(false);
      setActiveDiscount(null);
      // refresh (optionnel — fetchDiscounts déjà géré par le reducer)
      dispatch(fetchDiscounts());
    } else {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: (res?.payload as string) ?? "Échec de l'opération",
        life: 3500,
      });
    }
  };

  // --- Memos ---
  const activeDiscounts = useMemo(() => (discounts ?? []).filter((d) => d?.isActive), [discounts]);
  const fixedAmountDiscounts = useMemo(
    () => (discounts ?? []).filter((d) => d?.type === DiscountType.FIXED_AMOUNT),
    [discounts]
  );
  const loyaltyDiscounts = useMemo(
    () =>
      (discounts ?? []).filter((d) => {
        const name = (d?.name ?? d?.code ?? '').toString().toLowerCase();
        return name.includes('fidélité') || name.includes('fidelite');
      }),
    [discounts]
  );

  return (
    <div className="discount-center">
      <Toast ref={toast} position="top-right" />

      <Card
        title={
          <div className="flex items-center justify-between">
            <span>Centre Finance</span>
            <div className="flex items-center gap-2">
              {/* Base currency badge */}
              <span className="text-sm text-gray-600">
                Devise de base:&nbsp;
                <Tag
                  value={
                    baseCurrency?.code
                      ? `${baseCurrency.code}${baseCurrency.symbol ? ` (${baseCurrency.symbol})` : ''}`
                      : '—'
                  }
                  severity="info"
                />
              </span>
              <Button
                label="Nouvelle Réduction"
                icon="pi pi-plus"
                className="p-button-success"
                onClick={openCreate}
              />
            </div>
          </div>
        }
        className="shadow-2"
      >
        <p className="text-gray-600 mt-0">
          Gérez vos <strong>réductions</strong>, visualisez les remises actives, et filtrez par
          type/statut.
        </p>

        <TabView className="custom-tabview">
          {/* -------------------------- Toutes les Réductions -------------------------- */}
          <TabPanel header="Toutes les Réductions">
            <DataTable
              value={discounts ?? []}
              loading={loading}
              paginator
              rows={10}
              filters={filters}
              filterDisplay="row"
              emptyMessage="Aucune réduction trouvée"
              className="p-datatable-sm"
              scrollable
              scrollHeight="60vh"
            >
              <Column
                field="name"
                header="Nom"
                body={(d: DiscountVM) => d?.name ?? d?.code ?? '—'}
                filter
                filterPlaceholder="Rechercher par nom"
                showFilterMatchModes={false}
              />
              <Column
                field="code"
                header="Code"
                filter
                filterPlaceholder="Rechercher par code"
                showFilterMatchModes={false}
              />
              <Column
                field="type"
                header="Type"
                body={(data: DiscountVM) => (
                  <div className="flex align-items-center gap-2">
                    {discountTypeTag(data?.type)}
                    <span>{discountTypeLabel(data?.type)}</span>
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
                    className="p-column-filter w-full"
                  />
                )}
              />
              <Column
                field="value"
                header="Valeur"
                body={(data: DiscountVM) => (
                  <div className="text-right font-bold">
                    {data?.type === DiscountType.PERCENTAGE
                      ? `${Number(data?.value ?? 0)}%`
                      : `${Number(data?.value ?? 0).toFixed(2)} ${baseCurrency?.symbol ?? '€'}`}
                  </div>
                )}
                className="text-right"
              />
              <Column
                field="appliesTo"
                header="Applicable à"
                body={(data: DiscountVM) => appliesToLabel(data?.appliesTo)}
              />
              <Column
                field="startDate"
                header="Début"
                body={(d: DiscountVM) => formatDate(d?.startDate)}
              />
              <Column
                field="endDate"
                header="Fin"
                body={(d: DiscountVM) => formatDate(d?.endDate)}
              />
              <Column
                field="isActive"
                header="Statut"
                body={(data: DiscountVM) => (
                  <Tag
                    value={statusLabel(!!data?.isActive)}
                    severity={statusSeverity(!!data?.isActive)}
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
                    className="p-column-filter w-full"
                  />
                )}
              />
              <Column
                header="Actions"
                body={(rowData: DiscountVM) => (
                  <div className="flex gap-1">
                    <Button
                      icon="pi pi-copy"
                      className="p-button-rounded p-button-text p-button-info"
                      tooltip="Dupliquer"
                      tooltipOptions={{ position: 'top' }}
                      onClick={() => openEdit(rowData)}
                    />
                    {/* Désactivés car pas d’API DELETE/PUT sur /finance/discounts */}
                    <Button
                      icon="pi pi-pencil"
                      className="p-button-rounded p-button-text p-button-secondary"
                      disabled
                      tooltip="Éditer (non disponible)"
                      tooltipOptions={{ position: 'top' }}
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-rounded p-button-text p-button-danger"
                      disabled
                      tooltip="Supprimer (non disponible)"
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>

          {/* ----------------------------- Actives ------------------------------ */}
          <TabPanel header="Remises Actives">
            <DataTable
              value={activeDiscounts}
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucune réduction active"
              scrollable
              scrollHeight="60vh"
            >
              <Column
                field="name"
                header="Nom"
                body={(d: DiscountVM) => d?.name ?? d?.code ?? '—'}
              />
              <Column field="code" header="Code" />
              <Column
                field="type"
                header="Type"
                body={(d: DiscountVM) => discountTypeLabel(d?.type)}
              />
              <Column
                field="value"
                header="Valeur"
                body={(d: DiscountVM) =>
                  d?.type === DiscountType.PERCENTAGE
                    ? `${Number(d?.value ?? 0)}%`
                    : `${Number(d?.value ?? 0).toFixed(2)} ${baseCurrency?.symbol ?? '€'}`
                }
                className="text-right"
              />
              <Column
                field="endDate"
                header="Expire le"
                body={(d: DiscountVM) => (d?.endDate ? formatDate(d?.endDate) : 'Illimité')}
              />
            </DataTable>
          </TabPanel>

          {/* ----------------------------- Rabais ------------------------------ */}
          <TabPanel header="Rabais">
            <DataTable
              value={fixedAmountDiscounts}
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucun rabais configuré"
              scrollable
              scrollHeight="60vh"
            >
              <Column
                field="name"
                header="Nom"
                body={(d: DiscountVM) => d?.name ?? d?.code ?? '—'}
              />
              <Column field="code" header="Code" />
              <Column
                field="value"
                header="Montant"
                body={(d: DiscountVM) =>
                  `${Number(d?.value ?? 0).toFixed(2)} ${baseCurrency?.symbol ?? '€'}`
                }
                className="text-right"
              />
              <Column
                field="minPurchase"
                header="Achat min."
                body={(d: DiscountVM) =>
                  d?.minPurchase
                    ? `${Number(d.minPurchase).toFixed(2)} ${baseCurrency?.symbol ?? '€'}`
                    : '-'
                }
                className="text-right"
              />
              <Column
                field="isActive"
                header="Statut"
                body={(d: DiscountVM) => (
                  <Tag
                    value={statusLabel(!!d?.isActive)}
                    severity={statusSeverity(!!d?.isActive)}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          {/* ---------------------------- Fidélité ------------------------------ */}
          <TabPanel header="Fidélité">
            <DataTable
              value={loyaltyDiscounts}
              loading={loading}
              paginator
              rows={10}
              emptyMessage="Aucune réduction fidélité"
              scrollable
              scrollHeight="60vh"
            >
              <Column
                field="name"
                header="Nom"
                body={(d: DiscountVM) => d?.name ?? d?.code ?? '—'}
              />
              <Column field="code" header="Code" />
              <Column
                field="value"
                header="Valeur"
                body={(d: DiscountVM) =>
                  d?.type === DiscountType.PERCENTAGE
                    ? `${Number(d?.value ?? 0)}%`
                    : `${Number(d?.value ?? 0).toFixed(2)} ${baseCurrency?.symbol ?? '€'}`
                }
                className="text-right"
              />
              <Column header="Utilisations" body={() => 'Illimité'} />
            </DataTable>
          </TabPanel>
        </TabView>
      </Card>

      {/* ----------------------------- Dialog ------------------------------ */}
      <Dialog
        visible={visibleDialog}
        onHide={() => setVisibleDialog(false)}
        header={activeDiscount ? 'Dupliquer la Réduction' : 'Créer une Nouvelle Réduction'}
        style={{ width: '50vw' }}
        className="discount-dialog"
        draggable={false}
        resizable={false}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
      >
        <DiscountForm
          discount={activeDiscount ? mapDiscountToForm(activeDiscount) : undefined}
          currencySymbol={baseCurrency?.symbol ?? '€'}
          onSubmit={handleCreateOrDuplicate}
          onCancel={() => setVisibleDialog(false)}
        />
      </Dialog>

      <style jsx>{`
        .discount-center :global(.p-card) {
          border-radius: 16px;
          overflow: hidden;
        }
        .discount-center :global(.p-card .p-card-title) {
          font-size: 1.15rem;
        }
        .discount-center :global(.p-tabview) {
          margin-top: 1rem;
        }
        .discount-center :global(.p-tabview-panels) {
          padding: 1.25rem 0 0;
        }
        .discount-center :global(.discount-dialog .p-dialog-content) {
          padding: 0 1.25rem 1.5rem;
        }
      `}</style>
    </div>
  );
}

/* ============================= Discount Form ============================== */

type DiscountFormValue = {
  _id?: string;
  name?: string;
  code: string;
  type: DiscountType | string;
  value: number;
  startDate?: Date;
  endDate?: Date;
  maxAmount?: number;
  minPurchase?: number;
  appliesTo?: 'ALL' | 'CATEGORY' | 'PRODUCT';
  targetIds?: string[];
  isActive?: boolean;
};

const discountTypes = [
  { label: 'Pourcentage', value: DiscountType.PERCENTAGE },
  { label: 'Montant Fixe', value: DiscountType.FIXED_AMOUNT },
];

const appliesToOptions = [
  { label: 'Tous les produits', value: 'ALL' },
  { label: 'Catégorie spécifique', value: 'CATEGORY' },
  { label: 'Produit spécifique', value: 'PRODUCT' },
];

function mapDiscountToForm(d: DiscountVM): DiscountFormValue {
  return {
    _id: d._id,
    name: d.name,
    code: d.code,
    type: (d.type as any) ?? DiscountType.PERCENTAGE,
    value: Number(d.value ?? 0),
    startDate: d.startDate ? new Date(d.startDate) : new Date(),
    endDate: d.endDate ? new Date(d.endDate) : undefined,
    maxAmount: d.maxAmount,
    minPurchase: d.minPurchase,
    appliesTo: (d.appliesTo as any) ?? 'ALL',
    targetIds: d.targetIds ?? [],
    isActive: !!d.isActive,
  };
}

function DiscountForm({
  discount,
  onSubmit,
  onCancel,
  currencySymbol = '€',
}: {
  discount?: DiscountFormValue;
  onSubmit: (d: DiscountFormValue) => void;
  onCancel: () => void;
  currencySymbol?: string;
}) {
  const toast = useRef<Toast>(null);
  const [formData, setFormData] = useState<DiscountFormValue>({
    name: '',
    code: '',
    type: DiscountType.PERCENTAGE,
    value: 0,
    startDate: new Date(),
    appliesTo: 'ALL',
    isActive: true,
    ...discount,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof DiscountFormValue, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code?.trim()) newErrors.code = 'Le code est requis';
    if (formData.value === undefined || Number(formData.value) <= 0) {
      newErrors.value = 'La valeur doit être positive';
    }
    if (formData.type === DiscountType.PERCENTAGE && Number(formData.value) > 100) {
      newErrors.value = 'Le pourcentage ne peut dépasser 100%';
    }
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'La date de fin doit être après la date de début';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showError = (message: string) => {
    toast.current?.show({
      severity: 'error',
      summary: 'Erreur',
      detail: message,
      life: 4500,
    });
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    setSaving(true);
    try {
      onSubmit(formData);
    } finally {
      // on laisse le parent remettre saving à false via fermeture du dialog; si error, ce setTimeout réactive le bouton.
      setTimeout(() => setSaving(false), 400);
    }
  };

  return (
    <div className="discount-form">
      <Toast ref={toast} position="top-right" />

      <div className="p-fluid grid">
        <div className="field col-12 md:col-6">
          <label>Nom</label>
          <InputText
            value={formData.name ?? ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full"
            placeholder="Ex: Remise été"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Code*</label>
          <InputText
            value={formData.code}
            onChange={(e) => handleChange('code', (e.target.value ?? '').toUpperCase())}
            className={`w-full ${errors.code ? 'p-invalid' : ''}`}
            placeholder="Ex: ETE2025"
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
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Valeur*</label>
          <InputNumber
            value={Number(formData.value ?? 0)}
            onValueChange={(e) => handleChange('value', e.value ?? 0)}
            mode="decimal"
            min={0}
            max={formData.type === DiscountType.PERCENTAGE ? 100 : undefined}
            suffix={formData.type === DiscountType.PERCENTAGE ? '%' : ` ${currencySymbol}`}
            className={`w-full ${errors.value ? 'p-invalid' : ''}`}
          />
          {errors.value && <small className="p-error">{errors.value}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Date de Début</label>
          <Calendar
            value={formData.startDate ?? null}
            onChange={(e) => handleChange('startDate', e.value as Date)}
            showTime
            hourFormat="24"
            dateFormat="dd/mm/yy"
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Date de Fin</label>
          <Calendar
            value={formData.endDate ?? null}
            onChange={(e) => handleChange('endDate', e.value as Date)}
            showTime
            hourFormat="24"
            dateFormat="dd/mm/yy"
            className={`w-full ${errors.endDate ? 'p-invalid' : ''}`}
          />
          {errors.endDate && <small className="p-error">{errors.endDate}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Montant Maximum</label>
          <InputNumber
            value={formData.maxAmount ?? null}
            onValueChange={(e) => handleChange('maxAmount', e.value)}
            mode="decimal"
            className="w-full"
            placeholder="Limite de réduction (optionnel)"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Achat Minimum</label>
          <InputNumber
            value={formData.minPurchase ?? null}
            onValueChange={(e) => handleChange('minPurchase', e.value)}
            mode="decimal"
            className="w-full"
            placeholder="Montant min. d'achat (optionnel)"
          />
        </div>

        <div className="field col-12">
          <label>Applicable à</label>
          <Dropdown
            value={formData.appliesTo ?? 'ALL'}
            options={appliesToOptions}
            onChange={(e) => handleChange('appliesTo', e.value)}
            placeholder="Sélectionner"
            className="w-full"
          />
        </div>

        <div className="field col-12">
          <div className="flex align-items-center">
            <Checkbox
              inputId="isActive"
              checked={!!formData.isActive}
              onChange={(e) => handleChange('isActive', !!e.checked)}
            />
            <label htmlFor="isActive" className="ml-2">
              Réduction active
            </label>
          </div>
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
            label={saving ? 'Enregistrement...' : discount ? 'Dupliquer' : 'Créer'}
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
}
