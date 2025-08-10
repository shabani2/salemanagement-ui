'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';

import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

import { EyeOffIcon } from 'lucide-react';
import { EyeIcon } from '@heroicons/react/24/outline';

import inaf from '@/assets/images/globals/inaf.png';
import { loginUser } from '@/stores/slices/auth/authSlice';
import { AppDispatch } from '@/stores/store';

/* ----------------------------- Helpers robustes ---------------------------- */
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const trimOrEmpty = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const phoneLooksValid = (v: string) => {
  // tolérant: +, espaces, -, (), et chiffres ; impose >= 8 chiffres
  const digits = v.replace(/\D/g, '');
  return digits.length >= 8;
};

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ----------------------------- Hydrate rememberMe ----------------------------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auth-remember');
      const savedPhone = localStorage.getItem('auth-phone');
      if (saved === '1' && isNonEmptyString(savedPhone)) {
        setRememberMe(true);
        setPhone(savedPhone);
      }
    } catch {
      // ignore
    }
  }, []);

  const canSubmit = useMemo(() => {
    const p = trimOrEmpty(phone);
    const pwd = trimOrEmpty(password);
    return isNonEmptyString(p) && isNonEmptyString(pwd) && phoneLooksValid(pwd ? p : '');
  }, [phone, password]);

  const persistRemember = useCallback(
    (tel: string) => {
      try {
        if (rememberMe) {
          localStorage.setItem('auth-remember', '1');
          localStorage.setItem('auth-phone', tel);
        } else {
          localStorage.removeItem('auth-remember');
          localStorage.removeItem('auth-phone');
        }
      } catch {
        // storage indisponible : pas bloquant
      }
    },
    [rememberMe]
  );

  const handleLogin = useCallback(async () => {
    setError(null);

    const tel = trimOrEmpty(phone);
    const pwd = trimOrEmpty(password);

    if (!isNonEmptyString(tel) || !isNonEmptyString(pwd)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Veuillez renseigner le téléphone et le mot de passe.',
        life: 2500,
      });
      return;
    }
    if (!phoneLooksValid(tel)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Téléphone invalide',
        detail: 'Veuillez saisir un numéro valide (au moins 8 chiffres).',
        life: 2500,
      });
      return;
    }

    try {
      setLoading(true);
      await dispatch(loginUser({ telephone: tel, password: pwd })).unwrap();
      persistRemember(tel);

      toast.current?.show({
        severity: 'success',
        summary: 'Connexion réussie',
        detail: 'Bienvenue 👋',
        life: 1500,
      });

      // redirection après un petit délai visuel
      setTimeout(() => router.push('/'), 300);
    } catch (err: unknown) {
      let message: string;
      if (typeof err === 'object' && err !== null) {
        if ('message' in err && typeof (err as { message?: unknown }).message === 'string') {
          message = (err as { message: string }).message;
        } else if ('error' in err && typeof (err as { error?: unknown }).error === 'string') {
          message = (err as { error: string }).error;
        } else if ('detail' in err && typeof (err as { detail?: unknown }).detail === 'string') {
          message = (err as { detail: string }).detail;
        } else {
          message = "Une erreur s'est produite lors de la connexion";
        }
      } else {
        message = "Une erreur s'est produite lors de la connexion";
      }

      setError(String(message));
      toast.current?.show({
        severity: 'error',
        summary: 'Échec de connexion',
        detail: String(message),
        life: 3500,
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch, password, persistRemember, phone, router]);

  const handleCreateAccount = useCallback(() => {
    router.push('/subscription');
  }, [router]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading && canSubmit) {
        e.preventDefault();
        handleLogin();
      }
    },
    [handleLogin, loading, canSubmit]
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Toast ref={toast} />
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src={inaf} alt="App Logo" width={100} height={100} priority />
        </div>

        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-6">Se connecter</h2>

        {/* Téléphone */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="phone">
            Téléphone
          </label>
          <InputText
            id="phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value ?? '')}
            onKeyDown={onKeyDown}
            placeholder="exemple: +243 81 234 56 78"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-700"
            aria-invalid={!phoneLooksValid(phone) && isNonEmptyString(phone)}
          />
          {!phoneLooksValid(phone) && isNonEmptyString(phone) && (
            <small className="text-red-600">Numéro non valide</small>
          )}
        </div>

        {/* Mot de passe */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
            Mot de passe
          </label>
          <div className="relative w-full">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value ?? '')}
              onKeyDown={onKeyDown}
              placeholder="Entrez votre mot de passe"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-700 pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute inset-y-0 right-3 flex items-center text-gray-600"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Se souvenir de moi */}
        <div className="flex items-center mb-4">
          <Checkbox
            inputId="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(!!e.checked)}
            className="mr-2"
          />
          <label htmlFor="rememberMe" className="text-gray-700">
            Se souvenir de moi
          </label>
        </div>

        {/* Message d'erreur (fallback) */}
        {error && <p className="text-red-700 text-sm mb-4">{String(error)}</p>}

        <div className="flex justify-end gap-2 mb-3">
          <Button label="Créer un compte" text onClick={handleCreateAccount} />
        </div>

        {/* Bouton de connexion */}
        <Button
          label={loading ? '' : 'Se connecter'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex justify-center items-center disabled:opacity-60"
          onClick={handleLogin}
          disabled={loading || !canSubmit}
        >
          {loading ? (
            <ProgressSpinner
              style={{ width: '28px', height: '28px' }}
              strokeWidth="8"
              // pas de fill custom (PrimeReact gère)
            />
          ) : null}
        </Button>
      </div>
    </div>
  );
}
