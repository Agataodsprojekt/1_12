import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { ParseResponse } from '../types/ifc';

interface IFCUploaderProps {
  onParsed: (data: ParseResponse) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onLocalLoad?: (file: File) => void; // Opcjonalna funkcja do lokalnego ładowania
}

export function IFCUploader({ onParsed, onError, isLoading, setIsLoading, onLocalLoad }: IFCUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.ifc')) {
        setFile(selectedFile);
        setUploadStatus('');
        onError(''); // Clear previous errors
      } else {
        onError('Proszę wybrać plik .ifc');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onError('Proszę wybrać plik .ifc');
      return;
    }

    try {
      setIsLoading(true);
      setUploadStatus('Wysyłanie pliku...');

      const data = await api.parseIFC(file);
      
      setUploadStatus('Plik przesłany pomyślnie!');
      onParsed(data);
      
      // Log kosztów w konsoli
      if (data.costs && data.costs.summary) {
        console.log('=== KOSZTY CAŁEJ BUDOWLI ===');
        console.log('Całkowity koszt:', data.costs.summary.grand_total, 'PLN');
        console.log('Materiały:', data.costs.summary.total_material_cost, 'PLN');
        console.log('Złącza:', data.costs.summary.total_connection_cost, 'PLN');
      }
    } catch (error: any) {
      console.error('Błąd podczas przesyłania pliku:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Nieznany błąd';
      onError(`Błąd: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalLoad = () => {
    if (!file) {
      onError('Proszę wybrać plik .ifc');
      return;
    }

    if (onLocalLoad) {
      setUploadStatus('Ładowanie pliku lokalnie...');
      onLocalLoad(file);
    }
  };

  const handleClear = () => {
    setFile(null);
    setUploadStatus('');
    onParsed({ elements: [], costs: null, element_count: 0, costs_calculated: false });
    onError('');
    // Reset file input
    const fileInput = document.getElementById('ifc-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-4 p-4" style={{ width: '280px', maxWidth: '90vw' }}>
      <h2 className="text-lg font-semibold">Prześlij plik IFC</h2>
      
      <div className="space-y-2">
        <input
          id="ifc-file-input"
          type="file"
          accept=".ifc"
          onChange={handleFileChange}
          className="hidden"
          style={{ pointerEvents: 'auto' }}
        />
        <label
          htmlFor="ifc-file-input"
          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
          style={{ pointerEvents: 'auto', userSelect: 'none' }}
        >
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : 'Wybierz plik .ifc'}
            </p>
          </div>
        </label>
      </div>

      {file && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p><strong>Plik:</strong> {file.name}</p>
          <p><strong>Rozmiar:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {onLocalLoad && (
            <Button onClick={handleLocalLoad} disabled={!file} variant="default" className="flex-1">
              🚀 Załaduj lokalnie
            </Button>
          )}
          <Button onClick={handleUpload} disabled={!file} variant="outline" className="flex-1">
            ☁️ Prześlij do backendu
          </Button>
          {file && (
            <Button onClick={handleClear} variant="outline" size="icon">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        {onLocalLoad && (
          <p className="text-xs text-muted-foreground text-center">
            💡 Używaj "Załaduj lokalnie" do pracy offline (bez kalkulacji kosztów)
          </p>
        )}
      </div>

      {uploadStatus && (
        <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm text-center">
          {uploadStatus}
        </div>
      )}
    </div>
  );
}

