/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';
// components/finance/FinancialDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { BreadCrumb } from 'primereact/breadcrumb';
import { Toast } from 'primereact/toast';
import CurrencyManager from '@/components/finances/currencyManager';
import { ExchangeRatesPanel } from './exchangeRatesPanel';
import { DiscountCenter } from './discountCenter';
import FinancialSettingsForm from '@/components/finances/fincancesComponent';

//importDiscountCenter, { CurrencyManager, ExchangeRatesPanel, FinancialSettingsForm } from '@/components/finances/fincancesComponent';

const Page = () => {
  const [activeTab, setActiveTab] = useState(0);
  const toast = React.useRef<Toast>(null);
  interface FinancialSettings {
    // Add properties according to your settings data structure
    currency: string;
    fiscalYear: string;
    [key: string]: unknown;
  }

  const [settings, setSettings] = useState<FinancialSettings | null>(null);
 
  const [currencies, setCurrencies] = useState<any[]>([]);

  useEffect(() => {
    // Charger les paramètres financiers et les devises
    const fetchData = async () => {
      const settingsRes = await fetch('http://localhost:8000/finance/settings').then((resp) => {
        console.log('Settings response:', resp);
        return resp;
      });
      const currenciesRes = await fetch('http://localhost:8000/finance/currencies').then((resp) => {
        console.log('Currencies response:', resp);
        return resp;
      });
      const settingsData = await settingsRes.json();
      const currenciesData = await currenciesRes.json();

      setSettings(settingsData);
      setCurrencies(currenciesData);
    };

    fetchData();
  }, []);
  console.log('currencies : ', currencies);
  return (
    <div className="min-h-screen text-xs m-3">
      <Toast ref={toast} />
      <div className="flex items-center justify-between mb-3">
        <BreadCrumb
          model={[{ label: 'Accueil', url: '/' }, { label: 'Devise' }]}
          home={{ icon: 'pi pi-home', url: '/' }}
          className="bg-none"
        />
        <h1 className="font-bold text-gray-500 text-[14px]">Gestion des devises</h1>
      </div>

      <div className="w-full ">
        <Card title="Tableau de Bord Financier" className="w-full p-5">
          <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
            <TabPanel
              header={
                <span>
                  <i className="pi pi-wallet mr-2" /> Devises
                </span>
              }
             
            >
              <CurrencyManager
                // @ts-expect-error - compat: external lib types mismatch
                currencies={currencies}
              />
            </TabPanel>
            <TabPanel
              header={
                <span>
                  <i className="pi pi-sync mr-2" /> Taux de Change
                </span>
              }
            >
              <ExchangeRatesPanel
                // @ts-expect-error - compat: external lib types mismatch
                currencies={currencies}
              />
            </TabPanel>
            <TabPanel
              header={
                <span>
                  <i className="pi pi-percentage mr-2" /> Réductions
                </span>
              }
            >
              <DiscountCenter />
            </TabPanel>
            <TabPanel
              header={
                <span>
                  <i className="pi pi-cog mr-2" /> Paramètres
                </span>
              }
            >
              {settings && (
                <FinancialSettingsForm
                  // @ts-expect-error - compat: external lib types mismatch
                  settings={settings}
                  currencies={currencies}
                />
              )}
            </TabPanel>
          </TabView>
        </Card>
      </div>
    </div>
  );
};

export default Page;
