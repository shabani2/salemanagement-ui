'use client'; // Assurez-vous que ce fichier est bien un composant client
 
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return; // Évite les erreurs côté serveur

    const token = localStorage.getItem('token-agricap');

    if (!token) {
      // console.log(loading)
      router.replace('/login');
    }
    // console.log("user token =", token);
  }, [router]); // Ajout de `router` dans les dépendances

  //   if (loading) return <p>Chargement...</p>;

  return <>{children}</>;
}
