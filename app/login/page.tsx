'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import Image from 'next/image';
import { EyeOffIcon } from 'lucide-react';
import { EyeIcon } from '@heroicons/react/24/outline';
import inaf from '@/assets/images/globals/inaf.png';
//import { Spinner } from "primereact/progressspinner";
import { loginUser } from '@/stores/slices/auth/authSlice';
import { AppDispatch } from '@/stores/store';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  // const user = useSelector((state:RootState) => state.auth.entities);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!phone || !password) {
      return;
    }

    console.log('credentials : ', phone, password);

    try {
      setLoading(true);
      const resp = await dispatch(loginUser({ telephone: phone, password: password })).unwrap();
      console.log('response here : ', resp);
      router.push('/');
    } catch (error) {
      console.error('Login error: ', error);
      setError((error as Error).message || "Une erreur s'est produite lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center   p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-300">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src={inaf} alt="App Logo" width={100} height={100} />
        </div>

        <h2 className="text-2xl font-semibold  text-gray-500 text-center mb-6">Se connecter</h2>

        {/* Téléphone */}
        <div className="mb-4">
          <label className="block  text-gray-500 text-sm font-medium mb-2">Téléphone</label>
          <InputText
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="exemple: +33 6 12 34 56 78"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-700"
          />
        </div>

        {/* Mot de passe */}
        <div className="mb-4 relative">
          <label className="block  text-gray-500 text-sm font-medium mb-2">Mot de passe</label>
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-700 pr-10"
            />
            <button
              type="button"
              severity={undefined}
              className="absolute inset-y-0 right-3 flex items-center  text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5 cursor-pointer" />
              ) : (
                <EyeIcon className="h-5 w-5 cursor-pointer" />
              )}
            </button>
          </div>
        </div>

        {/* Se souvenir de moi */}
        <div className="flex items-center mb-4">
          <Checkbox
            inputId="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.checked || false)}
            className="mr-2"
          />
          <label htmlFor="rememberMe" className="text-gray-600">
            Se souvenir de moi
          </label>
        </div>

        {/* Message d'erreur */}
        {error && <p className="text-red-700 text-sm mb-4">{String(error)}</p>}

        {/* Bouton de connexion avec spinner */}
        <Button
          severity={undefined}
          label="Se connecter"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex justify-center items-center"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ProgressSpinner
              style={{ width: '50px', height: '50px', color: 'white' }}
              strokeWidth="8"
              fill="var(--primary-color)"
            />
          ) : null}
        </Button>
      </div>
    </div>
  );
}
