/* eslint-disable @typescript-eslint/no-explicit-any */
// components/ConfirmDeleteDialog.tsx
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

type ConfirmDeleteDialogProps = {
  visible: boolean;
  onHide: () => void;
  onConfirm: (item: any) => void;
  item: any;
  objectLabel?: string;
  displayField?: string;
};

export const ConfirmDeleteDialog = ({
  visible,
  onHide,
  onConfirm,
  item,
  objectLabel = 'cet élément',
  displayField = 'nom',
}: ConfirmDeleteDialogProps) => {
  const getItemLabel = () => {
    if (!item) return objectLabel;
    return item[displayField] || objectLabel;
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header="Confirmer la suppression"
      modal
      style={{ width: '30vw' }}
    >
      <div className="p-4 text-center">
        <p className="text-lg font-medium  text-gray-500">
          Voulez-vous vraiment supprimer{' '}
          <span className="font-bold text-red-600">{getItemLabel()}</span> ?
        </p>
        <div className="flex justify-center gap-3 mt-5">
          <Button label="Annuler" className="p-button-secondary" onClick={onHide} severity={undefined}/>
          <Button label="Supprimer" className="p-button-danger" onClick={() => onConfirm(item)} severity={undefined}/>
        </div>
      </div>
    </Dialog>
  );
};
