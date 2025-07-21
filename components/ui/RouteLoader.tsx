// components/ui/RouteLoader.tsx
'use client';

import { ClipLoader } from 'react-spinners';

export default function RouteLoader() {
  return (
    <div className="flex justify-center items-center h-full">
      <ClipLoader color="#22c55e" size={60} />
    </div>
  );
}
