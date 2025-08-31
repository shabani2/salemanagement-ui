'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

type NoDataCardProps = {
  title?: string;
  message?: string;
  className?: string;
};

const NoDataCard: React.FC<NoDataCardProps> = ({
  title = 'Aucune donnée',
  message = "Il n'y a rien à afficher pour le moment.",
  className = '',
}) => {
  return (
    <div
      className={
        'w-full h-full min-h-[260px] flex items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm ' +
        className
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center max-w-md p-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shadow-inner">
          <Inbox size={28} className="text-gray-400" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
};

export default NoDataCard;
