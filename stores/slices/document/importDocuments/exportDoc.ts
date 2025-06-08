/* eslint-disable @typescript-eslint/no-explicit-any */
// /store/exportMouvementStockSlice.ts
import { apiClient } from '@/lib/apiConfig';
import { createAsyncThunk } from '@reduxjs/toolkit';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token-agricap');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const exportFile = createAsyncThunk(
  'export/file',
  async (
    {
      mouvements,
      fileType,
      url,
    }: {
      mouvements: any[];
      fileType: 'xlsx' | 'csv';
      url: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post(
        url,
        {
          data: mouvements,
          fileType,
        },
        {
          headers: {
            ...getAuthHeaders(),
            Accept:
              fileType === 'csv'
                ? 'text/csv'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          responseType: 'blob',
        }
      );

      return new Blob([response.data], {
        type:
          fileType === 'csv'
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de l’export');
    }
  }
);

// /utils/download.ts
export const downloadExportedFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
