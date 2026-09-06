import { useState, useEffect } from 'react';
import { Pencil, FileText, Trash2, RotateCw, RotateCcw, CheckCircle2, MessageSquare, Link } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useImageActions } from '@/shared/hooks/useImageActions';

interface ImageThumbCard1Props {
    image: {
        id: number;
        orgName: string;
        note?: string;
    };
    isSelected: boolean;
    refreshKey?: number;
    onImageClick: (id: number) => void;
    onSelect: (id: number) => void;
    onRename: (id: number) => void;
    onAddNote: (id: number) => void;
    onDelete: (id: number) => void;
    onRotate: (id: number, angle: number) => void;
}

export function ImageThumbCard1({
    image,
    isSelected,
    refreshKey = 0,
    onImageClick,
    onSelect,
    onRename,
    onAddNote,
    onDelete,
    onRotate,
}: ImageThumbCard1Props) {
    const { copyLink } = useImageActions();
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!isHovered) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            const code = e.code;
            const key = e.key.toLowerCase();

            if (code === 'Space' || key === ' ') {
                e.preventDefault();
                onSelect(image.id);
            } else if (code === 'KeyC' || key === 'c' || key === 'ㅊ') {
                e.preventDefault();
                onRotate(image.id, 90);
            } else if (code === 'KeyA' || key === 'a' || key === 'ㅁ') {
                e.preventDefault();
                onRotate(image.id, -90);
            } else if (code === 'KeyR' || key === 'r' || key === 'ㄱ') {
                e.preventDefault();
                onRename(image.id);
            } else if (code === 'KeyN' || key === 'n' || key === 'ㅜ') {
                e.preventDefault();
                onAddNote(image.id);
            } else if (code === 'KeyL' || key === 'l' || key === 'ㅣ') {
                e.preventDefault();
                copyLink(image.id);
            } else if (code === 'KeyD' || key === 'd' || key === 'ㅇ') {
                e.preventDefault();
                onDelete(image.id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, image.id, onSelect, onRotate, onRename, onAddNote, copyLink, onDelete]);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={(e) => e.stopPropagation()}
            className={cn(
                "group relative flex flex-col bg-white rounded-lg border transition-all duration-200 overflow-hidden shadow-sm",
                isSelected ? "ring-2 ring-blue-500 border-transparent shadow-md" : "border-gray-200 hover:border-blue-300"
            )}
        >
            {/* 1. 이미지 영역 (클릭 시 확대/보기) */}
            <div
                className="relative aspect-square bg-gray-50 cursor-pointer overflow-hidden"
                onClick={() => onImageClick(image.id)}
            >
                <img
                    src={`/sofia/api/images/${image.id}/thumb?t=${refreshKey}`}
                    alt={image.orgName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* 선택 체크박스 (좌측 상단) */}
                <div
                    title="선택(Space)"
                    className={cn(
                        "absolute top-2 left-2 z-10 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => { e.stopPropagation(); onSelect(image.id); }}
                >
                    {isSelected ? (
                        <CheckCircle2 size={20} className="text-blue-600 fill-white" />
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white bg-black/20" />
                    )}
                </div>

                {/* 이미지 위 호버 시 노트 노출 (하단 배치) */}
                {image.note && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <p className="text-white text-[10px] line-clamp-2 leading-tight">
                            {image.note}
                        </p>
                    </div>
                )}
            </div>

            {/* 2. 하단 정보 및 기능 영역 */}
            <div className="p-1 space-y-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    {image.note && (
                        <MessageSquare size={12} className="text-blue-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-gray-700 truncate leading-tight" title={image.orgName}>
                        {image.orgName}
                    </span>
                </div>

                {/* 하단 기능 버튼 모음 */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-0.5">
                    <Button
                        variant="ghost" size="icon" className="flex-1 h-6 min-w-0 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 [&_svg]:size-3"
                        onClick={(e) => { e.stopPropagation(); onRotate(image.id, 90); }}
                        title="90도 시계방향 회전(c)"
                    >
                        <RotateCw />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="flex-1 h-6 min-w-0 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 [&_svg]:size-3"
                        onClick={(e) => { e.stopPropagation(); onRotate(image.id, -90); }}
                        title="90도 반시계방향 회전(a)"
                    >
                        <RotateCcw />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="flex-1 h-6 min-w-0 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 [&_svg]:size-3"
                        onClick={(e) => { e.stopPropagation(); onRename(image.id); }}
                        title="이름 바꾸기(r)"
                    >
                        <Pencil />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="flex-1 h-6 min-w-0 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 [&_svg]:size-3"
                        onClick={(e) => { e.stopPropagation(); onAddNote(image.id); }}
                        title="노트 기록(n)"
                    >
                        <FileText />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="flex-1 h-6 min-w-0 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 [&_svg]:size-3"
                        onClick={(e) => { e.stopPropagation(); copyLink(image.id); }}
                        title="링크 복사(l)"
                    >
                        <Link />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="flex-1 h-6 min-w-0 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 [&_svg]:size-3"
                        onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                        title="삭제(d)"
                    >
                        <Trash2 />
                    </Button>
                </div>
            </div>
        </div>
    );
}