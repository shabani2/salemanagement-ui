/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';

import { AppDispatch, RootState } from '@/stores/store';
import {
  ExchangeRate,
  fetchExchangeRates,
  selectAllExchangeRates,
} from '@/stores/slices/finances/exchangeRateSlice';
import {
  CurrencyDTO,
  fetchCurrencies,
  selectAllCurrencies,
} from '@/stores/slices/finances/currencySlice';

// ⬇️ slices Finance (alignés sur tes routes)

/* ------------------------------- Helpers -------------------------------- */

function formatDateTime(v?: string | Date): string {
  if (!v) return '—';
  try {
    const d = typeof v === 'string' ? new Date(v) : v;
    return d.toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

function getCurrencyCodeLabel(ref: string | CurrencyDTO | undefined, all: CurrencyDTO[]): string {
  if (!ref) return '—';
  if (typeof ref === 'object') return ref.code ?? '—';
  const found = all.find((c) => String(c._id) === String(ref));
  return found?.code ?? '—';
}

function getCurrencyBadge(ref: string | CurrencyDTO | undefined, all: CurrencyDTO[]) {
  const code = getCurrencyCodeLabel(ref, all);
  return <Tag value={code || '—'} severity="info" />;
}

/* ============================ Component ================================== */

export const ExchangeRatesPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  // Redux state
  const rates = useSelector((s: RootState) => selectAllExchangeRates(s)) as ExchangeRate[];
  const status = useSelector(selectAllExchangeRates);
  const error = useSelector(selectAllExchangeRates);
  const currencies = useSelector((s: RootState) => selectAllCurrencies(s)) as CurrencyDTO[];

  // Filters (alignés avec GET /finance/exchange-rates?baseCurrency=&targetCurrency=&active=)
  const [baseFilter, setBaseFilter] = useState<string | null>(null);
  const [targetFilter, setTargetFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  //@ts-ignore
  const loading = status === 'loading';

  // Initial load
  useEffect(() => {
    dispatch(fetchExchangeRates({}));
    if (!currencies?.length) dispatch(fetchCurrencies());
  }, [dispatch]);

  // Error toast
  useEffect(() => {
    //@ts-ignore
    if (status === 'failed' && error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        //@ts-ignore
        detail: error,
        life: 3500,
      });
    }
  }, [status, error]);

  const applyFilters = useCallback(() => {
    dispatch(
      fetchExchangeRates({
        baseCurrency: baseFilter ?? undefined,
        targetCurrency: targetFilter ?? undefined,
        active: activeFilter ?? undefined,
      })
    );
  }, [dispatch, baseFilter, targetFilter, activeFilter]);

  const resetFilters = useCallback(() => {
    setBaseFilter(null);
    setTargetFilter(null);
    setActiveFilter(null);
    dispatch(fetchExchangeRates({}));
  }, [dispatch]);

  const currencyOptions = useMemo(
    () =>
      (currencies ?? []).map((c) => ({
        label: `${c.code}${c.symbol ? ` (${c.symbol})` : ''}`,
        value: String(c._id),
      })),
    [currencies]
  );

  const activeOptions = [
    { label: 'Actifs uniquement', value: true },
    { label: 'Tous (y compris expirés)', value: null },
  ];

  return (
    <div className="exchange-rates-panel">
      <Toast ref={toast} position="top-right" />

      <Card
        title="Taux de change"
        subTitle="Liste des taux (lecture seule, selon routes exposées)"
        className="shadow-2 mb-3"
      >
        {/* Filtres */}
        <div className="p-fluid grid mb-3">
          <div className="field col-12 md:col-4">
            <label>Devise source</label>
            <Dropdown
              value={baseFilter}
              options={currencyOptions}
              onChange={(e) => setBaseFilter(e.value)}
              placeholder="Toutes"
              filter
              showClear
              className="w-full"
            />
          </div>

          <div className="field col-12 md:col-4">
            <label>Devise cible</label>
            <Dropdown
              value={targetFilter}
              options={currencyOptions}
              onChange={(e) => setTargetFilter(e.value)}
              placeholder="Toutes"
              filter
              showClear
              className="w-full"
            />
          </div>

          <div className="field col-12 md:col-4">
            <label>État</label>
            <Dropdown
              value={activeFilter}
              options={activeOptions}
              onChange={(e) => setActiveFilter(e.value)}
              placeholder="Tous"
              className="w-full"
            />
          </div>

          <div className="field col-12 flex gap-2 justify-content-end">
            <Button
              label="Filtrer"
              icon="pi pi-filter"
              onClick={applyFilters}
              className="p-button-success"
              disabled={loading}
            />
            <Button
              label="Réinitialiser"
              icon="pi pi-refresh"
              onClick={resetFilters}
              className="p-button-secondary"
              disabled={loading}
            />
          </div>
        </div>

        {/* Tableau */}
        <DataTable
          value={rates ?? []}
          loading={loading}
          paginator
          rows={10}
          emptyMessage="Aucun taux de change"
          className="p-datatable-sm"
          scrollable
          scrollHeight="60vh"
        >
          <Column
            header="Source"
            body={(row: ExchangeRate) => getCurrencyBadge(row.baseCurrency as any, currencies)}
          />
          <Column
            header="Cible"
            body={(row: ExchangeRate) => getCurrencyBadge(row.targetCurrency as any, currencies)}
          />
          <Column
            header="Taux"
            body={(row: ExchangeRate) => {
              const n = Number(row?.rate ?? 0);
              return <span className="font-semibold">{isFinite(n) ? n.toFixed(6) : '—'}</span>;
            }}
            style={{ textAlign: 'right', minWidth: 120 }}
          />
          <Column
            header="Date d'effet"
            body={(row: ExchangeRate) => formatDateTime(row?.effectiveDate)}
            style={{ minWidth: 160 }}
          />
          <Column
            header="Expire le"
            body={(row: ExchangeRate) => formatDateTime((row as any)?.expirationDate)}
            style={{ minWidth: 160 }}
          />
          {/* Pas d'actions (routes GET uniquement) */}
        </DataTable>

        <div className="mt-3 text-600 text-sm">
          <i className="pi pi-info-circle mr-2" />
          Les routes actuelles n’exposent que <strong>GET</strong> (liste/paire). Les actions
          d’ajout/suppression sont désactivées. Ajoute des routes POST/DELETE si tu veux gérer ça
          ici.
        </div>
      </Card>

      <style jsx>{`
        .exchange-rates-panel :global(.p-card) {
          border-radius: 14px;
        }
      `}</style>
    </div>
  );
};
