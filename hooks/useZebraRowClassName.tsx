/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useZebraRowClassName.ts
import { useCallback } from 'react';

export function useZebraRowClassName<T extends { [key: string]: any }>(
  data: T[],
  keyField: keyof T,
  first: number,
  rows: number,
  evenClass = 'bg-gray-300 text-gray-900',
  oddClass = 'bg-green-900 text-white'
) {
  return useCallback(
    (rowData: T) => {
      const pageData = data.slice(first, first + rows);
      const rowIndex = pageData.findIndex((item) => item[keyField] === rowData[keyField]);

      if (rowIndex === -1) return '';
      console.log('rowIndex', rowIndex);
      const globalIndex = first + rowIndex;
      return globalIndex % 2 === 0 ? evenClass : oddClass;
    },
    [data, keyField, first, rows, evenClass, oddClass]
  );
}
