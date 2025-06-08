import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { TarifModel } from '@/Models/tarif';

interface TarifCardProps {
  plan: TarifModel;
  onSelect: (planId: string) => void;
}

const TarifCard: React.FC<TarifCardProps> = ({ plan, onSelect }) => {
  return (
    <Card
      title={<span className="text-xl font-bold text-gray-800">{plan?.nom}</span>}
      subTitle={<span className="text-sm text-gray-500">{plan?.description}</span>}
      className="shadow-lg rounded-xl w-full md:w-96 border-t-4 border-green-700 p-3"
    >
      <div className="text-center">
        <div className="text-gray-400 line-through text-sm">
          {plan?.details.devise} {plan?.details.ancienPrix.toFixed(2)}
        </div>
        <div className="text-4xl font-extrabold text-green-700">
          {plan?.details?.devise} {plan?.details.nouveauPrix.toFixed(2)}
        </div>
        <div className="text-gray-500 text-sm mb-2">
          {plan?.details?.duree} • Économisez {plan?.details.economie}%
        </div>
        <p className="text-xs text-gray-500 italic mb-4">{plan?.renouvellement}</p>
        <Button
          label={plan?.ctaText}
          className="w-full p-button-success"
          onClick={() => onSelect(plan?.id)}
        />
      </div>

      <div className="mt-5">
        {plan?.features.map((group, index) => (
          <div key={index} className="mb-3">
            <h4 className="text-green-700 font-semibold text-sm mb-2">{group.titre}</h4>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {group.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TarifCard;
