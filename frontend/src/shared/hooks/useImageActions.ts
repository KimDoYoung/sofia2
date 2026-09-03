import { useToast } from '@/shared/components/ui/use-toast';

export const useImageActions = () => {
  const { toast } = useToast();

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // 1. 최신 Clipboard API (HTTPS 또는 localhost 등 Secure Context 지원 브라우저)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed, fallback to execCommand:', err);
      }
    }

    // 2. 비보안 HTTP 환경(예: IP나 일반 도메인 HTTP 배포)을 위한 execCommand('copy') fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // 화면 밖으로 숨김 처리
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('execCommand copy failed:', err);
      return false;
    }
  };

  const copyLink = async (id: number) => {
    const url = `${window.location.origin}/sofia/api/images/${id}/raw`;
    const success = await copyToClipboard(url);
    if (success) {
      toast({ title: '성공', description: '이미지 링크가 복사되었습니다.' });
    } else {
      toast({ title: '오류', description: '링크 복사에 실패했습니다.', variant: 'destructive' });
    }
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
