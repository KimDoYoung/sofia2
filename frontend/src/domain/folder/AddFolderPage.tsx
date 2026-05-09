import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  Plus
} from 'lucide-react';
import { Progress } from '@/shared/components/ui/progress';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/components/ui/use-toast';

interface FolderNode {
  name: string;
  path: string;
  isAlreadyAdded: boolean;
  children: FolderNode[];
}

interface TaskProgress {
  taskId: string;
  total: number;
  current: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  message: string;
}

const FolderTree = ({ 
  node, 
  onSelect, 
  selectedPath 
}: { 
  node: FolderNode; 
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  return (
    <div className="ml-4">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer group ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
        } ${node.isAlreadyAdded ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (!node.isAlreadyAdded) {
            onSelect(node.path);
          }
          if (hasChildren) setIsOpen(!isOpen);
        }}
      >
        <span className="w-4 h-4 flex items-center justify-center text-gray-400">
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : null}
        </span>
        <Folder size={18} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
        <span className="text-sm font-medium flex-1">{node.name}</span>
        {node.isAlreadyAdded && (
          <CheckCircle2 size={14} className="text-green-500" title="이미 추가됨" />
        )}
      </div>
      
      {isOpen && hasChildren && (
        <div className="border-l border-gray-200 ml-2">
          {node.children.map((child) => (
            <FolderTree 
              key={child.path} 
              node={child} 
              onSelect={onSelect} 
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AddFolderPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<TaskProgress | null>(null);

  const { data: tree, isLoading: isLoadingTree } = useQuery<FolderNode[]>({
    queryKey: ['folderTree'],
    queryFn: async () => {
      const res = await apiClient.get('/folders/tree');
      return res.data;
    },
  });

  const addFolderMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      const res = await apiClient.post('/folders/async', { folderName: folderPath });
      return res.data.taskId;
    },
    onSuccess: (id) => {
      setTaskId(id);
    },
    onError: () => {
      toast({ title: '오류', description: '폴더 추가 요청 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (taskId) {
      interval = setInterval(async () => {
        try {
          const res = await apiClient.get(`/folders/progress/${taskId}`);
          const data = res.data;
          setProgress(data);

          if (data.status === 'COMPLETED') {
            clearInterval(interval);
            queryClient.invalidateQueries({ queryKey: ['folders'] });
            toast({ title: '성공', description: '폴더 추가가 완료되었습니다.' });
            setTimeout(() => navigate('/'), 1500);
          } else if (data.status === 'FAILED') {
            clearInterval(interval);
            toast({ title: '오류', description: data.message || '처리 중 오류가 발생했습니다.', variant: 'destructive' });
            setTaskId(null);
          }
        } catch (error) {
          console.error('Progress fetch failed', error);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId, navigate, queryClient, toast]);

  const handleAddFolder = () => {
    if (selectedPath) {
      addFolderMutation.mutate(selectedPath);
    }
  };

  if (isLoadingTree) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <p className="text-gray-500">폴더 구조를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">새 폴더 추가</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[500px] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Folder size={20} className="text-blue-500" />
            이미지 폴더 탐색
          </h3>
          <div className="mt-2">
            {tree && tree.length > 0 ? (
              tree.map((node) => (
                <FolderTree 
                  key={node.path} 
                  node={node} 
                  onSelect={setSelectedPath} 
                  selectedPath={selectedPath} 
                />
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">탐색 가능한 폴더가 없습니다.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">선택한 폴더 정보</h3>
            {selectedPath ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 flex items-center gap-3">
                  <Folder size={24} />
                  <span className="font-mono text-sm break-all">{selectedPath}</span>
                </div>
                {!taskId && (
                  <Button 
                    className="w-full h-12 text-lg" 
                    onClick={handleAddFolder}
                    disabled={addFolderMutation.isPending}
                  >
                    {addFolderMutation.isPending ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Plus className="mr-2" />
                    )}
                    이 폴더 추가하기
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                좌측 트리에서 폴더를 선택해 주세요.
              </p>
            )}
          </div>

          {taskId && progress && (
            <div className="bg-white rounded-xl shadow-sm border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
                처리 진행률
                <span className="text-sm font-normal text-gray-500">
                  {progress.current} / {progress.total}
                </span>
              </h3>
              <Progress value={(progress.current / (progress.total || 1)) * 100} className="h-3" />
              <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
                {progress.status === 'COMPLETED' ? (
                  <CheckCircle2 className="text-green-500" size={18} />
                ) : (
                  <Loader2 className="animate-spin text-blue-500" size={18} />
                )}
                <span>
                  {progress.status === 'COMPLETED' 
                    ? '처리가 완료되었습니다. 목록으로 이동합니다...' 
                    : '이미지 정보를 분석하고 썸네일을 생성하고 있습니다...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFolderPage;
