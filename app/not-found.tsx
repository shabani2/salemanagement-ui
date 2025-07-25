// app/not-found.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Animation */}
        <div className="relative">
          <div className="absolute -inset-4">
            <div className="w-full h-full mx-auto rotate-180 opacity-30 blur-lg filter">
              <div className="h-32 w-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg"></div>
            </div>
          </div>

          <div className="relative bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8">
            {/* Logo de l'erreur */}
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-900/30 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 flex items-center justify-center">
                <span className="text-4xl font-bold text-red-600 dark:text-red-400">404</span>
              </div>
            </div>

            {/* Texte */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Page introuvable
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Oups ! La page que vous cherchez n&apos;existe pas.
            </p>

            {/* Bouton d'action */}
            <Link
              href="/"
              className="!bg-green-700 inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-300 group shadow-lg hover:shadow-indigo-500/30"
            >
              Retour à l&apos;accueil
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Message supplémentaire */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-12">
          Code d&apos;erreur : 404 - Page Not Found
        </p>
      </div>
    </div>
  );
}
