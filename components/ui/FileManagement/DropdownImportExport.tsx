import React, { useRef, useState } from 'react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { TieredMenu } from 'primereact/tieredmenu';
import { Dialog } from 'primereact/dialog';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

interface DropdownImportExportProps {
  onAction: (action: { type: 'import' | 'export'; format: 'csv' | 'excel'; file?: File }) => void;
}

const DropdownImportExport: React.FC<DropdownImportExportProps> = ({ onAction }) => {
  const tieredMenuRef = useRef<TieredMenu>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importFormat, setImportFormat] = useState<'csv' | 'excel' | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleImportClick = (format: 'csv' | 'excel') => {
    setImportFormat(format);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && importFormat) {
      onAction({ type: 'import', format: importFormat, file });
    }
    e.target.value = '';
    setImportFormat(null);
  };

  const handleExportClick = (format: 'csv' | 'excel') => {
    setExportFormat(format);
    setShowExportDialog(true);
  };

  const confirmExport = () => {
    if (exportFormat) {
      onAction({ type: 'export', format: exportFormat });
    }
    setExportFormat(null);
    setShowExportDialog(false);
  };

  const menuModel = [
    {
      label: 'Import',
      icon: 'pi pi-download',
      items: [
        {
          label: 'Excel',
          icon: 'pi pi-file-excel',
          command: () => handleImportClick('excel')
        },
        {
          label: 'CSV',
          icon: 'pi pi-file',
          command: () => handleImportClick('csv')
        }
      ]
    },
    {
      label: 'Export',
      icon: 'pi pi-upload',
      items: [
        {
          label: 'Excel',
          icon: 'pi pi-file-excel',
          command: () => handleExportClick('excel')
        },
        {
          label: 'CSV',
          icon: 'pi pi-file',
          command: () => handleExportClick('csv')
        }
      ]
    }
  ];

  const getAcceptedFormat = () => {
    if (importFormat === 'excel') return '.xls,.xlsx';
    if (importFormat === 'csv') return '.csv';
    return '*/*';
  };

  return (
    <div className="relative">
      <Button
        label="Fichiers"
        icon="pi pi-bars"
        onClick={(e) => tieredMenuRef.current?.toggle(e)}
        className="rounded-lg p-button-success"
        aria-haspopup
        aria-controls="tiered_menu"
      />

      <TieredMenu
        model={menuModel}
        popup
        ref={tieredMenuRef}
        id="tiered_menu"
        appendTo={document.body}
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept={getAcceptedFormat()}
        onChange={handleFileChange}
      />

      <Dialog
        header="Confirm Export"
        visible={showExportDialog}
        onHide={() => setShowExportDialog(false)}
        footer={
          <>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setShowExportDialog(false)} className="p-button-text" />
            <Button label="Download" icon="pi pi-check" onClick={confirmExport} autoFocus />
          </>
        }
      >
        <p>Are you sure you want to export as {exportFormat?.toUpperCase()}?</p>
      </Dialog>
    </div>
  );
};

export default DropdownImportExport;
