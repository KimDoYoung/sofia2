import { useMemo } from 'react';
import type { RefObject } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, SelectionChangedEvent, ValueSetterParams } from 'ag-grid-community';
import { Button } from '@/shared/components/ui/button';
import { Link } from 'lucide-react';
import { formatDateTime, formatFileSize } from '@/lib/utils';
import type { ImageFile } from '../types';

interface ImageListViewProps {
  images: ImageFile[];
  gridRef: RefObject<AgGridReact | null>;
  refreshKey: number;
  onSelectionChanged: (event: SelectionChangedEvent) => void;
  onCellValueChanged: (event: CellValueChangedEvent) => void;
  onImageClick: (id: number) => void;
  onCopyLink: (id: number) => void;
}

export const ImageListView = ({
  images,
  gridRef,
  refreshKey,
  onSelectionChanged,
  onCellValueChanged,
  onImageClick,
  onCopyLink,
}: ImageListViewProps) => {
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      sortable: false,
      filter: false,
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    {
      headerName: '미리보기',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <img
          src={`/sofia/api/images/${params.data.id}/thumb?t=${refreshKey}`}
          className="w-16 h-16 object-cover rounded shadow-sm"
        />
      )
    },
    {
      field: 'orgName',
      headerName: '파일명',
      flex: 1,
      sortable: true,
      editable: true,
      cellEditor: 'agTextCellEditor',
      valueSetter: (params: ValueSetterParams) => {
        const newValue = params.newValue;
        if (!newValue || newValue.trim() === '') return false;

        const currentName = params.data.orgName;
        const dotIndex = currentName.lastIndexOf('.');
        const ext = dotIndex !== -1 ? currentName.substring(dotIndex) : '';

        let finalValue = newValue.trim();
        if (ext && !finalValue.toLowerCase().endsWith(ext.toLowerCase())) {
          finalValue += ext;
        }

        params.data.orgName = finalValue;
        return true;
      },
      cellRenderer: (params: any) => (
        <div className="flex items-center w-full justify-between group/cell">
          <button
            className="text-blue-600 hover:underline font-medium truncate"
            onClick={() => onImageClick(params.data.id)}
          >
            {params.value}
          </button>
        </div>
      )
    },
    { 
      field: 'imageFormat', 
      headerName: '포맷', 
      width: 100, 
      sortable: false, 
      filter: false, 
      valueFormatter: (p: any) => p.value?.toUpperCase() 
    },
    {
      headerName: '해상도',
      width: 140,
      sortable: false,
      filter: false,
      valueGetter: (p: any) => `${p.data.imageWidth} x ${p.data.imageHeight}`
    },
    {
      field: 'fileSize',
      headerName: '파일용량',
      width: 120,
      sortable: true,
      valueFormatter: (p: any) => formatFileSize(p.value),
      type: 'rightAligned'
    },
    {
      field: 'captureDateTime',
      headerName: '촬영일시',
      width: 220,
      sortable: true,
      valueFormatter: (p: any) => formatDateTime(p.value)
    },
    {
      field: 'note',
      headerName: '노트',
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor'
    },
    {
      headerName: '링크',
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-blue-600"
          onClick={() => onCopyLink(params.data.id)}
          title="이미지 링크 복사"
        >
          <Link size={14} />
        </Button>
      )
    },
  ], [onImageClick, onCopyLink, refreshKey]);

  return (
    <div className="w-full h-[650px] shadow-sm rounded-lg overflow-hidden border">
      <AgGridReact
        ref={gridRef}
        theme={themeQuartz}
        rowData={images}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: false,
          filter: true,
          resizable: true,
          cellStyle: { display: 'flex', alignItems: 'center' }
        }}
        rowSelection="multiple"
        suppressRowClickSelection={true}
        onSelectionChanged={onSelectionChanged}
        pagination={true}
        paginationPageSize={10}
        paginationPageSizeSelector={[7, 10, 15, 20, 30]}
        onCellValueChanged={onCellValueChanged}
        singleClickEdit={false}
        rowHeight={80}
      />
    </div>
  );
};
