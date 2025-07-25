/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';

import { Produit } from '@/Models/produitsType';
import { PointVente } from '@/Models/pointVenteType';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

interface RecapFormData {
  montantRecu: number;
  // Ajoutez d'autres champs ici si nécessaire
}

interface RecapPanelProps {
  type: string;
  pointVente: PointVente | undefined;
  watchProduits: { produit: string; quantite: number }[];
  allProduits: Produit[];
  totalMontant: number;
  selectedType: string;
  onSubmit: (data: unknown) => Promise<void>;
  handleSubmit: (callback: (data: unknown) => void) => (e?: React.BaseSyntheticEvent) => void;
  reste: number;
  netAPayer: number;
  montantFranc: number;
  register: import('react-hook-form').UseFormRegister<RecapFormData>;
  montantRecu: number;
  setValue: import('react-hook-form').UseFormSetValue<RecapFormData>;
}

const RecapPanel = ({
  type,
  pointVente,
  watchProduits,
  allProduits,
  totalMontant,
  selectedType,
  onSubmit,
  handleSubmit,
  reste,
  register,
}: RecapPanelProps) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl w-full md:w-9/12 flex flex-col gap-4">
      <h1 className="font-bold text-gray-800 mb-6 text-[16px]">Récapitulatif</h1>

      <div className="flex flex-col gap-6">
        {type && type !== 'Entrée' && pointVente && (
          <div className="border p-3 rounded-lg bg-gray-50 text-gray-5000">
            <div className="font-semibold">Point de vente sélectionné :</div>
            <div>Nom : {pointVente.nom}</div>
            <div>Adresse : {pointVente.adresse}</div>
            <div>
              Région :{' '}
              {typeof pointVente.region === 'object' && pointVente.region !== null
                ? pointVente.region.nom
                : pointVente.region}
            </div>
            <div>
              Ville :{' '}
              {typeof pointVente.region === 'object' && pointVente.region !== null
                ? pointVente.region.ville
                : '-'}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-gray-5000">Détails par produit</h4>
          <Accordion activeIndex={0}>
            <AccordionTab header="Opérations effectuées">
              <DataTable
                value={watchProduits || []}
                responsiveLayout="scroll"
                size="small"
                rowClassName={(_, options) =>
                  //@ts-ignore
                  options.rowIndex % 2 === 0
                    ? '!bg-gray-300 !text-gray-900'
                    : '!bg-green-900 !text-white'
                }
                className="text-[11px]"
              >
                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                <Column
                  field="produit"
                  header="Produit"
                  body={(rowData) => allProduits.find((p) => p._id === rowData.produit)?.nom || '-'}
                />
                <Column
                  field="quantite"
                  header="Quantité"
                  body={(rowData) => rowData.quantite || '-'}
                />
                <Column
                  header="Prix unitaire"
                  body={(rowData) => {
                    const produit = allProduits.find((p) => p._id === rowData.produit);
                    return produit ? `${produit.prix} FC` : '-';
                  }}
                />
                <Column
                  header="Montant"
                  body={(rowData) => {
                    const produit = allProduits.find((p) => p._id === rowData.produit);
                    if (!produit) return '-';
                    return `${(rowData.quantite || 0) * produit.prix} FC`;
                  }}
                />
                {/* Autres colonnes... */}
              </DataTable>
            </AccordionTab>
          </Accordion>
        </div>

        <div className="text-right font-semibold text-gray-800">
          Total : {totalMontant.toFixed(2)} FC
        </div>

        <div className="space-y-6">
          {type && type !== 'Livraison' && type !== 'Entrée' && type !== 'Commande' && (
            <>
              <div className="text-right font-bold text-green-700">
                {selectedType === 'Vente' && <>Montant à payer : {totalMontant.toFixed(2)} FC</>}
              </div>

              <div className="space-y-4 flex gap-2">
                <div className="w-1/2">
                  <label className="block font-medium text-gray-5000">Montant reçu en franc</label>
                  <InputText type="number" {...register('montantRecu')} className="w-full" />
                </div>

                <div className="w-1/2">
                  <label className="block font-medium text-gray-5000">Reste / à retourner</label>
                  <div className="w-full border rounded-md p-3 text-right text-gray-100 bg-gray-500">
                    {reste} FC
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t mt-4">
            <Button
              className="mt-4 !bg-green-700"
              label="Valider l'opération"
              icon="pi pi-check"
              onClick={handleSubmit(onSubmit)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecapPanel;
