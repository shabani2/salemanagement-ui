/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from '@/lib/apiConfig';
import { createAsyncThunk } from '@reduxjs/toolkit';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
// ✅ Thunk pour générer un PDF de stock
export const generateStockPdf = createAsyncThunk(
  'pdf/generateStockPdf',
  async (
    payload: {
      organisation: any;
      user: any;
      mouvements: any[];
      type: string;
      destinateur?: any;
      serie: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // console.log('PDF generated successfully:', payload.mouvements);
      const response = await apiClient.post('/generatePdf', payload, {
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/pdf',
        },
        responseType: 'blob',
      });

      return new Blob([response.data], { type: 'application/pdf' });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Erreur lors de la génération du PDF');
    }
  }
);

// utils/download.ts
export const downloadPdfFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
