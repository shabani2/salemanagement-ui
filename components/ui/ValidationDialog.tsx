/* eslint-disable @typescript-eslint/no-explicit-any */
// components/ConfirmDeleteDialog.tsx
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

type ValidationDialogProps = {
  visible: boolean;
  onHide: () => void;
  onConfirm: (item: any) => void;
  item: any;
  objectLabel?: string;
  displayField?: string;
};

export const ValidationDialog = ({
  visible,
  onHide,
  onConfirm,
  item,
  objectLabel = 'cet élément',
  displayField = 'nom',
}: ValidationDialogProps) => {
  const getItemLabel = () => {
    if (!item) return objectLabel;
    return item[displayField] || objectLabel;
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header="Confirmer la validation"
      modal
      style={{ width: '30vw' }}
    >
      <div className="p-4 text-center">
        <p className="text-lg font-medium text-gray-700">
          Voulez-vous vraiment valider{' '}
          <span className="font-bold text-red-600">{getItemLabel()}</span> ?
        </p>
        <div className="flex justify-center gap-3 mt-5">
          <Button label="Annuler" className="p-button-secondary" onClick={onHide} />
          <Button label="valider" className="p-button-success" onClick={() => onConfirm(item)} />
        </div>
      </div>
    </Dialog>
  );
};
