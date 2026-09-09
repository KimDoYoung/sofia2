import { useEffect } from 'react';

/**
 * 모달이나 오버레이가 열려 있을 때(isOpen === true) Escape 키를 누르면 onEscape 콜백을 호출합니다.
 * disabled가 true이면 입력을 무시합니다 (예: 저장/생성 처리 진행 중일 때).
 */
export const useEscapeKey = (
  isOpen: boolean,
  onEscape: () => void,
  disabled: boolean = false
) => {
  useEffect(() => {
    if (!isOpen || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onEscape, disabled]);
};
