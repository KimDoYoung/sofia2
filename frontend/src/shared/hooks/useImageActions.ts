import { useToast } from '@/shared/components/ui/use-toast';

export const useImageActions = () => {
  const { toast } = useToast();

  const copyLink = (id: number) => {
    const url = `${window.location.origin}/sofia/api/images/${id}/raw`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: '성공', description: '이미지 링크가 복사되었습니다.' });
    }).catch(() => {
      toast({ title: '오류', description: '링크 복사에 실패했습니다.', variant: 'destructive' });
    });
  };

  const downloadImage = (id: number, orgName: string) => {
    const link = document.createElement('a');
    link.href = `/sofia/api/images/${id}/raw`;
    link.download = orgName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    copyLink,
    downloadImage,
  };
};
