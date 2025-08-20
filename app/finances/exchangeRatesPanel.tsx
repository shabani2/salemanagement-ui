/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { useEffect, useRef, useState } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';

import { Currency } from '@/Models/FinanceModel';
import { fetchCurrencies, selectAllCurrencies } from '@/stores/slices/finances/currencySlice';
import { AppDispatch } from '../../stores/store';
import {
  addExchangeRate,
  deleteExchangeRate,
  fetchExchangeRates,
  selectAllExchangeRates,
  selectExchangeRateError,
  selectExchangeRateStatus,
} from '@/stores/slices/finances/exchangeRateSlice';
import { useDispatch, useSelector } from 'react-redux';

export interface ExchangeRate {
  baseCurrency: Currency;
  targetCurrency: Currency;
  rate: number;
  effectiveDate: string | Date;
}

export const ExchangeRatesPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // États Redux
  const rates = useSelector(selectAllExchangeRates);
  const status = useSelector(selectExchangeRateStatus);
  const error = useSelector(selectExchangeRateError);
  const currencies = useSelector(selectAllCurrencies);

  // États locaux pour le formulaire
  const [baseCurrency, setBaseCurrency] = useState<Currency | null>(null);
  const [targetCurrency, setTargetCurrency] = useState<Currency | null>(null);
  const [rateValue, setRateValue] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchExchangeRates());
    }

    if (!currencies.length) {
      dispatch(fetchCurrencies());
    }
  }, [status, currencies.length, dispatch]);

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

  const handleAddRate = async () => {
    if (!baseCurrency || !targetCurrency || !rateValue) {
      showError('Veuillez sélectionner les devises et saisir un taux');
      return;
    }

    setSaving(true);

    try {
      const newRate = {
        baseCurrency: baseCurrency._id,
        targetCurrency: targetCurrency._id,
        rate: rateValue,
        effectiveDate: effectiveDate.toISOString(),
      };
      // @ts-expect-error - compat: external lib types mismatch
      await dispatch(addExchangeRate(newRate)).unwrap();

      setBaseCurrency(null);
      setTargetCurrency(null);
      setRateValue(0);
      setEffectiveDate(new Date());

      showSuccess('Taux de change ajouté avec succès');
    } catch (error: any) {
      showError(error.message || "Erreur lors de l'ajout du taux de change");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    try {
      await dispatch(deleteExchangeRate(id)).unwrap();
      showSuccess('Taux de change supprimé avec succès');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    }
  };

  if (status === 'loading') {
    return (
      <div
        className="flex justify-content-center align-items-center"
        style={{ minHeight: '300px' }}
      >
        <p>Chargement des taux de change...</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-column align-items-center justify-content-center py-5">
        <i className="pi pi-exclamation-triangle text-5xl text-red-500 mb-3"></i>
        <p className="text-red-500">{error}</p>
        <Button
          label="Réessayer"
          icon="pi pi-refresh"
          onClick={() => dispatch(fetchExchangeRates())}
        />
      </div>
    );
  }

  return (
    <div>
      <Toast ref={toast} position="top-right" />

      <div className="p-fluid grid mb-4">
        <div className="field col-12 md:col-3">
          <label>Devise Source*</label>
          <Dropdown
            value={baseCurrency}
            options={currencies}
            optionLabel="code"
            onChange={(e) => setBaseCurrency(e.value)}
            placeholder="Sélectionner"
            filter
            filterBy="code,name"
            showClear
          />
        </div>

        <div className="field col-12 md:col-3">
          <label>Devise Cible*</label>
          <Dropdown
            value={targetCurrency}
            options={currencies}
            optionLabel="code"
            onChange={(e) => setTargetCurrency(e.value)}
            placeholder="Sélectionner"
            filter
            filterBy="code,name"
            showClear
          />
        </div>

        <div className="field col-12 md:col-2">
          <label>Taux*</label>
          <InputNumber
            value={rateValue}
            onValueChange={(e) => setRateValue(e.value || 0)}
            mode="decimal"
            minFractionDigits={4}
            maxFractionDigits={6}
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-3">
          <label>Date Effet*</label>
          <Calendar
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.value as Date)}
            showTime
            dateFormat="dd/mm/yy"
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-1 flex align-items-end">
          <Button
            label={saving ? 'Ajout...' : 'Ajouter'}
            icon="pi pi-plus"
            onClick={handleAddRate}
            disabled={!baseCurrency || !targetCurrency || !rateValue || saving}
            loading={saving}
          />
        </div>
      </div>

      <DataTable value={rates} paginator rows={10} emptyMessage="Aucun taux de change configuré">
        <Column header="Source" body={(data) => data.baseCurrency?.code || 'Inconnu'} />
        <Column header="Cible" body={(data) => data.targetCurrency?.code || 'Inconnu'} />
        <Column
          header="Taux"
          body={(data) => data.rate.toFixed(6)}
          style={{ textAlign: 'right' }}
        />
        <Column
          header="Date Effet"
          body={(data) => new Date(data.effectiveDate).toLocaleString('fr-FR')}
        />
        <Column
          header="Actions"
          body={(rowData) => (
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-danger p-button-text"
              onClick={() => handleDeleteRate(rowData._id)}
              tooltip="Supprimer"
            />
          )}
        />
      </DataTable>
    </div>
  );
};
