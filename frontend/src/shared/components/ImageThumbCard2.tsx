import { Pencil, FileText, Trash2, RotateCw, CheckCircle2, Link } from 'lucide-react';
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

    return (
        <div
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

                {/* 우측 상단 기능 버튼들 */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                        onClick={(e) => { e.stopPropagation(); onRotate(image.id, 90); }}
                        title="회전"
                    >
                        <RotateCw size={14} className="text-gray-700" />
                    </Button>
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

            {/* 하단 액션 바 (호버 시에만 높이가 생기며 노출되는 스타일) */}
            <div className="flex items-center justify-around h-0 group-hover:h-10 transition-all duration-300 bg-gray-50 border-t overflow-hidden">
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); onRename(image.id); }}
                >
                    <Pencil size={14} className="mr-2" />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); onAddNote(image.id); }}
                >
                    <FileText size={14} className="mr-2" />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-blue-50 hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); copyLink(image.id); }}
                >
                    <Link size={14} className="mr-2" />
                </Button>
                <div className="w-[1px] h-4 bg-gray-200" />
                <Button
                    variant="ghost" size="sm" className="flex-1 rounded-none h-full hover:bg-red-50 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                >
                    <Trash2 size={14} className="mr-2" />
                </Button>
            </div>
        </div>
    );
}