import { useRef, useState } from 'react';
import { VanillaMenu } from '../vanilla/react/VanillaMenu';
import '@/components/vanilla/Menu.css';
import { VanillaCard } from '../vanilla/react/VanillaCard';
import { VanillaDialog } from '../vanilla/react/VanillaDialog';
import Papa from 'papaparse';
import { toast } from '@/components/ui/use-toast';
import { useToast } from '@/components/ui/use-toast';
import { parseDBF } from '@/utils/dbfParser';

// Add XLSX to window type
declare global {
  interface Window {
    XLSX: any;
  }
}

// @ts-ignore
const XLSX = window.XLSX;

// Add a function to check if XLSX is loaded
const isXLSXLoaded = () => {
  return typeof window.XLSX !== 'undefined';
};

interface HeaderProps {
  activeColumnSet: string;
  onColumnSetChange: (columnSet: string) => void;
  onDataLoaded: (headers: string[], data: any[], sourceFilename: string, worksheetName: string, fileSize?: number, metadata?: any) => void;
  currentMapping?: Record<string, string>;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

interface WorkbookState {
  workbook: any;
  fileName: string;
  fileSize: number;
}

const Header = ({
  activeColumnSet,
  onColumnSetChange,
  onDataLoaded,
  currentMapping,
  isLoading,
  onLoadingChange
}: HeaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContentRef = useRef<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [currentWorkbook, setCurrentWorkbook] = useState<WorkbookState | null>(null);
  const [currentWorksheet, setCurrentWorksheet] = useState<string | null>(null);
  const { toast } = useToast();

  const processExcelWorksheet = (workbook: any, sheetName: string, fileName: string, fileSize: number) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      const headers = rawData[0].map(String);
      const jsonData = rawData.slice(1).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = String(row[index] ?? '');
        });
        return obj;
      });
      onDataLoaded(headers, jsonData, fileName, sheetName, fileSize);
    } catch (error) {
      console.error('Error processing worksheet:', error);
      toast({
        title: "Error",
        description: "Failed to process the selected worksheet.",
        variant: "destructive"
      });
    } finally {
      onLoadingChange(false);
      setShowSheetSelector(false);
      setCurrentWorkbook(null);
      setCurrentWorksheet(null);
      setAvailableSheets([]);
    }
  };

  const handleSheetSelect = (sheetName: string) => {
    if (currentWorkbook) {
      processExcelWorksheet(currentWorkbook.workbook, sheetName, currentWorkbook.fileName, currentWorkbook.fileSize);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file || file.size === 0) {
      console.error('Invalid file: File is empty or does not exist');
      toast({
        title: "Invalid File",
        description: "The selected file is empty. Please choose a valid file.",
        variant: "destructive"
      });
      return;
    }

    onLoadingChange(true);

    const lowerFileName = file.name.toLowerCase();
    if (lowerFileName.endsWith('.csv')) {
      let headers: string[] | undefined;
      const allData: Record<string, string>[] = [];
      let totalRows = 0;
      let skippedRows = 0;

      Papa.parse(file, {
        header: false,
        skipEmptyLines: false,  
        chunk: (results, parser) => {
          try {
            results.data.forEach((row: any[], index: number) => {
              totalRows++;
              
              const isEmptyRow = Array.isArray(row) && (
                row.length === 0 || 
                row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')
              );
              
              if (isEmptyRow) {
                skippedRows++;
                return;
              }

              if (!headers) {
                headers = row.map(h => String(h || '').trim());
                return;
              }
              
              const obj: Record<string, string> = {};
              headers.forEach((header: string, index: number) => {
                obj[header] = String(row[index] ?? '').trim();
              });
              allData.push(obj);
            });
          } catch (error) {
            throw error;
          }
        },
        complete: () => {
          try {
            if (headers && allData.length > 0) {
              const metadata = {
                skippedRows,
                totalRows: totalRows - 1  
              };
              onDataLoaded(headers, allData, file.name, undefined, file.size, metadata);
            } else {
              toast({
                title: "Error",
                description: "The CSV file appears to be empty or missing headers.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error processing CSV:', error);
            toast({
              title: "Error",
              description: "Failed to parse CSV file. Please check the file format.",
              variant: "destructive"
            });
          } finally {
            onLoadingChange(false);
          }
        },
        error: (error) => {
          console.error('Papa Parse error:', error);
          toast({
            title: "Error",
            description: "Error processing CSV file: " + error.message,
            variant: "destructive"
          });
          onLoadingChange(false);
        }
      });
    } else if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls')) {
      if (!isXLSXLoaded()) {
        toast({
          title: "Loading Excel Support",
          description: "Please wait while Excel support is being loaded...",
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!isXLSXLoaded()) {
          console.log('XLSX still not loaded after waiting');
          toast({
            title: "Error",
            description: "Excel support could not be loaded. Please try refreshing the page or use CSV files instead.",
            variant: "destructive"
          });
          onLoadingChange(false);
          return;
        }
      }

      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });

            if (workbook.SheetNames.length > 1) {
              const sheets = [...workbook.SheetNames]; 
              setAvailableSheets(sheets);
              setShowSheetSelector(true);
              setCurrentWorkbook({
                workbook,
                fileName: file.name,
                fileSize: file.size
              });
            } else {
              const firstSheet = workbook.SheetNames[0];
              processExcelWorksheet(workbook, firstSheet, file.name, file.size);
            }
          } catch (error) {
            console.error('Error parsing Excel:', error);
            toast({
              title: "Error",
              description: "Failed to parse Excel file. Please check the file format.",
              variant: "destructive"
            });
            onLoadingChange(false);
          } finally {
            reader.onload = null;
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error loading Excel file:', error);
        toast({
          title: "Error",
          description: "Failed to load Excel file. Please try again.",
          variant: "destructive"
        });
        onLoadingChange(false);
      }
    } else if (lowerFileName.endsWith('.dbf')) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              throw new Error('Failed to read file');
            }

            const records = await parseDBF(arrayBuffer);
            if (records && records.length > 0) {
              const headers = Object.keys(records[0]);
              onDataLoaded(headers, records, file.name, undefined, file.size);
            } else {
              toast({
                title: "Error",
                description: "The DBF file appears to be empty or invalid.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error parsing DBF:', error);
            toast({
              title: "Error",
              description: "Failed to parse DBF file. Please check the file format.",
              variant: "destructive"
            });
          } finally {
            onLoadingChange(false);
          }
        };

        reader.onerror = () => {
          console.error('Error reading file');
          toast({
            title: "Error",
            description: "Failed to read DBF file.",
            variant: "destructive"
          });
          onLoadingChange(false);
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error handling DBF file:', error);
        toast({
          title: "Error",
          description: "Failed to process DBF file.",
          variant: "destructive"
        });
        onLoadingChange(false);
      }
    } else if (lowerFileName.endsWith('.soc')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) {
            throw new Error('Failed to read file');
          }

          const lines = text.split('\n');
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(header => header.trim());
            const data = lines.slice(1).map(line => {
              const values = line.split(',');
              const obj: Record<string, string> = {};
              headers.forEach((header, index) => {
                obj[header] = values[index]?.trim() || '';
              });
              return obj;
            });
            onDataLoaded(headers, data, file.name, undefined, file.size);
          } else {
            toast({
              title: "Error",
              description: "The SOC file appears to be empty or invalid.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error parsing SOC:', error);
          toast({
            title: "Error",
            description: "Failed to parse SOC file. Please check the file format.",
            variant: "destructive"
          });
        } finally {
          onLoadingChange(false);
        }
      };

      reader.onerror = () => {
        console.error('Error reading file');
        toast({
          title: "Error",
          description: "Failed to read SOC file.",
          variant: "destructive"
        });
        onLoadingChange(false);
      };

      reader.readAsText(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a CSV, Excel, DBF, or SOC file.",
        variant: "destructive"
      });
      onLoadingChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePreviewFile = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewContentRef.current = e.target?.result as string;
        setShowPreview(true);
      };
      reader.readAsText(file);
    }
  };

  const hasFileSelected = fileInputRef.current?.files?.length > 0;

  return (
    <div className="flex items-center justify-between">
      <span>Source file columns</span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.dbf,.soc"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        data-testid="file-input"
      />
      <VanillaMenu
        items={[
          {
            label: isLoading ? 'Loading...' : 'Select file',
            onClick: isLoading ? undefined : handleSelectFile,
            disabled: isLoading,
            icon: isLoading ? (
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            )
          },
          {
            label: 'Select worksheet',
            onClick: () => setShowSheetSelector(true),
            disabled: !currentWorkbook || currentWorkbook.workbook.SheetNames.length <= 1,
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
            )
          },
          {
            label: 'Preview file',
            onClick: handlePreviewFile,
            disabled: !hasFileSelected || isLoading,
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )
          }
        ]}
      >
        {isLoading ? 'Loading...' : 'Source file'}
      </VanillaMenu>

      <VanillaDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        title="File Preview"
      >
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          maxHeight: '60vh',
          overflow: 'auto',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          lineHeight: '1.5'
        }}>
          {previewContentRef.current}
        </pre>
      </VanillaDialog>

      {showSheetSelector && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowSheetSelector(false)} />
            <div className="relative bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Worksheet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This Excel file contains {availableSheets.length} worksheets. Please select which one you'd like to use:
              </p>
              <div className="space-y-2">
                {availableSheets.map((sheetName) => (
                  <button
                    key={sheetName}
                    type="button"
                    onClick={() => handleSheetSelect(sheetName)}
                    className="w-full text-left px-4 py-2 text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <div className="flex items-center">
                      <div className="w-5 flex-shrink-0">
                        {currentWorksheet === sheetName ? (
                          <svg
                            className="h-4 w-4 text-green-500"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </div>
                      <span className="ml-2">{sheetName}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;