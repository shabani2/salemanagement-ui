/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/finance/CurrencyManager.tsx
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useEffect, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import {
  addCurrency,
  deleteCurrency,
  fetchCurrencies,
  selectAllCurrencies,
  selectCurrencyError,
  selectCurrencyStatus,
  setBaseCurrency,
  updateCurrency,
} from '@/stores/slices/finances/currencySlice';

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  isBase?: boolean;
}

const CurrencyManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const currencies = useSelector(selectAllCurrencies);
  const status = useSelector(selectCurrencyStatus);
  const error = useSelector(selectCurrencyError);

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [editVisible, setEditVisible] = useState<boolean>(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState<boolean>(false);
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCurrencies());
    }
  }, [status, dispatch]);

  const showError = (message: string) => {
    toast.current?.show({
      severity: 'error',
      summary: 'Erreur',
      detail: message,
      life: 5000,
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

  const handleDeleteCurrency = async () => {
    if (!currencyToDelete) return;

    setSaving(true);
    try {
      await dispatch(deleteCurrency(currencyToDelete._id)).unwrap();
      showSuccess(`Devise ${currencyToDelete.code} supprimée avec succès`);
      setDeleteConfirmVisible(false);
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
      setCurrencyToDelete(null);
    }
  };

  const actionTemplate = (rowData: Currency) => {
    return (
      <div className="flex gap-1">
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text p-button-success"
          tooltip="Modifier"
          tooltipOptions={{ position: 'top' }}
          onClick={() => {
            setSelectedCurrency(rowData);
            setEditVisible(true);
          }}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-danger"
          tooltip="Supprimer"
          tooltipOptions={{ position: 'top' }}
          onClick={() => {
            setCurrencyToDelete(rowData);
            setDeleteConfirmVisible(true);
          }}
        />
      </div>
    );
  };

  const baseCurrencyTemplate = (rowData: Currency) => {
    return rowData.isBase ? (
      <span className="flex align-items-center gap-2">
        <i className="pi pi-star-fill text-yellow-500"></i>
        <span>Devise de base</span>
      </span>
    ) : null;
  };

  const renderTable = () => {
    if (status === 'loading') {
      return (
        <div
          className="flex justify-content-center align-items-center"
          style={{ minHeight: '200px' }}
        >
          <ProgressSpinner />
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="flex flex-column justify-content-center align-items-center py-5">
          <i className="pi pi-exclamation-triangle text-5xl text-red-500 mb-3"></i>
          <p className="text-red-500">{error}</p>
          <Button
            label="Réessayer"
            icon="pi pi-refresh"
            className="mt-3"
            onClick={() => dispatch(fetchCurrencies())}
          />
        </div>
      );
    }

    if (currencies.length === 0) {
      return (
        <div className="flex flex-column justify-content-center align-items-center py-5">
          <i className="pi pi-inbox text-5xl text-500 mb-3"></i>
          <p>Aucune devise configurée</p>
          <Button
            label="Ajouter une devise"
            icon="pi pi-plus"
            className="mt-3"
            onClick={() => {
              setSelectedCurrency(null);
              setEditVisible(true);
            }}
          />
        </div>
      );
    }

    return (
      <DataTable
        value={currencies ?? []}
        // loading={status === 'loading'}
        paginator
        rows={10}
        emptyMessage="Aucune devise configurée"
        className="p-datatable-sm"
      >
        <Column field="code" header="Code" sortable />
        <Column field="name" header="Nom" sortable />
        <Column field="symbol" header="Symbole" />
        <Column header="Statut" body={baseCurrencyTemplate} style={{ width: '150px' }} />
        <Column header="Actions" body={actionTemplate} style={{ width: '120px' }} />
      </DataTable>
    );
  };

  return (
    <div className="currency-manager">
      <Toast ref={toast} position="top-right" />

      <Card title="Gestion des Devises" className="shadow-1">
        <div className="flex justify-content-between align-items-center mb-4">
          <p className="m-0">Gérez les devises utilisées dans votre système financier</p>
          <Button
            label="Ajouter Devise"
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => {
              setSelectedCurrency(null);
              setEditVisible(true);
            }}
            disabled={status === 'loading'}
          />
        </div>

        {renderTable()}
      </Card>

      {/* Dialog pour créer/modifier une devise */}
      <Dialog
        visible={editVisible}
        onHide={() => setEditVisible(false)}
        header={selectedCurrency ? 'Modifier Devise' : 'Créer une Nouvelle Devise'}
        style={{ width: '40vw' }}
        className="currency-dialog"
        draggable={false}
        resizable={false}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
      >
        <CurrencyForm
          currency={selectedCurrency}
          onSuccess={() => {
            setEditVisible(false);
            dispatch(fetchCurrencies());
          }}
          onCancel={() => setEditVisible(false)}
          dispatch={dispatch}
        />
      </Dialog>

      {/* Confirmation de suppression */}
      <Dialog
        visible={deleteConfirmVisible}
        onHide={() => setDeleteConfirmVisible(false)}
        header="Confirmer la suppression"
        style={{ width: '30vw' }}
        footer={
          <div>
            <Button
              label="Annuler"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setDeleteConfirmVisible(false)}
              disabled={saving}
            />
            <Button
              label={saving ? 'Suppression...' : 'Supprimer'}
              icon="pi pi-trash"
              className="p-button-danger"
              onClick={handleDeleteCurrency}
              loading={saving}
              disabled={saving}
            />
          </div>
        }
      >
        <div className="flex align-items-center justify-content-center">
          <i
            className="pi pi-exclamation-triangle mr-3"
            style={{ fontSize: '2rem', color: '#e24c4c' }}
          />
          <p>
            Êtes-vous sûr de vouloir supprimer la devise
            <strong>
              {' '}
              {currencyToDelete?.code} - {currencyToDelete?.name}
            </strong>{' '}
            ?
          </p>
        </div>
      </Dialog>

      <style jsx>{`
        .currency-manager :global(.currency-dialog .p-dialog-content) {
          padding: 0 1.5rem 2rem;
        }

        .currency-manager :global(.p-card) {
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CurrencyManager;

interface CurrencyFormProps {
  currency?: Currency | null;
  onSuccess: () => void;
  onCancel: () => void;
  dispatch: any;
}

const CurrencyForm = ({ currency, onSuccess, onCancel, dispatch }: CurrencyFormProps) => {
  const toast = useRef<Toast>(null);
  const [formData, setFormData] = useState<Currency>({
    _id: currency?._id ?? '',
    code: currency?.code ?? '',
    name: currency?.name ?? '',
    symbol: currency?.symbol ?? '',
    isBase: currency?.isBase ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code || formData.code.length !== 3) {
      newErrors.code = 'Le code devise doit contenir 3 caractères';
    }

    if (!formData.name) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.symbol) {
      newErrors.symbol = 'Le symbole est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      if (formData._id) {
        // Mise à jour
        await dispatch(
          updateCurrency({
            id: formData._id,
            currency: formData,
          })
        ).unwrap();
      } else {
        
        const { _id, ...cleanData } = formData;
        // @ts-expect-error - compat: external lib types mismatch
        await dispatch(addCurrency(cleanData)).unwrap();
      }

      if (formData.isBase) {
        await dispatch(setBaseCurrency(formData._id));
      }

      toast.current?.show({
        severity: 'success',
        summary: 'Succès',
        detail: `Devise ${formData._id ? 'mise à jour' : 'créée'} avec succès`,
        life: 3000,
      });

      setTimeout(onSuccess, 500);
    } catch (error: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: error.message || 'Erreur lors de la sauvegarde',
        life: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Currency, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Effacer l'erreur lorsqu'on modifie le champ
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="currency-form">
      <Toast ref={toast} position="top-right" />

      <div className="p-fluid grid">
        <div className="field col-12 md:col-6">
          <label>Code devise* (ISO 4217)</label>
          <InputText
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
            className={`w-full ${errors.code ? 'p-invalid' : ''}`}
            maxLength={3}
            disabled={!!formData._id}
          />
          {errors.code && <small className="p-error">{errors.code}</small>}
        </div>

        <div className="field col-12 md:col-6">
          <label>Nom*</label>
          <InputText
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full ${errors.name ? 'p-invalid' : ''}`}
          />
          {errors.name && <small className="p-error">{errors.name}</small>}
        </div>

        <div className="field col-12 md:col-4">
          <label>Symbole*</label>
          <InputText
            value={formData.symbol}
            onChange={(e) => handleChange('symbol', e.target.value)}
            className={`w-full ${errors.symbol ? 'p-invalid' : ''}`}
          />
          {errors.symbol && <small className="p-error">{errors.symbol}</small>}
        </div>

        <div className="field col-12 md:col-8 flex align-items-center">
          <Checkbox
            inputId="isBase"
            // @ts-expect-error - compat: external lib types mismatch
            checked={formData.isBase}
            onChange={(e) => handleChange('isBase', e.checked)}
            disabled={formData.isBase && !!formData._id}
          />
          <label htmlFor="isBase" className="ml-2">
            Devise de base
          </label>
          {formData.isBase && (
            <small className="ml-2 text-500">
              (toutes les conversions se font par rapport à cette devise)
            </small>
          )}
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
        .currency-form :global(.p-invalid) {
          border-color: #e24c4c;
        }
      `}</style>
    </div>
  );
};

export { CurrencyForm };
