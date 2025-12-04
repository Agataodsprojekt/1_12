import React, { useState } from 'react';
import { X, FileSpreadsheet, Download } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (exportAll: boolean) => void;
  totalElements: number;
  selectedElementsCount: number;
  hasCosts: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  totalElements,
  selectedElementsCount,
  hasCosts,
}) => {
  const [exportAll, setExportAll] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(exportAll);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Eksport dokumentacji</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wybierz zakres elementów do eksportu do pliku Excel.
          </p>

          {/* Export options */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <input
                type="radio"
                name="exportScope"
                checked={exportAll}
                onChange={() => setExportAll(true)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Wszystkie elementy</div>
                <div className="text-sm text-muted-foreground">
                  {totalElements} elementów
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <input
                type="radio"
                name="exportScope"
                checked={!exportAll}
                onChange={() => setExportAll(false)}
                className="mt-1"
                disabled={selectedElementsCount === 0}
              />
              <div className="flex-1">
                <div className="font-medium">Tylko zaznaczone elementy</div>
                <div className="text-sm text-muted-foreground">
                  {selectedElementsCount > 0
                    ? `${selectedElementsCount} elementów`
                    : 'Brak zaznaczonych elementów'}
                </div>
              </div>
            </label>
          </div>

          {/* Info about costs */}
          {hasCosts && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-sm text-primary font-medium">
                ✓ Dane kosztów będą uwzględnione w eksporcie
              </div>
            </div>
          )}

          {!hasCosts && (
            <div className="p-3 bg-muted border border-border rounded-lg">
              <div className="text-sm text-muted-foreground">
                ⚠ Dane kosztów nie są dostępne
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleExport}
              disabled={!exportAll && selectedElementsCount === 0}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Eksportuj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



