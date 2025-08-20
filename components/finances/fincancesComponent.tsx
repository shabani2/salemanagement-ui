/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/finance/FinancialSettingsForm.tsx
import { Button } from 'primereact/button';
import { useEffect, useRef, useState } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';

import {
  fetchFinancialSettings,
  updateFinancialSettings,
  selectFinancialSettings,
  selectFinancialSettingsStatus,
  selectFinancialSettingsError,
} from '@/stores/slices/finances/financialSettingsSlice';
import {
  fetchCurrencies,
  selectAllCurrencies,
  selectCurrenciesStatus,
} from '@/stores/slices/finances/currencySlice';
import { AppDispatch } from '@/stores/store';
import { useDispatch, useSelector } from 'react-redux';

interface Currency {
  _id: string;
  code: string;
  name: string;
  symbol: string;
}

interface FinancialSettings {
  _id: string;
  defaultCurrency: Currency | string;
  taxRate: number;
  loyaltyPointsRatio: number;
  invoiceDueDays: number;
  latePaymentFee: number;
}

const FinancialSettingsForm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Récupérer les états depuis le store
  const settings = useSelector(selectFinancialSettings);
  const settingsStatus = useSelector(selectFinancialSettingsStatus);
  const settingsError = useSelector(selectFinancialSettingsError);

  const currencies = useSelector(selectAllCurrencies);
  const currenciesStatus = useSelector(selectCurrenciesStatus);

  const [saving, setSaving] = useState<boolean>(false);

  // État local pour les modifications
  const [localSettings, setLocalSettings] = useState<FinancialSettings | null>(null);

  useEffect(() => {
    // Charger les données nécessaires
    if (settingsStatus === 'idle') {
      dispatch(fetchFinancialSettings());
    }

    if (currenciesStatus === 'idle') {
      dispatch(fetchCurrencies());
    }

    // Initialiser les paramètres locaux quand les données sont chargées
    if (settings && currencies) {
      setLocalSettings({
        ...settings,
        //@ts-ignore
        defaultCurrency:
          currencies.find((c) => c?._id === settings.defaultCurrency) || settings.defaultCurrency,
      });
    }
  }, [settings, currencies, settingsStatus, currenciesStatus, dispatch]);

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

  const handleChange = (field: keyof FinancialSettings, value: Currency | string | number) => {
    if (!localSettings) return;

    setLocalSettings({
      ...localSettings,
      [field]: value,
    });
  };

  const handleSave = async () => {
    if (!localSettings) return;

    setSaving(true);

    try {
      // Préparer les données pour l'envoi
      const data = {
        ...localSettings,
        defaultCurrency:
          typeof localSettings.defaultCurrency === 'object'
            ? localSettings.defaultCurrency._id
            : localSettings.defaultCurrency,
      };

      // Dispatch de l'action Redux pour mettre à jour
      await dispatch(updateFinancialSettings(data)).unwrap();

      showSuccess('Paramètres enregistrés avec succès');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setSaving(false);
    }
  };

  // Calculer l'état de chargement global
  const loading = settingsStatus === 'loading' || currenciesStatus === 'loading';

  if (loading) {
    return (
      <Card title="Paramètres Financiers">
        <p>Chargement des paramètres...</p>
      </Card>
    );
  }

  if (settingsError || !localSettings) {
    return (
      <Card title="Paramètres Financiers">
        <p className="text-red-500">{settingsError || 'Impossible de charger les paramètres'}</p>
        <Button
          label="Réessayer"
          icon="pi pi-refresh"
          onClick={() => {
            dispatch(fetchFinancialSettings());
            dispatch(fetchCurrencies());
          }}
        />
      </Card>
    );
  }

  return (
    <Card title="Paramètres Financiers">
      <Toast ref={toast} />
      <div className="p-fluid grid">
        <div className="field col-12 md:col-6">
          <label>Devise Principale</label>
          <Dropdown
            value={localSettings.defaultCurrency}
            options={currencies}
            optionLabel="code"
            onChange={(e) => handleChange('defaultCurrency', e.value)}
            placeholder="Sélectionner une devise"
            filter
            filterBy="code,name"
            itemTemplate={(option) => (
              <div>
                {option.code} - {option.name}
              </div>
            )}
            valueTemplate={(option) => <div>{option?.code || 'Non sélectionné'}</div>}
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Taux TVA (%)</label>
          <InputNumber
            value={localSettings.taxRate}
            onValueChange={(e) => handleChange('taxRate', e.value ?? 0)}
            mode="decimal"
            min={0}
            max={100}
            suffix="%"
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Points Fidélité par Euro</label>
          <InputNumber
            value={localSettings.loyaltyPointsRatio}
            onValueChange={(e) => handleChange('loyaltyPointsRatio', e.value ?? 0)}
            min={0.1}
            max={100}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Délai Paiement Factures (jours)</label>
          <InputNumber
            value={localSettings.invoiceDueDays}
            onValueChange={(e) => handleChange('invoiceDueDays', e.value ?? 0)}
            min={1}
            max={365}
            className="w-full"
          />
        </div>

        <div className="field col-12 md:col-6">
          <label>Frais de Retard (%)</label>
          <InputNumber
            value={localSettings.latePaymentFee}
            onValueChange={(e) => handleChange('latePaymentFee', e.value ?? 0)}
            mode="decimal"
            min={0}
            max={100}
            suffix="%"
            className="w-full"
          />
        </div>

        <div className="col-12 flex justify-content-end mt-4">
          <Button
            label="Enregistrer les Paramètres"
            icon="pi pi-save"
            onClick={handleSave}
            loading={saving}
          />
        </div>
      </div>
    </Card>
  );
};

export default FinancialSettingsForm;
