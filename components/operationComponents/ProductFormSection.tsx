/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { Controller } from 'react-hook-form';

import { classNames } from 'primereact/utils';
import { Produit, Categorie } from '@/Models/produitsType';
import { PointVente } from '@/Models/pointVenteType';
import { User } from '@/Models/UserType';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';

interface ProductFormValues {
  type?: string;
  depotCentral?: boolean;
  pointVente?: string;
  formulaire?: {
    categorie?: string;
    produit?: string;
    quantite?: number;
  };
}

interface ProductFormProps {
  control: import('react-hook-form').Control<ProductFormValues>;
  errors: any;
  watch: (names?: string | string[]) => any;
  setValue: any;
  trigger: any;
  getValues: any;
  resetField: any;
  clearErrors: any;
  unregister: any;
  filteredTypeOptions: any[];
  categories: Categorie[];
  filteredProduits: Produit[];
  validateStock: (value: number) => Promise<string | true>;
  append: (data: ProductFormValues['formulaire']) => void;
  update: (index: number, data: ProductFormValues['formulaire']) => void;
  editingIndex: number | null;
  setEditingIndex: (index: number | null) => void;
  pointsVente: PointVente[];
  isPointVenteLocked: boolean;
  setSelectedType: (type: string) => void;
  user: User | null;
  register: import('react-hook-form').UseFormRegister<ProductFormValues>;
}

const ProductFormSection = ({
  control,
  errors,
  watch,
  trigger,
  getValues,
  resetField,
  filteredTypeOptions,
  categories,
  filteredProduits,
  validateStock,
  append,
  update,
  editingIndex,
  setEditingIndex,
  pointsVente,
  isPointVenteLocked,
  setSelectedType,
  user,
  register,
}: ProductFormProps) => {
  return (
    <div className="space-y-4 flex-grow">
      {/* Type d'opération */}
      <div>
        <Controller
          name="type"
          control={control}
          rules={{ required: 'Type est requis' }}
          render={({ field }) => (
            <Dropdown
              {...field}
              options={filteredTypeOptions}
              onChange={(e) => {
                field.onChange(e.value);
                setSelectedType(e.value);
              }}
              placeholder="Sélectionner un type"
              className={classNames('w-full', { 'p-invalid': !!errors.type })}
            />
          )}
        />
        {errors.type && <small className="text-red-700">{errors.type.message}</small>}
      </div>

      {/* Gestion dépôt central */}
      {watch('type') === 'Entrée' && (
        <div>
          {user&&user?.role === 'SuperAdmin' ? (
            <>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('depotCentral')} disabled={!watch('type')} />
                Dépôt central
              </label>
              {errors.depotCentral && (
                <small className="text-red-700">{errors.depotCentral.message}</small>
              )}
            </>
          ) :user&& user?.role === 'AdminRegion' ? (
            <div className="flex items-center gap-2 font-bold text-gray-800 bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
              <i className="pi pi-building text-blue-600" />
              <span>
                Dépôt régional -{' '}
                {typeof user?.region === 'object' && user?.region !== null && 'nom' in user.region
                  ? (user.region as { nom: string }).nom
                  : 'Région non définie'}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Point de vente */}
      {watch('type') && watch('type') !== 'Entrée' && (
        <div>
          <label>Point de vente</label>
          <Controller
            name="pointVente"
            control={control}
            rules={{
              required:
                watch('type') && watch('type') !== 'Entrée' ? 'Point de vente est requis' : false,
            }}
            render={({ field }) => (
              <Dropdown
                {...field}
                value={field.value}
                options={pointsVente}
                optionLabel="nom"
                onChange={(e) => field.onChange(e.value)}
                placeholder="Sélectionner un point de vente"
                className="w-full"
                disabled={!watch('type') || isPointVenteLocked}
              />
            )}
          />
          {errors.pointVente && (
            <small className="text-red-700">{errors.pointVente.message || 'Champ requis'}</small>
          )}
        </div>
      )}

      {/* Sélection produit */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 items-end">
          <div>
            <label>Catégorie</label>
            <Controller
              name="formulaire.categorie"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={categories.map((cat: Categorie) => ({
                    label: cat.nom,
                    value: cat._id,
                  }))}
                  onChange={(e) => field.onChange(e.value)}
                  placeholder="Choisir une catégorie"
                  className="w-full"
                  disabled={!watch('type')}
                />
              )}
            />
          </div>

          <div>
            <label>Produit</label>
            <Controller
              name="formulaire.produit"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={filteredProduits.map((p) => ({
                    label: p.nom,
                    value: p._id,
                  }))}
                  placeholder="Choisir un produit"
                  className="w-full"
                  onChange={(e) => field.onChange(e.value)}
                />
              )}
            />
            {errors.formulaire?.produit && (
              <small className="text-red-700">{errors.formulaire.produit.message}</small>
            )}
          </div>

          <div>
            <label>Quantité</label>
            <Controller
              name="formulaire.quantite"
              control={control}
              render={({ field }) => (
                <InputText
                  type="number"
                  value={
                    field.value !== undefined && field.value !== null ? String(field.value) : ''
                  }
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={`w-full ${errors.formulaire?.quantite ? 'p-invalid' : ''}`}
                />
              )}
            />
            {errors.formulaire?.quantite && (
              <small className="text-red-700">
                {errors.formulaire.quantite.message || 'Quantité requise'}
              </small>
            )}
          </div>
        </div>

        {/* Bouton Ajouter/Modifier */}
        <div className="flex">
          <Button
            type="button"
            className="!bg-green-700 w-full p-2"
            icon={editingIndex !== null ? 'pi pi-check' : 'pi pi-plus'}
            label={editingIndex !== null ? 'Modifier Produit' : 'Ajouter Produit'}
            onClick={async () => {
              const isValid = await trigger([
                'formulaire.categorie',
                'formulaire.produit',
                'formulaire.quantite',
              ]);
              if (!isValid) return;

              const quantite = getValues('formulaire.quantite');
              const stockValidation = await validateStock(quantite);
              if (stockValidation !== true) {
                // Gérer l'erreur de stock
                return;
              }

              const formData = getValues('formulaire');
              if (editingIndex !== null) {
                update(editingIndex, formData);
                setEditingIndex(null);
              } else {
                append(formData);
              }
              resetField('formulaire');
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductFormSection;
