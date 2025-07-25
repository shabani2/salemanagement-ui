/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// components/PaiementForm.tsx
import React, { useEffect } from 'react';
import { Card } from 'primereact/card';
import { RadioButton } from 'primereact/radiobutton';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { TarifModel } from '@/Models/tarif';
import { FaCcVisa, FaCcMastercard, FaMobileAlt, FaGooglePlay } from 'react-icons/fa';
import { User } from '@/Models/UserType';

interface PaiementFormProps {
  selectedTarif: TarifModel;
  user: User;
  onFinish: () => void;
  onBack: () => void;
}

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (options: any) => any;
        };
      };
    };
  }
}

const PaiementForm: React.FC<PaiementFormProps> = ({ selectedTarif, user, onFinish, onBack }) => {
  const [method, setMethod] = React.useState<'visa' | 'mastercard' | 'mobilemoney' | 'googleplay'>(
    'visa'
  );
  const [formData, setFormData] = React.useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
    mobileNumber: '',
  });
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const renderCardFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <span className="p-float-label">
        <InputText
          id="cardNumber"
          name="cardNumber"
          value={formData.cardNumber}
          onChange={handleChange}
        />
        <label htmlFor="cardNumber">Numéro de carte</label>
      </span>
      <span className="p-float-label">
        <InputText
          id="cardName"
          name="cardName"
          value={formData.cardName}
          onChange={handleChange}
        />
        <label htmlFor="cardName">Nom sur la carte</label>
      </span>
      <span className="p-float-label">
        <InputText id="expiry" name="expiry" value={formData.expiry} onChange={handleChange} />
        <label htmlFor="expiry">Date d&apos;expiration</label>
      </span>
      <span className="p-float-label">
        <InputText id="cvv" name="cvv" value={formData.cvv} onChange={handleChange} />
        <label htmlFor="cvv">CVV</label>
      </span>
    </div>
  );

  const renderMobileMoneyFields = () => (
    <div className="p-float-label">
      <InputText
        id="mobileNumber"
        name="mobileNumber"
        value={formData.mobileNumber}
        onChange={handleChange}
      />
      <label htmlFor="mobileNumber">Numéro Mobile Money</label>
    </div>
  );

  const renderGooglePayButton = () => (
    <div className="flex justify-center">
      <div id="google-pay-button" className="mt-4"></div>
    </div>
  );

  useEffect(() => {
    if (method !== 'googleplay') return;

    if (!window.google || !window.google.payments || !window.google.payments.api) return;
    const paymentsClient = new window.google.payments.api.PaymentsClient({
      environment: 'TEST',
    });

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'example',
              gatewayMerchantId: 'exampleGatewayMerchantId',
            },
          },
        },
      ],
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: `${Number(selectedTarif.prix ?? 0) + 500}`,
        currencyCode: 'XOF',
      },
      merchantInfo: {
        merchantName: 'Exemple Société',
      },
    };

    paymentsClient
      .isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: paymentDataRequest.allowedPaymentMethods,
      })
      .then(function (response: unknown) {
        if (
          typeof response === 'object' &&
          response !== null &&
          'result' in response &&
          (response as { result: boolean }).result
        ) {
          paymentsClient
            .createButton({
              onClick: () => {
                paymentsClient
                  .loadPaymentData(paymentDataRequest)
                  .then((paymentData: unknown) => {
                    // You can add type assertions or checks here if you know the structure
                    console.log('Paiement Google Pay réussi', paymentData);
                    onFinish();
                  })
                  .catch((err: unknown) => {
                    console.error('Erreur Google Pay', err);
                  });
              },
            })
            .then((button: HTMLElement) => {
              const btnContainer = document.getElementById('google-pay-button');
              if (btnContainer) {
                btnContainer.innerHTML = '';
                btnContainer.appendChild(button);
              }
            });
        }
      });
  }, [method, onFinish, selectedTarif.prix]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className="flex flex-col gap-6">
        <Card title={`Paiement pour le plan ${selectedTarif.nom}`}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <RadioButton
                  inputId="visa"
                  name="method"
                  value="visa"
                  onChange={(e) => setMethod(e.value)}
                  checked={method === 'visa'}
                />
                <label htmlFor="visa" className="flex items-center gap-2">
                  <FaCcVisa /> Visa
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton
                  inputId="mastercard"
                  name="method"
                  value="mastercard"
                  onChange={(e) => setMethod(e.value)}
                  checked={method === 'mastercard'}
                />
                <label htmlFor="mastercard" className="flex items-center gap-2">
                  <FaCcMastercard /> MasterCard
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton
                  inputId="mobilemoney"
                  name="method"
                  value="mobilemoney"
                  onChange={(e) => setMethod(e.value)}
                  checked={method === 'mobilemoney'}
                />
                <label htmlFor="mobilemoney" className="flex items-center gap-2">
                  <FaMobileAlt /> Mobile Money
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton
                  inputId="googleplay"
                  name="method"
                  value="googleplay"
                  onChange={(e) => setMethod(e.value)}
                  checked={method === 'googleplay'}
                />
                <label htmlFor="googleplay" className="flex items-center gap-2">
                  <FaGooglePlay /> Google Play
                </label>
              </div>
            </div>

            {method === 'mobilemoney' && renderMobileMoneyFields()}
            {(method === 'visa' || method === 'mastercard') && renderCardFields()}
            {method === 'googleplay' && renderGooglePayButton()}

            <div className="flex justify-between mt-6">
              <Button
                label="Retour"
                className="p-button-secondary"
                onClick={onBack}
                disabled={isProcessing}
              />
              <Button
                label="Procéder au paiement"
                icon="pi pi-credit-card"
                onClick={onFinish}
                disabled={method === 'googleplay' || isProcessing}
              />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Card title="Résumé de l'abonnement">
          <div className="flex flex-col gap-3 p-5">
            <h3 className="text-lg font-semibold">Informations du client</h3>
            <ul className="text-sm">
              <li>
                <strong>Nom:</strong> {user.nom}
              </li>
              <li>
                <strong>Prénom:</strong> {user.prenom}
              </li>
              <li>
                <strong>Téléphone:</strong> {user.telephone}
              </li>
              <li>
                <strong>Email:</strong> {user.email}
              </li>
              <li>
                <strong>Pays:</strong> {user.adresse}
              </li>
              {/* <li><strong>Ville:</strong> {user.ville}</li> */}
            </ul>
            <h3 className="text-lg font-semibold mt-4">Détails de l&apos;abonnement</h3>
            <ul className="text-sm">
              <li>
                <strong>Type:</strong> {selectedTarif.nom}
              </li>
              <li>
                <strong>Période:</strong> {selectedTarif?.periode}
              </li>
              <li>
                <strong>Coût:</strong> {selectedTarif.prix} FCFA
              </li>
              <li>
                <strong>Taxe:</strong> 500 FCFA
              </li>
              <li>
                <strong>Montant total:</strong> {Number(selectedTarif.prix ?? 0) + 500} FCFA
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaiementForm;
