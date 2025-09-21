/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';
//import { Button } from 'primereact/button';
import { User } from '@/Models/UserType';
import TarifsAbonnement from './TarifsAbonnement';
import PaiementForm from './paiementForm';
import UserForm from './UserForm';
import OrganisationForm from './organisationForm';
import { Organisation } from '@/stores/slices/organisation/organisationSlice';
import { TarifModel } from '@/Models/tarif';
//import { TarifModel } from './TarifsAbonnement';

const MultiStepForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);

  const [selectedTarif, setSelectedTarif] = useState<TarifModel | null>(null);

  const handleNextUser = (userData: User) => {
    setUser(userData);
    setStep(2);
  };
  const handleNextOrganisation = (organisation: Organisation) => {
    console.log('next on organisation  here : ', organisation);
    setOrganisation(organisation);
    setStep(3);
  };
  const handleNextTarif = (tarif: TarifModel) => {
    setSelectedTarif(tarif);
    setStep(4);
  };

  const handleNextPaiement = () => {
    window.location.href = '/accueil';
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  useEffect(() => {
    setStep(1);
    setUser(null);
    setSelectedTarif(null);
  }, []);

  useEffect(() => {
    if (user) {
      console.log('Nouvel utilisateur défini:', user);
    }
    if (selectedTarif) {
      console.log('Tarif sélectionné:', selectedTarif);
    }
  }, [user, selectedTarif]);

  const progressWidth = `${(step / 3) * 100}%`;

  return (
    <div className="h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="w-9/10 bg-white rounded shadow relative h-9/10 overflow-hidden border-t-1 border-green-700">
        <div
          className="absolute top-0 left-0 h-1 bg-green-700"
          style={{ width: progressWidth }}
        ></div>
        {step === 1 && <UserForm onNext={handleNextUser} />}
        {step === 2 && (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error - compat: external lib types mismatch
          <OrganisationForm onNext={handleNextOrganisation} user={user} />
        )}

        {step === 3 && (
          <TarifsAbonnement
            onNext={handleNextTarif}
            onBack={handleBack}
            setSelectedTarif={setSelectedTarif}
          />
        )}
        {step === 4 && user && selectedTarif && (
          <PaiementForm
            selectedTarif={selectedTarif}
            user={user}
            onFinish={handleNextPaiement}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};

export default MultiStepForm;
