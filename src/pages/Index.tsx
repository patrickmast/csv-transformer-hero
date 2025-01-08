import { useState } from 'react';
import ColumnMapper from '../components/ColumnMapper';
import { useToast } from '../components/ui/use-toast';
import { downloadCSV } from '../utils/csvUtils';
import { Menu, Save, Plus, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useConfiguration } from '@/hooks/use-configuration';
import SavedConfigDialog from '@/components/column-mapper/SavedConfigDialog';

const Index = () => {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [activeColumnSet, setActiveColumnSet] = useState<'artikelen' | 'klanten'>('artikelen');
  const { toast } = useToast();
  const { saveConfiguration, isSaving } = useConfiguration();
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [savedConfigUrl, setSavedConfigUrl] = useState('');

  const handleMappingChange = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
  };

  const handleExport = (mapping: Record<string, string>) => {
    const mappedData = sourceData.map(row => {
      const newRow: Record<string, any> = {};
      Object.entries(mapping).forEach(([source, target]) => {
        if (source && target) {
          newRow[target] = row[source];
        }
      });
      return newRow;
    });

    downloadCSV(mappedData, 'converted.csv');
    toast({
      title: "Export successful",
      description: "Your file has been converted and downloaded",
    });
  };

  const handleSaveConfiguration = async (isNewConfig: boolean = true) => {
    const currentFile = window.currentUploadedFile;
    if (!currentFile) {
      toast({
        title: "Error",
        description: "Please upload a file first",
        variant: "destructive",
      });
      return;
    }

    const result = await saveConfiguration(
      currentFile,
      currentFile.name,
      columnMapping,
      {},
      isNewConfig
    );

    if (result) {
      setCurrentConfigId(result.id);
      if (isNewConfig) {
        const configUrl = `${window.location.origin}/preview/${result.id}`;
        setSavedConfigUrl(configUrl);
        setShowSavedDialog(true);
      } else {
        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SavedConfigDialog
        open={showSavedDialog}
        onOpenChange={setShowSavedDialog}
        configUrl={savedConfigUrl}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CSV/Excel Converter</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => handleSaveConfiguration(true)}
                disabled={isSaving}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Save as New</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleSaveConfiguration(false)}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                <span>Save</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Info className="mr-2 h-4 w-4" />
                    <span>Info</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>About CSV Transformer</AlertDialogTitle>
                    <AlertDialogDescription>
                      Version 1.0.0
                      {currentConfigId && (
                        <div className="mt-2">
                          Configuration ID: {currentConfigId}
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <ColumnMapper 
          onMappingChange={handleMappingChange}
          onExport={handleExport}
          onDataLoaded={setSourceData}
          targetColumns={activeColumnSet === 'artikelen' ? ARTIKEL_COLUMNS : KLANTEN_COLUMNS}
          activeColumnSet={activeColumnSet}
          onColumnSetChange={setActiveColumnSet}
        />
      </div>
    </div>
  );
};

const ARTIKEL_COLUMNS = [
  "Actief?", "Stock verwerken?", "Artikelnummer", "Omschrijving", "Omschrijving NL",
  "Omschrijving GB", "Omschrijving DE", "Omschrijving FR", "Omschrijving TR",
  "BTW-percentage", "Netto verkoopprijs 1", "Netto verkoopprijs 2", "Netto verkoopprijs 3",
  "Netto verkoopprijs 4", "Netto verkoopprijs 5", "Netto verkoopprijs 6", "Netto verkoopprijs 7",
  "Netto verkoopprijs 8", "Netto verkoopprijs 9", "Netto verkoopprijs 10", "Netto aankoopprijs",
  "Catalogusprijs", "Artikelnummer fabrikant", "Artikelnummer leverancier", "Leveranciersnummer",
  "merk", "Recupel", "Auvibel", "Bebat", "Reprobel", "Leeggoed", "Accijnzen", "Ecoboni",
  "Barcode", "Rekeningnummer", 
  ...Array.from({length: 20}, (_, i) => `Numeriek extra veld ${i + 1}`),
  ...Array.from({length: 20}, (_, i) => `Alfanumeriek extra veld ${i + 1}`),
  ...Array.from({length: 20}, (_, i) => `Logisch extra veld ${i + 1}`),
  ...Array.from({length: 9}, (_, i) => `Voorraad locatie ${i + 1}`),
  ...Array.from({length: 9}, (_, i) => `Voorraad locatie ${i + 1} toevoegen`),
  "Is beginstock", "Hoofdgroep", "Subgroep", "Eenheid", "Korting uitgeschakeld",
  "Gemarkeerd voor label printer", "Aantal 2", "intrastat-excnt", "intrastat-extreg",
  "intrastat-extgo", "intrastat-exweight", "intrastat-excntori"
];

const KLANTEN_COLUMNS = [
  "nr", "company-name", "firstname", "lastname", "address-line-1", "postal", "city",
  "country-code", "email", "lng", "info", "phone", "mobile", "vat", "payment-days",
  "payment-end-month",
  ...Array.from({length: 20}, (_, i) => `ev-num-${i + 1}`),
  ...Array.from({length: 20}, (_, i) => `ev-text-${i + 1}`),
  ...Array.from({length: 20}, (_, i) => `ev-bool-${i + 1}`)
];

export default Index;