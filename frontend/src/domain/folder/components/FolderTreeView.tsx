import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen,
  Search, 
  Edit3, 
  Check, 
  X, 
  Plus, 
  ChevronsUpDown
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface ImageFolder {
  id: number;
  folderName: string;
  lastLoadTime: string;
  note: string;
}

interface FolderTreeNode {
  name: string;
  path: string;
  folder?: ImageFolder;
  children: FolderTreeNode[];
}

interface FlatFolderNode {
  name: string;
  path: string;
  depth: number;
  hasChildren: boolean;
  isOpen: boolean;
  folder?: ImageFolder;
}

// Helper: Convert flat registered folders into a hierarchical tree
const buildTree = (folders: ImageFolder[]): FolderTreeNode[] => {
  if (!folders) return [];
  const root: FolderTreeNode = { name: '', path: '', children: [] };
  
  const getOrCreateChild = (parent: FolderTreeNode, name: string, path: string): FolderTreeNode => {
    let child = parent.children.find(c => c.name === name);
    if (!child) {
      child = { name, path, children: [] };
      parent.children.push(child);
    }
    return child;
  };

  folders.forEach(folder => {
    if (!folder.folderName) return;
    const parts = folder.folderName.split('/');
    let current = root;
    let currentPath = '';
    
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      current = getOrCreateChild(current, part, currentPath);
      if (index === parts.length - 1) {
        current.folder = folder;
      }
    });
  });

  // Sort children alphabetically at each level
  const sortTree = (node: FolderTreeNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortTree);
  };
  sortTree(root);

  return root.children;
};

// Helper: Traverse tree to find all paths that have children (for Expand All)
const getAllPathsWithChildren = (nodes: FolderTreeNode[], result: string[] = []): string[] => {
  nodes.forEach(node => {
    if (node.children.length > 0) {
      result.push(node.path);
      getAllPathsWithChildren(node.children, result);
    }
  });
  return result;
};

// Helper: Filter tree nodes based on search term
const filterTree = (
  nodes: FolderTreeNode[],
  searchTerm: string,
  autoExpandPaths: Set<string>
): FolderTreeNode[] => {
  if (!searchTerm) return nodes;
  const term = searchTerm.toLowerCase();

  const filterNode = (node: FolderTreeNode): FolderTreeNode | null => {
    const isNameMatch = node.name.toLowerCase().includes(term);
    const isNoteMatch = node.folder?.note?.toLowerCase().includes(term) || false;
    const isPathMatch = node.path.toLowerCase().includes(term);
    const isMatch = isNameMatch || isNoteMatch || isPathMatch;

    const filteredChildren: FolderTreeNode[] = [];
    node.children.forEach(child => {
      const filteredChild = filterNode(child);
      if (filteredChild) {
        filteredChildren.push(filteredChild);
      }
    });

    if (isMatch || filteredChildren.length > 0) {
      if (filteredChildren.length > 0) {
        autoExpandPaths.add(node.path);
      }
      return {
        ...node,
        children: filteredChildren
      };
    }
    return null;
  };

  return nodes
    .map(filterNode)
    .filter((n): n is FolderTreeNode => n !== null);
};

// Helper: Flatten tree to visible nodes list
const flattenTree = (
  nodes: FolderTreeNode[],
  depth = 0,
  expandedPaths: Set<string>,
  result: FlatFolderNode[] = []
): FlatFolderNode[] => {
  nodes.forEach(node => {
    const hasChildren = node.children.length > 0;
    const isOpen = expandedPaths.has(node.path);
    
    result.push({
      name: node.name,
      path: node.path,
      depth,
      hasChildren,
      isOpen,
      folder: node.folder
    });
    
    if (hasChildren && isOpen) {
      flattenTree(node.children, depth + 1, expandedPaths, result);
    }
  });
  return result;
};

interface NoteCellProps {
  folder: ImageFolder;
  onSave: (id: number, note: string) => void;
  isSaving: boolean;
}

