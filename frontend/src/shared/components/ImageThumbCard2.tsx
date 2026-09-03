import { useState, useEffect } from 'react';
import { Pencil, FileText, Trash2, RotateCw, RotateCcw, CheckCircle2, Link } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';
import { useImageActions } from '@/shared/hooks/useImageActions';

interface ImageThumbCard2Props {
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

export function ImageThumbCard2({
    image,
    isSelected,
    refreshKey = 0,
    onImageClick,
    onSelect,
    onRename,
    onAddNote,
    onDelete,
    onRotate,
}: ImageThumbCard2Props) {
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
            className={cn(
                "group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border-2",
                isSelected ? "border-blue-500 ring-4 ring-blue-500/10" : "border-transparent hover:border-gray-200"
            )}
        >
            {/* 메인 이미지 영역 */}
            <div
                className="relative aspect-square cursor-pointer overflow-hidden"
                onClick={() => onImageClick(image.id)}
            >
                <img
                    src={`/sofia/api/images/${image.id}/thumb?t=${refreshKey}`}
                    alt={image.orgName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 선택 체크박스 */}
                <div
                    title="선택(Space)"
                    className={cn(
                        "absolute top-3 left-3 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                        isSelected
                            ? "bg-blue-600 scale-110 shadow-lg"
                            : "bg-white/80 border-2 border-white/50 opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => { e.stopPropagation(); onSelect(image.id); }}
                >
                    {isSelected && <CheckCircle2 size={16} className="text-white" />}
                </div>

                {/* 하단 텍스트 정보 오버레이 */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs font-bold truncate drop-shadow-md">
                        {image.orgName}
                    </p>
                    <p className="text-[10px] text-gray-200 truncate opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                        {image.note || "No notes..."}
                    </p>
                </div>
            </div>

            {/* 하단 액션 바 (항상 노출) */}
            <div className="flex items-center justify-around h-10 bg-gray-50 border-t">
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600 p-0"
                    onClick={(e) => { e.stopPropagation(); onRotate(image.id, 90); }}
                    title="90도 시계방향 회전(c)"
                >
                    <RotateCw size={14} />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600 p-0"
                    onClick={(e) => { e.stopPropagation(); onRotate(image.id, -90); }}
                    title="90도 반시계방향 회전(a)"
                >
                    <RotateCcw size={14} />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600 p-0"
                    onClick={(e) => { e.stopPropagation(); onRename(image.id); }}
                    title="이름 바꾸기(r)"
                >
                    <Pencil size={14} />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600 p-0"
                    onClick={(e) => { e.stopPropagation(); onAddNote(image.id); }}
                    title="노트 기록(n)"
                >
                    <FileText size={14} />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600 p-0"
                    onClick={(e) => { e.stopPropagation(); copyLink(image.id); }}
                    title="링크 복사(l)"
                >
                    <Link size={14} />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-red-50 hover:text-red-600 p-0"
                    onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                    title="삭제(d)"
                >
                    <Trash2 size={14} />
                </Button>
            </div>
        </div>
    );
}