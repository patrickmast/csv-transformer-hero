import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { ColumnMapperProps } from './column-mapper/types';
import { useMappingState } from './column-mapper/useMappingState';
import { useConfiguration } from '@/hooks/use-configuration';
import SavedConfigDialog from './column-mapper/SavedConfigDialog';
import ColumnMapperContent from './column-mapper/ColumnMapperContent';
import { downloadCSV } from '@/utils/csvUtils';

const ColumnMapper = ({ 
  targetColumns, 
  onMappingChange, 
  onExport, 
  onDataLoaded,
  activeColumnSet,
  onColumnSetChange 
}: ColumnMapperProps) => {
  const [state, updateState] = useMappingState(onMappingChange);
  const { saveConfiguration, isSaving } = useConfiguration();
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [savedConfigUrl, setSavedConfigUrl] = useState('');
  
  useEffect(() => {
    updateState({
      mapping: {},
      columnTransforms: {}
    });
  }, [activeColumnSet]);

  const handleFileData = (columns: string[], data: any[]) => {
    updateState({
      sourceColumns: columns,
      sourceData: data,
      mapping: {},
      columnTransforms: {},
      selectedSourceColumn: null,
      selectedTargetColumn: null,
      sourceSearch: '',
      targetSearch: '',
      connectionCounter: 0
    });
    onDataLoaded(data);
  };

  const handleExport = () => {
    const transformedData = state.sourceData.map(row => {
      const newRow: Record<string, any> = {};
      Object.entries(state.mapping).forEach(([uniqueKey, target]) => {
        const sourceColumn = uniqueKey.split('_')[0];
        let value = row[sourceColumn];
        
        if (state.columnTransforms[uniqueKey]) {
          try {
            const transform = new Function('value', 'row', `return ${state.columnTransforms[uniqueKey]}`);
            value = transform(value, row);
          } catch (error) {
            console.error(`Error transforming column ${sourceColumn}:`, error);
          }
        }
        
        newRow[target] = value;
      });
      return newRow;
    });
    
    downloadCSV(transformedData, 'converted.csv');
    toast({
      title: "Export successful",
      description: "Your file has been converted and downloaded",
    });
  };

  const handleSaveConfiguration = async () => {
    const result = await saveConfiguration(
      state.mapping,
      state.columnTransforms
    );

    if (result) {
      const configUrl = `${window.location.origin}/preview/${result.id}`;
      setSavedConfigUrl(configUrl);
      setShowSavedDialog(true);
    }
  };

  return (
    <>
      <SavedConfigDialog
        open={showSavedDialog}
        onOpenChange={setShowSavedDialog}
        configUrl={savedConfigUrl}
      />
      <ColumnMapperContent
        state={state}
        updateState={updateState}
        targetColumns={targetColumns}
        activeColumnSet={activeColumnSet}
        onColumnSetChange={onColumnSetChange}
        onDataLoaded={handleFileData}
        onExport={handleExport}
      />
    </>
  );
};

export default ColumnMapper;