const NoteCell = ({ folder, onSave, isSaving }: NoteCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(folder.note || '');

  useEffect(() => {
    setValue(folder.note || '');
  }, [folder.note]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(folder.id, value);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setValue(folder.note || '');
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (value !== (folder.note || '')) {
      onSave(folder.id, value);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          className="h-8 py-1 px-2 text-sm w-full bg-white border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500"
          disabled={isSaving}
        />
        <button
          onClick={() => {
            onSave(folder.id, value);
            setIsEditing(false);
          }}
          className="p-1 hover:bg-green-50 text-green-600 rounded transition-colors shrink-0"
          title="저장"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => {
            setValue(folder.note || '');
            setIsEditing(false);
          }}
          className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors shrink-0"
          title="취소"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="group flex items-center justify-between cursor-pointer min-h-[32px] px-2 py-1 -mx-2 rounded hover:bg-slate-50 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <span className={`text-sm truncate pr-2 ${folder.note ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
        {folder.note || '비고 없음'}
      </span>
      <Edit3 
        size={14} 
        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" 
      />
    </div>
  );
};

interface FolderTreeViewProps {
  folders: ImageFolder[];
  onUpdateNote: (id: number, note: string) => void;
  onDeleteFolder: (id: number, folderName: string) => void;
  isUpdatingNote?: boolean;
}

