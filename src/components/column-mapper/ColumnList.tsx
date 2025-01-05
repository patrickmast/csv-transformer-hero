import { Input } from '@/components/ui/input';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';
import ColumnPreview from './ColumnPreview';

interface ColumnListProps {
  title: ReactNode;
  columns: string[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedColumn: string | null;
  onColumnClick: (column: string) => void;
  isColumnMapped: (column: string) => boolean;
  searchPlaceholder: string;
  columnTransforms?: Record<string, string>;
  sourceData?: any[];
}

const ColumnList = ({
  title,
  columns,
  searchValue,
  onSearchChange,
  selectedColumn,
  onColumnClick,
  isColumnMapped,
  searchPlaceholder,
  columnTransforms = {},
  sourceData = []
}: ColumnListProps) => {
  const getPreviewValue = (column: string): string | null => {
    if (!sourceData.length) return null;

    const firstRow = sourceData[0];
    let value = firstRow[column];

    if (columnTransforms[column]) {
      try {
        const transform = new Function('value', 'row', `return ${columnTransforms[column]}`);
        value = transform(value, firstRow);
      } catch (error) {
        console.error(`Error computing preview for ${column}:`, error);
        value = 'Error in transform';
      }
    }

    return value !== undefined ? String(value) : null;
  };

  // First filter out mapped columns (for Winfakt columns only), then apply search filter
  const filteredColumns = columns
    .filter(column => title === "Source file columns" || !isColumnMapped(column))
    .filter(column => column.toLowerCase().includes(searchValue.toLowerCase()));

  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <Input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="mb-4 w-full"
      />
      <div className="space-y-2">
        {filteredColumns.map(column => (
          <ColumnPreview
            key={column}
            columnName={column}
            previewValue={getPreviewValue(column)}
            isSelected={selectedColumn === column}
            onClick={() => onColumnClick(column)}
          />
        ))}
      </div>
    </div>
  );
};

export default ColumnList;