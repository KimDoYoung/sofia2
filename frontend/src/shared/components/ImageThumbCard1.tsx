import { Pencil, FileText, Trash2, RotateCw, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageThumbCard1Props {
    image: {
        id: number;
        orgName: string;
        note?: string;
    };
    isSelected: boolean;
    onImageClick: (id: number) => void;
    onSelect: (id: number) => void;
    onRename: (id: number) => void;
    onAddNote: (id: number) => void;
    onDelete: (id: number) => void;
    onRotate: (id: number) => void;
}

export function ImageThumbCard1({
    image,
    isSelected,
    onImageClick,
    onSelect,
    onRename,
    onAddNote,
    onDelete,
    onRotate,
}: ImageThumbCard1Props) {
    return (
        <div
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
                    src={`/sofia/api/images/${image.id}/thumb`}
                    alt={image.orgName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* 선택 체크박스 (좌측 상단) */}
                <div
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

                {/* 이미지 위 호버 시 노트 노출 */}
                {image.note && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                        <p className="text-white text-xs text-center line-clamp-4 leading-relaxed">
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
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <div className="flex gap-0.5">
                        <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); onRotate(image.id); }}
                            title="회전"
                        >
                            <RotateCw size={13} />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); onRename(image.id); }}
                            title="이름 바꾸기"
                        >
                            <Pencil size={13} />
                        </Button>
                        <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); onAddNote(image.id); }}
                            title="노트 기록"
                        >
                            <FileText size={13} />
                        </Button>
                    </div>

                    <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
                        title="삭제"
                    >
                        <Trash2 size={13} />
                    </Button>
                </div>
            </div>
        </div>
    );
}