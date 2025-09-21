/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/finance/CurrencyManager.tsx

'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';

import { AppDispatch, RootState } from '@/stores/store';

// ✅ bons imports (dossier "finance", pas "finances")
import {
  fetchCurrencies,
  fetchBaseCurrency,
  addCurrency,
  selectAllCurrencies,
  selectCurrenciesStatus,
  selectCurrenciesError,
  selectBaseCurrency,
} from '@/stores/slices/finances/currencySlice';
import type { Currency as CurrencyDTO } from '@/stores/slices/finances/currencySlice';

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

const CurrencyManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Store
  const currencies = useSelector((s: RootState) => selectAllCurrencies(s)) as CurrencyDTO[];
  const status = useSelector(selectCurrenciesStatus) as Status;
  const error = useSelector(selectCurrenciesError) as string | null;
  const base = useSelector(selectBaseCurrency) as CurrencyDTO | null;

  // UI
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyDTO | null>(null);
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [q, setQ] = useState<string>('');

  // Init load
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCurrencies());
      dispatch(fetchBaseCurrency());
    }
  }, [status, dispatch]);

  // Error toast
  useEffect(() => {
    if (status === 'failed' && error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: error,
        life: 3500,
      });
    }
  }, [status, error]);

  const filterList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return currencies ?? [];
    return (currencies ?? []).filter((c) => {
      const code = (c.code ?? '').toLowerCase();
      const name = (c.name ?? '').toLowerCase();
      const symbol = (c.symbol ?? '').toLowerCase();
      return code.includes(needle) || name.includes(needle) || symbol.includes(needle);
    });
  }, [currencies, q]);

  /* --------------------------- RENDER HELPERS --------------------------- */

  const baseCurrencyTemplate = (row: CurrencyDTO) =>
    row?.isBase ? (
      <span className="flex items-center gap-2">
        <i className="pi pi-star-fill text-yellow-500" />
        <span>Devise de base</span>
      </span>
    ) : (
      <span className="text-500">—</span>
    );

  const actionTemplate = (row: CurrencyDTO) => (
    <div className="flex gap-1">
      {/* Pas d'API PUT/DELETE => on propose de dupliquer */}
      <Button
        icon="pi pi-copy"
        className="p-button-rounded p-button-text p-button-info"
        tooltip="Dupliquer"
        tooltipOptions={{ position: 'top' }}
        onClick={() => {
          setSelectedCurrency(row);
          setDialogVisible(true);
          toast.current?.show({
            severity: 'info',
            summary: 'Info',
            detail: "Pas d'édition côté API : on va créer une copie.",
            life: 2500,
          });
        }}
      />
      <Button
        icon="pi pi-pencil"
        className="p-button-rounded p-button-text p-button-secondary"
        disabled
        tooltip="Modifier (non disponible)"
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
  );

  /* ------------------------------ STATES UI ----------------------------- */

  const renderTable = () => {
    if (status === 'loading') {
      return (
        <div className="flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
          <ProgressSpinner />
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="flex flex-column justify-content-center align-items-center py-5">
          <i className="pi pi-exclamation-triangle text-5xl text-red-500 mb-3" />
          <p className="text-red-500">{error ?? 'Erreur de chargement'}</p>
          <Button
            label="Réessayer"
            icon="pi pi-refresh"
            className="mt-3"
            onClick={() => {
              dispatch(fetchCurrencies());
              dispatch(fetchBaseCurrency());
            }}
          />
        </div>
      );
    }

    if (!filterList.length) {
      return (
        <div className="flex flex-column justify-content-center align-items-center py-5">
          <i className="pi pi-inbox text-5xl text-500 mb-3" />
          <p>Aucune devise {q ? 'correspondante' : 'configurée'}</p>
          {!q && (
            <Button
              label="Ajouter une devise"
              icon="pi pi-plus"
              className="mt-3 p-button-success"
              onClick={() => {
                setSelectedCurrency(null);
                setDialogVisible(true);
              }}
              //@ts-ignore
              disabled={status === 'loading'}
            />
          )}
        </div>
      );
    }

    return (
      <DataTable
        value={filterList}
        paginator
        rows={10}
        emptyMessage="Aucune devise"
        className="p-datatable-sm"
        scrollable
        scrollHeight="60vh"
      >
        <Column field="code" header="Code" sortable />
        <Column field="name" header="Nom" sortable />
        <Column field="symbol" header="Symbole" />
        <Column header="Statut" body={baseCurrencyTemplate} style={{ width: 160 }} />
        <Column header="Actions" body={actionTemplate} style={{ width: 140 }} />
      </DataTable>
    );
  };

  return (
    <div className="currency-manager">
      <Toast ref={toast} position="top-right" />

      <Card
        title={
          <div className="flex items-center justify-between">
            <span>Gestion des Devises</span>
            <span className="text-sm text-gray-600">
              Devise de base:&nbsp;
              <Tag
                value={base?.code ? `${base.code}${base.symbol ? ` (${base.symbol})` : ''}` : '—'}
                severity="info"
              />
            </span>
          </div>
        }
        className="shadow-2"
      >
        <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
          <p className="m-0 text-gray-600">
            Gérez les devises disponibles. Les routes actuelles autorisent la <b>création</b> et la{' '}
            <b>lecture</b>.
          </p>
          <div className="flex gap-2">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (code, nom, symbole)"
              />
            </span>
            <Button
              label="Ajouter"
              icon="pi pi-plus"
              className="p-button-success"
              onClick={() => {
                setSelectedCurrency(null);
                setDialogVisible(true);
              }}
              disabled={status === 'loading'}
            />
          </div>
        </div>

        {renderTable()}
      </Card>

      {/* Dialog création / duplication */}
      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={selectedCurrency ? 'Dupliquer une devise' : 'Créer une nouvelle devise'}
        style={{ width: '40vw' }}
        className="currency-dialog"
        draggable={false}
        resizable={false}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
      >
        <CurrencyForm
          initial={selectedCurrency ?? undefined}
          onClose={() => setDialogVisible(false)}
          onSaved={() => {
            setDialogVisible(false);
            dispatch(fetchCurrencies());
            dispatch(fetchBaseCurrency());
          }}
        />
      </Dialog>

      <style jsx>{`
        .currency-manager :global(.currency-dialog .p-dialog-content) {
          padding: 0 1.25rem 1.5rem;
        }
        .currency-manager :global(.p-card) {
          border-radius: 14px;
        }
      `}</style>
    </div>
  );
};

