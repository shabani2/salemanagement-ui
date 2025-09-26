// file: app/login/page.tsx
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
import { apiClient } from '@/lib/apiConfig'; // Pourquoi: utiliser la même config HTTP que le store

/* ----------------------------- Helpers ----------------------------- */
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const trimOrEmpty = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const emailLooksValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false); // Pourquoi: éviter multi-clics

  /* ------------------------ Hydrate rememberMe ------------------------ */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('auth-remember');
      const savedEmail = localStorage.getItem('auth-email');
      if (saved === '1' && isNonEmptyString(savedEmail)) {
        setRememberMe(true);
        setEmail(savedEmail);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const canSubmit = useMemo(() => {
    const em = trimOrEmpty(email);
    const pwd = trimOrEmpty(password);
    return emailLooksValid(em) && isNonEmptyString(pwd);
  }, [email, password]);

  const persistRemember = useCallback(
    (eml: string) => {
      try {
        if (rememberMe) {
          localStorage.setItem('auth-remember', '1');
          localStorage.setItem('auth-email', eml);
        } else {
          localStorage.removeItem('auth-remember');
          localStorage.removeItem('auth-email');
        }
      } catch {
        /* non bloquant */
      }
    },
    [rememberMe]
  );

  const handleForgotPassword = useCallback(async () => {
    const eml = trimOrEmpty(email);
    if (!emailLooksValid(eml)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Email requis',
        detail: 'Saisissez un email valide pour recevoir le lien.',
        life: 2500,
      });
      return;
    }
    try {
      setForgotLoading(true);
      await apiClient.post('/auth/forgot-password', { email: eml });
      toast.current?.show({
        severity: 'success',
        summary: 'Email envoyé',
        detail: 'Si un compte existe, un email a été envoyé.',
        life: 3000,
      });
    } catch (e) {
      toast.current?.show({
        severity: 'error',
        summary: 'Échec',
        //@ts-expect-error --explication
        detail: e?.response?.data?.message || "Impossible d'envoyer l'email.",
        life: 3500,
      });
    } finally {
      setForgotLoading(false);
    }
  }, [email]);

  const handleLogin = useCallback(async () => {
    setError(null);

    const eml = trimOrEmpty(email);
    const pwd = trimOrEmpty(password);

    if (!emailLooksValid(eml) || !isNonEmptyString(pwd)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Veuillez renseigner un email valide et le mot de passe.',
        life: 2500,
      });
      return;
    }

    try {
      setLoading(true);
      // ⚠️ Assure-toi que le thunk loginUser accepte { email, password }
      await dispatch(loginUser({ email: eml, password: pwd })).unwrap();
      persistRemember(eml);

      toast.current?.show({
        severity: 'success',
        summary: 'Connexion réussie',
        detail: 'Bienvenue',
        life: 1500,
      });

      setTimeout(() => router.push('/'), 300);
    } catch (err: unknown) {
      let message = "Une erreur s'est produite lors de la connexion";
      if (typeof err === 'object' && err) {
        if ('message' in err && typeof err.message === 'string') message = err.message;
        else if ('error' in err && typeof err.error === 'string') message = err.error;
        else if ('detail' in err && typeof err.detail === 'string') message = err.detail;
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
  }, [dispatch, email, password, persistRemember, router]);

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

        {/* Email */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
            Email
          </label>
          <InputText
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value ?? '')}
            onKeyDown={onKeyDown}
            placeholder="exemple: utilisateur@domaine.com"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-700"
            aria-invalid={!emailLooksValid(email) && isNonEmptyString(email)}
          />
          {!emailLooksValid(email) && isNonEmptyString(email) && (
            <small className="text-red-600">Email non valide</small>
          )}
        </div>

        {/* Mot de passe */}
        <div className="mb-2">
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

        {/* Se souvenir de moi + Mot de passe oublié */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
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
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            className="text-sm text-blue-700 hover:underline disabled:opacity-60"
          >
            {forgotLoading ? 'Envoi…' : 'Mot de passe oublié ?'}
          </button>
        </div>

        {/* Message d'erreur */}
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
            <ProgressSpinner style={{ width: '28px', height: '28px' }} strokeWidth="8" />
          ) : null}
        </Button>
      </div>
    </div>
  );
}
