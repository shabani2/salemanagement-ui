/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';

import type { DataTableValue } from 'primereact/datatable';

interface TableCardProps<T extends DataTableValue> {
  title: string;
  data: T[];
  columns: { field: keyof T; header: string }[];
}

const TableCard = <T extends DataTableValue>({ title, data, columns }: TableCardProps<T>) => {
  function getNestedValue(rowData: T, field: string | number | symbol) {
    if (typeof field === 'string' && field.includes('.')) {
      return field.split('.').reduce((obj: unknown, key) => {
        if (obj && typeof obj === 'object' && key in obj) {
          return (obj as Record<string, unknown>)[key];
        }
        return undefined;
      }, rowData);
    }
    return rowData[field as keyof T];
  }

  return (
    <Card title={title} className="shadow-md rounded-lg h-full p-5">
      {/* <DataTable value={data} tableStyle={{ minWidth: '500px' }}>
        {columns.map((col) => (
          <Column key={String(col.field)} field={String(col.field)} header={col.header} />
        ))}
      </DataTable> */}
      <DataTable value={data} tableStyle={{ minWidth: '500px' }}>
        {columns.map((col) => (
          <Column
            key={String(col.field)}
            header={col.header}
            size="small"
            // @ts-expect-error - compat: external lib types mismatch
            body={(rowData: T) => {
              const value = getNestedValue(rowData, col.field);
              if (value === undefined || value === null) return null;
              return typeof value === 'object' ? JSON.stringify(value) : value;
            }}
          />
        ))}
      </DataTable>
    </Card>
  );
};

export default TableCard;