export default CurrencyManager;

/* ============================== CurrencyForm ============================== */

function CurrencyForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CurrencyDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);
  const [saving, setSaving] = useState(false);

  // si "duplication", on ne reprend PAS l'_id
  const [form, setForm] = useState<CurrencyDTO>({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    symbol: initial?.symbol ?? '',
    isBase: initial?.isBase ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (k: keyof CurrencyDTO, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[k];
        return n;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const code = (form.code ?? '').trim().toUpperCase();
    if (code.length !== 3) e.code = 'Le code devise (ISO 4217) doit contenir 3 lettres';
    if (!(form.name ?? '').trim()) e.name = 'Le nom est requis';
    if (!(form.symbol ?? '').trim()) e.symbol = 'Le symbole est requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CurrencyDTO = {
        code: (form.code ?? '').toUpperCase(),
        name: (form.name ?? '').trim(),
        symbol: (form.symbol ?? '').trim(),
        isBase: !!form.isBase,
      };

      const res = await dispatch(addCurrency(payload) as any);
      if ((addCurrency as any).fulfilled.match(res)) {
        toast.current?.show({
          severity: 'success',
          summary: 'Succès',
          detail: 'Devise créée',
          life: 2500,
        });
        onSaved();
      } else {
        throw new Error((res?.payload as string) ?? 'Échec de la création');
      }
    } catch (e: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: e?.message ?? 'Erreur lors de la sauvegarde',
        life: 4500,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="currency-form">
      <Toast ref={toast} position="top-right" />
      <div className="p-fluid grid">
        <div className="field col-12 md:col-4">
          <label>Code* (ISO 4217)</label>
          <InputText
            value={form.code ?? ''}
            onChange={(e) => setField('code', (e.target.value ?? '').toUpperCase())}
            className={`w-full ${errors.code ? 'p-invalid' : ''}`}
            maxLength={3}
            placeholder="Ex: USD"
          />
          {errors.code && <small className="p-error">{errors.code}</small>}
        </div>

        <div className="field col-12 md:col-5">
          <label>Nom*</label>
          <InputText
            value={form.name ?? ''}
            onChange={(e) => setField('name', e.target.value)}
            className={`w-full ${errors.name ? 'p-invalid' : ''}`}
            placeholder="Ex: US Dollar"
          />
          {errors.name && <small className="p-error">{errors.name}</small>}
        </div>

        <div className="field col-12 md:col-3">
          <label>Symbole*</label>
          <InputText
            value={form.symbol ?? ''}
            onChange={(e) => setField('symbol', e.target.value)}
            className={`w-full ${errors.symbol ? 'p-invalid' : ''}`}
            placeholder="Ex: $"
          />
          {errors.symbol && <small className="p-error">{errors.symbol}</small>}
        </div>

        <div className="field col-12 md:col-12">
          <div className="flex items-center">
            <Checkbox
              inputId="isBase"
              checked={!!form.isBase}
              onChange={(e) => setField('isBase', !!e.checked)}
            />
            <label htmlFor="isBase" className="ml-2">
              Définir comme devise de base
            </label>
            <small className="ml-2 text-500">
              (Sans route PUT, changer la devise de base existante nécessitera une MAJ API)
            </small>
          </div>
        </div>

        <div className="col-12 flex justify-content-end gap-2 mt-3">
          <Button
            label="Annuler"
            icon="pi pi-times"
            className="p-button-secondary"
            onClick={onClose}
            disabled={saving}
          />
          <Button
            label={saving ? 'Enregistrement...' : initial ? 'Dupliquer' : 'Créer'}
            icon="pi pi-check"
            onClick={handleSubmit}
            loading={saving}
            disabled={saving}
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
}
