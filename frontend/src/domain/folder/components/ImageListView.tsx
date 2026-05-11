import { useMemo, useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, SelectionChangedEvent, ValueSetterParams, ICellRendererParams, GridReadyEvent } from 'ag-grid-community';
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
  const apiRef = useRef<GridReadyEvent['api'] | null>(null);

  // 화면 크기별 컬럼 표시/숨김
  // 모바일(<640)  : id, 미리보기, 촬영일시
  // 태블릿(<1024) : id, 미리보기, 파일용량, 촬영일시
  // 데스크톱      : 전체
  const TABLET_ONLY  = ['fileSize'];
  const DESKTOP_ONLY = ['orgName', 'imageFormat', 'resolution', 'note', 'link'];

  const applyColumnVisibility = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const w = window.innerWidth;
    if (w < 640) {
      // 모바일: tablet + desktop 컬럼 숨김
      api.setColumnsVisible([...TABLET_ONLY, ...DESKTOP_ONLY], false);
    } else if (w < 1024) {
      // 태블릿: desktop 컬럼 숨김, tablet 컬럼 표시
      api.setColumnsVisible(DESKTOP_ONLY, false);
      api.setColumnsVisible(TABLET_ONLY, true);
    } else {
      // 데스크톱: 전체 표시
      api.setColumnsVisible([...TABLET_ONLY, ...DESKTOP_ONLY], true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => applyColumnVisibility();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [applyColumnVisibility]);

  const columnDefs = useMemo<ColDef<ImageFile>[]>(() => [
    {
      colId: 'id',
      field: 'id',
      headerName: 'ID',
      width: 100,
      sortable: false,
      filter: false,
      checkboxSelection: true,
      headerCheckboxSelection: true,
    },
    {
      colId: 'preview',
      headerName: '미리보기',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<ImageFile>) => (
        <img
          src={`/sofia/api/images/${params.data?.id}/thumb?t=${refreshKey}`}
          className="w-16 h-16 object-cover rounded shadow-sm"
        />
      )
    },
    {
      colId: 'orgName',
      field: 'orgName',
      headerName: '파일명',
      flex: 1,
      sortable: true,
      editable: true,
      cellEditor: 'agTextCellEditor',
      valueSetter: (params: ValueSetterParams<ImageFile>) => {
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
      cellRenderer: (params: ICellRendererParams<ImageFile>) => (
        <div className="flex items-center w-full justify-between group/cell">
          <button
            className="text-blue-600 hover:underline font-medium truncate"
            onClick={() => onImageClick(params.data!.id)}
          >
            {params.value}
          </button>
        </div>
      )
    },
    {
      colId: 'imageFormat',
      field: 'imageFormat',
      headerName: '포맷',
      width: 100,
      sortable: false,
      filter: false,
      valueFormatter: (p) => p.value?.toUpperCase() || ''
    },
    {
      colId: 'resolution',
      headerName: '해상도',
      width: 140,
      sortable: false,
      filter: false,
      valueGetter: (p) => p.data ? `${p.data.imageWidth} x ${p.data.imageHeight}` : ''
    },
    {
      colId: 'fileSize',
      field: 'fileSize',
      headerName: '파일용량',
      width: 120,
      sortable: true,
      valueFormatter: (p) => p.value ? formatFileSize(p.value) : '',
      type: 'rightAligned'
    },
    {
      colId: 'captureDateTime',
      field: 'captureDateTime',
      headerName: '촬영일시',
      width: 220,
      sortable: true,
      valueFormatter: (p) => p.value ? formatDateTime(p.value) : ''
    },
    {
      colId: 'note',
      field: 'note',
      headerName: '노트',
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor'
    },
    {
      colId: 'link',
      headerName: '링크',
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<ImageFile>) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-blue-600"
          onClick={() => onCopyLink(params.data!.id)}
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
        onGridReady={(e) => {
          apiRef.current = e.api;
          applyColumnVisibility();
        }}
      />
    </div>
  );
};
