import React from 'react';
import { motion } from 'framer-motion';

interface NotDefinedProps {
  title?: string;
  subtitle?: string;
  description?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const NotDefined: React.FC<NotDefinedProps> = ({
  title = 'Non défini',
  subtitle = 'Ressource indisponible',
  description = "La donnée que vous recherchez n'est pas définie ou n'existe pas.",
  showRefresh = false,
  onRefresh,
  className = '',
}) => {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center min-h-[50vh] py-12 px-4 text-center ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animation centrale */}
      <motion.div
        className="relative mb-8"
        animate={{
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      >
        <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Effets décoratifs */}
        <motion.div
          className="absolute top-0 right-0 w-8 h-8 rounded-full bg-indigo-200 opacity-70"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 0.3, 0.7],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute bottom-2 left-2 w-6 h-6 rounded-full bg-blue-200 opacity-70"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0.3, 0.7],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: 0.5,
          }}
        />
      </motion.div>

      {/* Contenu texte */}
      <div className="max-w-md mx-auto">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-gray-800 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>

        <motion.p
          className="text-indigo-600 font-medium mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {subtitle}
        </motion.p>

        <motion.p
          className="text-gray-500 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {description}
        </motion.p>

        {/* Bouton d'action */}
        {showRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-5 py-2.5 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Réessayer
            </button>
          </motion.div>
        )}
      </div>

      {/* Effets décoratifs supplémentaires */}
      <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm">
        {[1, 2, 3].map((item) => (
          <motion.div
            key={item}
            className="bg-gray-100 rounded-lg p-4 flex flex-col items-center"
            animate={{
              y: [0, -10, 0],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              delay: item * 0.2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          >
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-12 h-12" />
            <div className="h-2 bg-gray-200 rounded mt-3 w-3/4" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default NotDefined;
