import { Divider } from 'primereact/divider';
import { InputText } from 'primereact/inputtext';
import React from 'react';

interface RatePanelProps {
  watch: (field: string) => unknown;
  setValue: (field: string, value: unknown) => void;
  register: (name: string) => Record<string, unknown>;
  valeurRabais: number;
  valeurRemise: number;
  montantFranc: number;
}

const RatePanel = ({
  watch,
  setValue,
  register,
  valeurRabais,
  valeurRemise,
  montantFranc,
}: RatePanelProps) => {
  return (
    <div className="space-y-4 w-full flex-shrink-0 md:w-1/12 bg-white p-4 rounded-lg shadow-md">
      <div className="gap-2">
        <div>
          <label className="block font-medium mb-1 text-gray-5000 font-bold">Taux dollar</label>
          <InputText
            type="number"
            value={String(watch('tauxDollar') || '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value !== '' && !isNaN(Number(value))) {
                setValue('tauxDollar', Number(value));
                localStorage.setItem('tauxDollar', value);
              }
            }}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-gray-5000 font-bold">Taux en franc</label>
          <InputText
            type="number"
            value={String(watch('tauxFranc') || '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value !== '' && !isNaN(Number(value))) {
                setValue('tauxFranc', Number(value));
                localStorage.setItem('tauxFranc', value);
              }
            }}
            className="w-full"
          />
        </div>
      </div>

      <div className="md:flex-nowrap gap-4 w-full">
        <div className="w-full min-w-0">
          <label className="block font-medium text-gray-5000 font-bold">Montant reçu en $</label>
          <InputText type="number" {...register('montantDollar')} className="w-full" />
        </div>

        <div className="w-full min-w-0">
          <label className="block font-medium text-gray-5000 font-bold">Montant converti</label>
          <div className="w-full border rounded-md p-3 text-white bg-gray-500">
            {montantFranc} FC
          </div>
        </div>
      </div>

      <div className="gap-2 w-full">
        <h3 className="text-gray-5000 font-bold">Zones de Reduction</h3>
        <Divider layout="horizontal" className="mb-2" />
        <div className="gap-4">
          <div>
            <label className="block font-medium text-gray-5000 font-bold">Rabais (%)</label>
            <InputText type="number" {...register('rabais')} className="w-full" />
          </div>
          <div>
            <label className="block font-medium text-gray-5000 font-bold">Remise (%)</label>
            <InputText type="number" {...register('remise')} className="w-full" />
          </div>
          <div>
            <label className="block font-medium text-gray-5000 font-bold">Valeur rabais</label>
            <div className="w-full border rounded-md p-2 text-right bg-gray-500 text-gray-100">
              {valeurRabais.toFixed(2)} FC
            </div>
          </div>
          <div>
            <label className="block font-medium text-gray-5000 font-bold">Valeur remise</label>
            <div className="w-full border rounded-md p-2 text-right bg-gray-500 text-gray-100">
              {valeurRemise.toFixed(2)} FC
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatePanel;
