// file: src/components/onboarding/MultiStepForm.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/stores/store';
import { Organisation, addOrganisation } from '@/stores/slices/organisation/organisationSlice';
import { User } from '@/Models/UserType';
import TarifsAbonnement from './TarifsAbonnement';
import PaiementForm from './paiementForm';
import UserForm from './UserForm';
import OrganisationForm from './organisationForm';
import { TarifModel } from '@/Models/tarif';

const TOTAL_STEPS = 4;

const MultiStepForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const [step, setStep] = useState<number>(1);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedTarif, setSelectedTarif] = useState<TarifModel | null>(null);
  const progressWidth = useMemo(() => `${(step / TOTAL_STEPS) * 100}%`, [step]);

  const persistTenant = (orgId: string | undefined) => {
    // why: header x-tenant-id pour les requêtes suivantes
    if (!orgId) return;
    try { localStorage.setItem('organisationId', orgId); } catch { /* ignore */ }
  };

  // 1) Organisation -> crée l'org si nécessaire, persiste tenantId, passe à l'étape 2
  const handleNextOrganisation = async (orgInput: Partial<Organisation>) => {
    // Si le form renvoie déjà une org créée (_id présent), on garde tel quel
    if ((orgInput as Organisation)?._id) {
      const created = orgInput as Organisation;
      setOrganisation(created);
      persistTenant(created._id);
      setStep(2);
      return;
    }

    // Sinon on crée via API
    const formData = new FormData();
    Object.entries(orgInput).forEach(([k, v]) => {
      if (v == null) return;
      // @ts-expect-error - file typing
      if (k === 'logo' && v instanceof File) formData.append('logo', v);
      else formData.append(k, String(v));
    });

    const action = await dispatch(addOrganisation(formData));
    if (addOrganisation.fulfilled.match(action)) {
      const created = action.payload as Organisation;
      setOrganisation(created);
      persistTenant(created._id);
      setStep(2);
    } else {
   
      const msg = action.payload || 'Échec de création de l’organisation';
      alert(String(msg));
    }
  };

  // 2) User
  const handleNextUser = (userData: User) => {
    setUser(userData);
    setStep(3);
  };

  // 3) Tarif
  const handleNextTarif = (tarif: TarifModel) => {
    setSelectedTarif(tarif);
    setStep(4);
  };

  // 4) Paiement -> fin
  const handleNextPaiement = () => {
    window.location.href = '/accueil';
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Reset on mount
  useEffect(() => {
    setStep(1);
    setUser(null);
    setSelectedTarif(null);
    // why: clear tenant si on recommence tout
    // try { localStorage.removeItem('organisationId'); } catch {}
  }, []);

  return (
    <div className="h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="w-9/10 bg-white rounded shadow relative h-9/10 overflow-hidden border-t-1 border-green-700">
        <div className="absolute top-0 left-0 h-1 bg-green-700" style={{ width: progressWidth }} />

        {/* Étape 1: Organisation (PRIORITAIRE) */}
        {step === 1 && (
         
          <OrganisationForm onNext={handleNextOrganisation} />
        )}

        {/* Étape 2: User (reçoit l'organisation pour lier / informer) */}
        {step === 2 && (
          <UserForm onNext={handleNextUser} organisation={organisation ?? undefined} onBack={handleBack} />
        )}

        {/* Étape 3: Tarifs */}
        {step === 3 && (
          <TarifsAbonnement
            onNext={handleNextTarif}
            onBack={handleBack}
            setSelectedTarif={setSelectedTarif}
          />
        )}

        {/* Étape 4: Paiement */}
        {step === 4 && user && selectedTarif && (
          <PaiementForm
            selectedTarif={selectedTarif}
            user={user}
            organisation={organisation ?? undefined}
            onFinish={handleNextPaiement}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default MultiStepForm;
