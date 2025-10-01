// file: src/components/onboarding/PaiementForm.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { RadioButton } from 'primereact/radiobutton';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { FaCcVisa, FaCcMastercard, FaMobileAlt, FaGooglePlay } from 'react-icons/fa';
import { TarifModel } from '@/Models/tarif';
import { User } from '@/Models/UserType';
import type { Organisation } from '@/stores/slices/organisation/organisationSlice';
import { apiClient } from '@/lib/apiConfig';
import { useRouter } from 'next/router';

declare global {
  interface Window {
    google?: { payments?: { api?: { PaymentsClient: new (options: any) => any } } };
  }
}

type Method = 'visa' | 'mastercard' | 'mobilemoney' | 'googleplay';

interface PaiementFormProps {
  selectedTarif: TarifModel;
  user: User;
  organisation?: Organisation; // why: inclure tenant_id (_id) et devise
  onFinish: () => void;
  onBack: () => void;
}

const TAXE_FIXE = 500;

const PaiementForm: React.FC<PaiementFormProps> = ({ selectedTarif, user, organisation, onFinish, onBack }) => {
  const toast = useRef<Toast>(null);
  const [method, setMethod] = useState<Method>('visa');
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
    mobileNumber: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = useMemo(() => organisation?.devise || 'XOF', [organisation?.devise]);
  const price = Number(selectedTarif.prix ?? 0);
  const total = useMemo(() => price + TAXE_FIXE, [price]);
  const navigate = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  function validate(): boolean {
    if (method === 'mobilemoney') {
      if (!formData.mobileNumber.trim()) return setErr('Numéro Mobile Money requis');
    } else if (method === 'visa' || method === 'mastercard') {
      if (!/^\d{12,19}$/.test(formData.cardNumber.replace(/\s+/g, ''))) return setErr('Numéro de carte invalide');
      if (!formData.cardName.trim()) return setErr('Nom sur la carte requis');
      if (!/^\d{2}\/\d{2}$/.test(formData.expiry)) return setErr("Expiration au format MM/AA");
      if (!/^\d{3,4}$/.test(formData.cvv)) return setErr('CVV invalide');
    }
    return true;
  }
  function setErr(msg: string) {
    setError(msg);
    toast.current?.show({ severity: 'warn', summary: 'Validation', detail: msg, life: 2500 });
    return false;
  }

  async function handleProcessPayment() {
    if (!validate()) return;
navigate.push('/login')
    const orgId = organisation?._id || (typeof window !== 'undefined' ? localStorage.getItem('organisationId') || undefined : undefined);
    if (!orgId) {
      setErr("Organisation introuvable. Créez l'organisation avant le paiement.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    // WHY: exemple d’endpoint backend (à créer côté API)
    const payload = {
      organisationId: orgId,
      userId: (user as any)?._id || null,
      plan: { id: (selectedTarif as any)?._id || null, nom: selectedTarif.nom, periode: selectedTarif.periode, prix: price },
      method,
      currency,
      montant: total,
      meta: method === 'mobilemoney'
        ? { msisdn: formData.mobileNumber }
        : method === 'googleplay'
        ? { gpay: true }
        : { last4: formData.cardNumber.slice(-4) },
    };

    try {
      // Remplacez l’URL par la vôtre (ex.: /abonnements/checkout ou /payments/checkout)
      const resp = await apiClient.post('/abonnements/checkout', payload);
      if (resp.status >= 200 && resp.status < 300) {
        toast.current?.show({ severity: 'success', summary: 'Paiement', detail: 'Paiement réussi', life: 2000 });
        onFinish();
        return;
      }
      throw new Error('Réponse inattendue du serveur');
    } catch (e: any) {
      // Fallback: si l’API n’existe pas encore, on enchaîne l’onboarding
      if (!e?.response) {
        toast.current?.show({ severity: 'info', summary: 'Mode démo', detail: 'Aucun endpoint paiement. Passage à l’étape suivante.', life: 2500 });
        onFinish();
        return;
      }
      const msg = e?.response?.data?.message || e.message || 'Paiement échoué';
      setError(msg);
      toast.current?.show({ severity: 'error', summary: 'Erreur paiement', detail: msg, life: 3000 });
    } finally {
      setIsProcessing(false);
    }
  }

  function renderCardFields() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <span className="p-float-label">
          <InputText id="cardNumber" name="cardNumber" value={formData.cardNumber} onChange={handleChange} />
          <label htmlFor="cardNumber">Numéro de carte</label>
        </span>
        <span className="p-float-label">
          <InputText id="cardName" name="cardName" value={formData.cardName} onChange={handleChange} />
          <label htmlFor="cardName">Nom sur la carte</label>
        </span>
        <span className="p-float-label">
          <InputText id="expiry" name="expiry" value={formData.expiry} onChange={handleChange} />
          <label htmlFor="expiry">Expiration (MM/AA)</label>
        </span>
        <span className="p-float-label">
          <InputText id="cvv" name="cvv" value={formData.cvv} onChange={handleChange} />
          <label htmlFor="cvv">CVV</label>
        </span>
      </div>
    );
  }

  function renderMobileMoneyFields() {
    return (
      <div className="p-float-label">
        <InputText id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} />
        <label htmlFor="mobileNumber">Numéro Mobile Money</label>
      </div>
    );
  }

  function renderGooglePayButton() {
    return (
      <div className="flex justify-center">
        <div id="google-pay-button" className="mt-4" />
      </div>
    );
  }

  useEffect(() => {
    if (method !== 'googleplay') return;
    if (!window.google?.payments?.api) return;

    const paymentsClient = new window.google.payments.api.PaymentsClient({ environment: 'TEST' });
    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['MASTERCARD', 'VISA'] },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: { gateway: 'example', gatewayMerchantId: 'exampleGatewayMerchantId' },
          },
        },
      ],
      transactionInfo: { totalPriceStatus: 'FINAL', totalPrice: `${total}`, currencyCode: currency },
      merchantInfo: { merchantName: organisation?.nom || 'Votre Société' },
    };

    paymentsClient
      .isReadyToPay({ apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: paymentDataRequest.allowedPaymentMethods })
      .then((response: any) => {
        if (response?.result) {
          return paymentsClient.createButton({
            onClick: () => {
              paymentsClient
                .loadPaymentData(paymentDataRequest)
                .then((_paymentData: unknown) => {
                  onFinish();
                })
                .catch((err: any) => {
                  console.error('Erreur Google Pay', err);
                  toast.current?.show({ severity: 'error', summary: 'Google Pay', detail: 'Échec du paiement', life: 2500 });
                });
            },
          });
        }
        return null;
      })
      .then((button: any) => {
        if (!button) return;
        const btnContainer = document.getElementById('google-pay-button');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          btnContainer.appendChild(button);
        }
      });
  }, [method, total, currency, organisation?.nom, onFinish]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <Toast ref={toast} />

      <div className="flex flex-col gap-6">
        <Card title={`Paiement pour le plan ${selectedTarif.nom}`}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <RadioButton inputId="visa" name="method" value="visa" onChange={(e) => setMethod(e.value)} checked={method === 'visa'} />
                <label htmlFor="visa" className="flex items-center gap-2"><FaCcVisa /> Visa</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton inputId="mastercard" name="method" value="mastercard" onChange={(e) => setMethod(e.value)} checked={method === 'mastercard'} />
                <label htmlFor="mastercard" className="flex items-center gap-2"><FaCcMastercard /> MasterCard</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton inputId="mobilemoney" name="method" value="mobilemoney" onChange={(e) => setMethod(e.value)} checked={method === 'mobilemoney'} />
                <label htmlFor="mobilemoney" className="flex items-center gap-2"><FaMobileAlt /> Mobile Money</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioButton inputId="googleplay" name="method" value="googleplay" onChange={(e) => setMethod(e.value)} checked={method === 'googleplay'} />
                <label htmlFor="googleplay" className="flex items-center gap-2"><FaGooglePlay /> Google Pay</label>
              </div>
            </div>

            {method === 'mobilemoney' && renderMobileMoneyFields()}
            {(method === 'visa' || method === 'mastercard') && renderCardFields()}
            {method === 'googleplay' && renderGooglePayButton()}

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

            <div className="flex justify-between mt-6">
              <Button label="Retour" className="p-button-secondary" onClick={onBack} disabled={isProcessing} />
              <Button
                label="Procéder au paiement"
                icon="pi pi-credit-card"
                onClick={handleProcessPayment}
                disabled={method === 'googleplay' || isProcessing}
                loading={isProcessing}
              />
            </div>
          </div>
        </Card>
      </div>

      <div>
        <Card title="Résumé de l'abonnement">
          <div className="flex flex-col gap-3 p-5">
            {organisation && (
              <>
                <h3 className="text-lg font-semibold">Organisation</h3>
                <ul className="text-sm">
                  <li><strong>Nom:</strong> {organisation.nom}</li>
                  <li><strong>Slug:</strong> {organisation.idNat}</li>
                  <li><strong>Devise:</strong> {organisation.devise}</li>
                </ul>
              </>
            )}

            <h3 className="text-lg font-semibold mt-4">Informations du client</h3>
            <ul className="text-sm">
              <li><strong>Nom:</strong> {user.nom}</li>
              <li><strong>Prénom:</strong> {user.prenom}</li>
              <li><strong>Téléphone:</strong> {user.telephone}</li>
              <li><strong>Email:</strong> {user.email}</li>
              <li><strong>Adresse:</strong> {user.adresse}</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">Détails de l&apos;abonnement</h3>
            <ul className="text-sm">
              <li><strong>Type:</strong> {selectedTarif.nom}</li>
              <li><strong>Période:</strong> {selectedTarif?.periode}</li>
              <li><strong>Coût:</strong> {price} {currency}</li>
              <li><strong>Taxe:</strong> {TAXE_FIXE} {currency}</li>
              <li><strong>Montant total:</strong> {total} {currency}</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaiementForm;
