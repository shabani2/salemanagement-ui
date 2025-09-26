// file: src/components/users/ChangePasswordDialog.tsx
import React, { useState, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/stores/store';

// 🛑 Thunk fictif, vous devrez le créer dans authSlice ou usersSlice
// export const updatePassword = createAsyncThunk<string, PasswordUpdatePayload, { rejectValue: string }>(...);
// Assumons que le thunk s'appelle updatePassword

interface ChangePasswordDialogProps {
  visible: boolean;
  onHide: () => void;
  userId: string; // L'ID de l'utilisateur concerné
  toast: React.RefObject<Toast>; // Pour afficher les notifications
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  visible,
  onHide,
  userId,
  toast,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Les nouveaux mots de passe ne correspondent pas.',
        life: 3000,
      });
      return;
    }

    if (!currentPassword || newPassword.length < 6) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez remplir tous les champs correctement.',
        life: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      // 🛑 Remplacez ceci par l'appel réel au thunk
      /*
      const result = await dispatch(updatePassword({ 
        userId,
        currentPassword, 
        newPassword 
      }));

      if (updatePassword.fulfilled.match(result)) {
        toast.current?.show({ severity: 'success', summary: 'Succès', detail: 'Mot de passe mis à jour.', life: 2500 });
        onHide();
      } else {
        throw new Error(result.payload || 'Échec de la mise à jour.');
      }
      */

      // Simulation pour l'exemple
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.current?.show({
        severity: 'success',
        summary: 'Succès',
        detail: 'Mot de passe mis à jour (Simulé).',
        life: 2500,
      });
      onHide();
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Erreur',
        //@ts-expect-error --explication
        detail: `Échec: ${error.message || 'Erreur interne'}`,
        life: 3500,
      });
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, onHide, toast, userId, dispatch]);

  return (
    <Dialog
      visible={visible}
      header="Changer le Mot de Passe"
      onHide={onHide}
      style={{ width: '30vw', maxWidth: 500 }}
      modal
      footer={
        <div className="p-2 border-t flex justify-end bg-white">
          <Button
            label="Confirmer le changement"
            className="!bg-indigo-600 text-white"
            onClick={handleSubmit}
            loading={loading}
          />
        </div>
      }
    >
      <div className="px-4 py-2 space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="currentPass">Mot de passe actuel</label>
          <InputText
            id="currentPass"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="newPass">Nouveau mot de passe</label>
          <InputText
            id="newPass"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col space-y-2">
          <label htmlFor="confirmPass">Confirmer nouveau mot de passe</label>
          <InputText
            id="confirmPass"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default ChangePasswordDialog;
