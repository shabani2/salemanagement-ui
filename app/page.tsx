/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import PrivilegiesDashboard from '@/components/dashboards/Privilegies/PrivilegiesDashboard';
import VendeurDashboard from '@/components/dashboards/VendeurDashboard';
import AdminPointVenteDashboard from '@/components/dashboards/AdminPointVenteDashboard';
import NotDefined from './NotDifined';
import GerantDashboard from '@/components/dashboards/GerantDashboard';

import { Dialog } from 'primereact/dialog';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';

import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/stores/store';
import { resetPassword, updateFirstPassword } from '@/stores/slices/auth/authSlice';

type AnyUser = {
  _id?: string;
  role?: string;
  firstConnection?: boolean;
  [k: string]: unknown;
};

const isNonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;

const sanitize = (s: string) => s.replace(/\s+/g, ''); // enlève espaces blancs

export default function Page() {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useRef<Toast>(null);

  const [user, setUser] = useState<AnyUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('user-agricap') || 'null');
    } catch {
      return null;
    }
  });

  const [showPwdModal, setShowPwdModal] = useState<boolean>(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  // ⬇️ récupère id & token depuis l’URL
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const id = sp.get('id');
      const token = sp.get('token');
      if (id) setResetId(id);
      if (token) setResetToken(token);
    }
  }, []);

  useEffect(() => {
    if (user?.firstConnection === true) {
      setShowPwdModal(true);
    }
  }, [user]);

  const pwdValid = useMemo(() => {
    const a = sanitize(newPwd);
    const b = sanitize(confirmPwd);
    return a.length >= 8 && a === b;
  }, [newPwd, confirmPwd]);

  const submitNewPassword = useCallback(async () => {
    const password = sanitize(newPwd);
    const confirm = sanitize(confirmPwd);

    // 1. Validation de base du mot de passe
    if (!isNonEmpty(password) || password.length < 8 || password !== confirm) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Mot de passe',
        detail: 'Assure-toi d’avoir 8 caractères mini et une confirmation identique.',
        life: 2800,
      });
      return;
    }

    setSaving(true);
    try {
      // 2. Détermination du mode de réinitialisation
      if (user?.firstConnection === true && user._id) {
        // *** MODE 1: Première Connexion (ID déjà stocké localement) ***

        // ⚠️ Utilise le thunk de mise à jour basé sur l'ID local
        await dispatch(updateFirstPassword({ id: user._id, password })).unwrap();
      } else if (resetId && resetToken) {
        // *** MODE 2: Réinitialisation via Lien (ID et Token dans l'URL) ***

        // ✅ Utilise le thunk de réinitialisation basé sur l'URL
        await dispatch(resetPassword({ id: resetId, token: resetToken, password })).unwrap();

        // Nettoyage de l'URL uniquement si on utilise le lien de réinitialisation
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('id');
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        // Cas d'erreur où ni le mode 'firstConnection' ni le lien ne sont valides
        toast.current?.show({
          severity: 'error',
          summary: 'Erreur d’identification',
          detail: 'Les informations de connexion sont insuffisantes pour changer le mot de passe.',
          life: 3500,
        });
        setSaving(false);
        return;
      }

      // 3. Mise à jour locale (commune aux deux modes)
      const next = { ...(user ?? {}), firstConnection: false };
      setUser(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user-agricap', JSON.stringify(next));
      }

      toast.current?.show({
        severity: 'success',
        summary: 'Mot de passe mis à jour',
        detail: 'Vous pouvez continuer à utiliser l’application.',
        life: 2000,
      });

      setShowPwdModal(false);
      setNewPwd('');
      setConfirmPwd('');
    } catch (e) {
      // ... (gestion des erreurs inchangée)
      toast.current?.show({
        severity: 'error',
        summary: 'Échec',
        detail:
          //@ts-expect-error --explication
          e?.response?.data?.message ||
          //@ts-expect-error --explication  
          e?.message ||
          'Impossible de mettre à jour le mot de passe.',
        life: 3500,
      });
    } finally {
      setSaving(false);
    }
  }, [newPwd, confirmPwd, resetId, resetToken, user, dispatch]);

  const renderDashboard = () => {
    switch (user?.role) {
      case 'SuperAdmin':
      case 'AdminRegion':
        return <PrivilegiesDashboard />;
      case 'AdminPointVente':
        return <AdminPointVenteDashboard />;
      case 'Vendeur':
        return <VendeurDashboard />;
      case 'Logisticien':
        return <GerantDashboard />;
      default:
        return <NotDefined />;
    }
  };

  return (
    <div>
      <Toast ref={toast} />
      <div className="mt-6">{renderDashboard()}</div>

      {/* MODAL Première connexion – changement de mot de passe */}
      <Dialog
        visible={showPwdModal}
        onHide={() => {}} // requis par les types
        closable={false}
        dismissableMask={false}
        closeOnEscape={false}
        modal
        style={{ width: '32rem', maxWidth: '95vw' }}
        contentClassName="p-fluid"
        header={
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Sécurisez votre compte</span>
          </div>
        }
      >
        <div className="space-y-4 w-full">
          <p className="text-lg text-gray-600">Veuillez changer votre mot de passe temporaire.</p>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium">Nouveau mot de passe</label>
            <Password
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value ?? '')}
              feedback
              toggleMask
              className="w-full"
              inputClassName="w-full"
              pt={{ root: { className: 'w-full' }, input: { className: 'w-full' } }}
            />
          </div>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium">Confirmer le mot de passe</label>
            <Password
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value ?? '')}
              feedback={false}
              toggleMask
              className="w-full"
              inputClassName="w-full"
              pt={{ root: { className: 'w-full' }, input: { className: 'w-full' } }}
            />
            {!pwdValid && (newPwd.length > 0 || confirmPwd.length > 0) && (
              <small className="text-red-600">
                Minimum 8 caractères et confirmation identique.
              </small>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              label="Déconnexion"
              outlined
              className="!border-gray-300 !text-gray-700"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('token-agricap');
                  localStorage.removeItem('user-agricap');
                  window.location.href = '/login';
                }
              }}
            />
            <Button
              label={saving ? 'Enregistrement…' : 'Enregistrer'}
              className="!bg-blue-600 !text-white"
              onClick={submitNewPassword}
              disabled={!pwdValid || saving}
              loading={saving}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