const FolderTreeView = ({ 
  folders, 
  onUpdateNote, 
  onDeleteFolder, 
  isUpdatingNote = false 
}: FolderTreeViewProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Build the hierarchical tree from registered folders
  const baseTree = useMemo(() => buildTree(folders), [folders]);

  // Expand all first-level folders by default on initial load
  useEffect(() => {
    if (baseTree.length > 0 && expandedPaths.size === 0) {
      const initialPaths = baseTree.map(node => node.path);
      setExpandedPaths(new Set(initialPaths));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTree]);

  // Filter and flatten the tree
  const { displayNodes, autoExpandedPaths } = useMemo(() => {
    const autoExpand = new Set<string>();
    const filtered = searchTerm ? filterTree(baseTree, searchTerm, autoExpand) : baseTree;
    
    // Combine manual expands and automatic expands from filter matching
    const activeExpanded = new Set<string>([...expandedPaths, ...autoExpand]);
    const flattened = flattenTree(filtered, 0, activeExpanded);
    
    return { displayNodes: flattened, autoExpandedPaths: autoExpand };
  }, [baseTree, searchTerm, expandedPaths]);

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allPaths = getAllPathsWithChildren(baseTree);
    setExpandedPaths(new Set(allPaths));
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Toolbar Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="폴더명 또는 비고로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 border-gray-200 focus-visible:ring-blue-500 bg-gray-50/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 text-gray-400 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tree Control Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExpandAll}
            className="h-9 text-xs text-gray-600 border-gray-200"
          >
            <ChevronsUpDown size={14} className="mr-1.5 text-gray-400" />
            전체 펼치기
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCollapseAll}
            className="h-9 text-xs text-gray-600 border-gray-200"
          >
            <X size={14} className="mr-1.5 text-gray-400" />
            전체 접기
          </Button>
        </div>
      </div>

      {/* Tree Data Table */}
      {displayNodes.length > 0 ? (
        <div className="w-full overflow-x-auto bg-white rounded-xl shadow-md border border-gray-150/80">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm text-gray-500 table-fixed">
            <colgroup>
              <col className="w-[45%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-700">
              <tr>
                <th className="px-6 py-4">폴더명 (계층형 트리)</th>
                <th className="px-6 py-4 text-center">ID</th>
                <th className="px-6 py-4">마지막 로드 시간</th>
                <th className="px-6 py-4">비고</th>
                <th className="px-6 py-4 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {displayNodes.map((node) => {
                const isRegistered = !!node.folder;
                const isExpanded = expandedPaths.has(node.path) || autoExpandedPaths.has(node.path);

                return (
                  <tr 
                    key={node.path} 
                    className={`transition-colors border-l-2 ${
                      isRegistered 
                        ? 'hover:bg-gray-50/60 border-l-blue-500' 
                        : 'bg-slate-50/15 text-slate-400 border-l-transparent hover:bg-slate-50/30'
                    }`}
                  >
                    {/* Folder Name with indentation */}
                    <td className="px-6 py-3 font-medium text-gray-950">
                      <div 
                        className="flex items-center"
                        style={{ paddingLeft: `${node.depth * 1.5}rem` }}
                      >
                        {/* Toggle button */}
                        <button
                          onClick={() => node.hasChildren && toggleExpand(node.path)}
                          className={`p-1 mr-1 rounded hover:bg-gray-100 text-gray-400 transition-colors shrink-0 ${
                            node.hasChildren ? 'visible' : 'invisible'
                          }`}
                        >
                          {node.hasChildren ? (
                            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </button>

                        {/* Folder icon */}
                        <span className="mr-2.5 shrink-0">
                          {isRegistered ? (
                            isExpanded ? (
                              <FolderOpen size={18} className="text-amber-500 fill-amber-100/30" />
                            ) : (
                              <Folder size={18} className="text-amber-500 fill-amber-100/30" />
                            )
                          ) : (
                            isExpanded ? (
                              <FolderOpen size={18} className="text-slate-350 fill-slate-100/20" />
                            ) : (
                              <Folder size={18} className="text-slate-350 fill-slate-100/20" />
                            )
                          )}
                        </span>

                        {/* Folder link / path segment name */}
                        {isRegistered ? (
                          <button
                            className="text-left font-bold text-blue-600 hover:underline hover:text-blue-700 transition-all truncate hover:scale-[1.01] origin-left duration-150"
                            onClick={() => navigate(`/folder/${node.folder!.id}`)}
                          >
                            {node.name}
                          </button>
                        ) : (
                          <span 
                            className="font-medium text-gray-400 cursor-pointer select-none truncate"
                            onClick={() => node.hasChildren && toggleExpand(node.path)}
                          >
                            {node.name}
                            <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 py-0.5 px-1.5 rounded-full font-normal uppercase tracking-wide">
                              상위 경로
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ID */}
                    <td className="px-6 py-3 text-center font-mono text-xs text-gray-400">
                      {isRegistered ? node.folder!.id : '—'}
                    </td>

                    {/* Last Load Time */}
                    <td className="px-6 py-3 text-xs text-gray-600">
                      {isRegistered && node.folder!.lastLoadTime 
                        ? formatDate(node.folder!.lastLoadTime) 
                        : '—'}
                    </td>

                    {/* Note (Editable inline) */}
                    <td className="px-6 py-3">
                      {isRegistered ? (
                        <NoteCell 
                          folder={node.folder!} 
                          onSave={onUpdateNote}
                          isSaving={isUpdatingNote}
                        />
                      ) : (
                        <span className="text-gray-300 select-none">—</span>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-6 py-3 text-center">
                      {isRegistered ? (
                        <button
                          title="폴더 삭제"
                          onClick={() => onDeleteFolder(node.folder!.id, node.folder!.folderName)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-100 bg-transparent text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-[0_2px_8px_rgba(239,68,68,0.25)] transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span className="text-gray-300 select-none">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 py-16 text-center">
          <Folder size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-700">검색 결과가 없습니다.</h3>
          <p className="text-gray-400 text-sm mt-1">다른 검색어를 입력하거나 새 폴더를 등록해 보세요.</p>
          <Button 
            onClick={() => navigate('/folder/add')}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Plus size={16} className="mr-1.5" />
            새 폴더 추가
          </Button>
        </div>
      )}
    </div>
  );
};

export default FolderTreeView;
