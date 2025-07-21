/* eslint-disable @typescript-eslint/no-unused-vars */
import { TarifModel } from '@/Models/tarif';
import React from 'react';
import TarifCard from './tarifCard';
import { Button } from 'primereact/button';

const tarifs: TarifModel[] = [
  {
    id: 'standard',
    nom: 'Standard',
    description: 'Le meilleur rapport qualité-prix pour les utilisateurs réguliers.',
    details: {
      ancienPrix: 9.99,
      nouveauPrix: 3.99,
      duree: '48 mois',
      economie: 60,
      devise: 'USD',
    },
    periode: '48 mois',
    prix: 3.99,
    renouvellement: 'Renouvellement à 9,99 $ US/mois pendant un an. Résiliable à tout moment.',
    ctaText: 'Choisir Standard',
    features: [
      {
        titre: 'Fonctionnalités principales',
        items: ['10 sites Web', '25 Go de stockage', 'SSL gratuit'],
      },
      {
        titre: 'Sécurité',
        items: ['Protection DDoS', 'Pare-feu applicatif'],
      },
    ],
  },
  {
    id: 'simple',
    nom: 'Simple',
    description: 'Un plan basique pour les débutants ou les petits projets.',
    details: {
      ancienPrix: 5.99,
      nouveauPrix: 1.99,
      duree: '36 mois',
      economie: 66,
      devise: 'USD',
    },
    periode: '36 mois',
    prix: 1.99,
    renouvellement: 'Renouvellement à 5,99 $ US/mois après 1 an.',
    ctaText: 'Choisir Simple',
    features: [
      {
        titre: 'Fonctionnalités de base',
        items: ['1 site Web', '10 Go de stockage', 'SSL inclus'],
      },
    ],
  },
  {
    id: 'pro',
    nom: 'Pro',
    description: 'Passez au niveau supérieur avec des fonctionnalités avancées.',
    details: {
      ancienPrix: 13.99,
      nouveauPrix: 3.99,
      duree: '48 mois',
      economie: 71,
      devise: 'USD',
    },
    periode: '48 mois',
    prix: 3.99,
    renouvellement: 'Renouvellement à 13,99 $ US/mois pendant un an. Résiliable à tout moment.',
    ctaText: 'Choisir Pro',
    features: [
      {
        titre: 'Performance',
        items: ['50 sites Web', '50 Go de stockage NVMe', 'Domaine gratuit'],
      },
      {
        titre: 'Support et sécurité',
        items: ['Support prioritaire', 'Sauvegardes quotidiennes', 'Protection WHOIS'],
      },
    ],
  },
];

interface TarifAbonnementProps {
  onNext: (tarif: TarifModel) => void;
  onBack: () => void;
  //selectedTarif: TarifModel | null;
  setSelectedTarif: (tarif: TarifModel) => void;
}

const TarifAbonnement: React.FC<TarifAbonnementProps> = ({ onNext, onBack, setSelectedTarif }) => {
  const [selectedTarif, setLocalSelectedTarif] = React.useState<TarifModel | null>(null);

  const handleSelect = (planId: string) => {
    const foundTarif = tarifs.find((tarif) => tarif.id === planId);
    if (foundTarif) {
      setLocalSelectedTarif(foundTarif);
      setSelectedTarif(foundTarif);
    }
  };

  const handleNext = () => {
    if (selectedTarif) {
      onNext(selectedTarif);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full  p-4">
      <h1 className="text-2xl font-bold mb-2">Choisissez votre plan d&apos;abonnement</h1>

      <div className="flex justify-center flex-row w-full  gap-4 p-6">
        {tarifs.map((tarif) => (
          <TarifCard key={tarif.id} plan={tarif} onSelect={handleSelect} />
        ))}

        {/* 
        <Button
          severity="success"
          label="Suivant"
          disabled // Vous pouvez ajouter une logique pour désactiver ce bouton si aucun tarif n'est sélectionné

          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={onNext}
        />
        */}
      </div>
      <div className="flex justify-end w-full">
        <Button
          severity="success"
          label="Suivant"
          disabled={!selectedTarif} // Désactive si aucun tarif n'est sélectionné
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 "
          onClick={handleNext}
        />
      </div>
    </div>
  );
};

export default TarifAbonnement;
