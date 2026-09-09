import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Music,
  Sparkles,
  KeyRound,
  Image,
} from 'lucide-react';
import { useUserSettings, type ImageTransition } from '@/shared/hooks/useUserSettings';
import BgmAssetManager from './components/BgmAssetManager';
import DecorationAssetManager from './components/DecorationAssetManager';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
  newPassword: z.string().min(4, '새 비밀번호는 최소 4자 이상이어야 합니다.'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "새 비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const TRANSITION_OPTIONS: { value: ImageTransition; label: string; desc: string }[] = [
  { value: 'none',  label: '없음',     desc: '애니메이션 없이 즉시 전환' },
  { value: 'fade',  label: '페이드',   desc: '부드럽게 투명도 전환' },
  { value: 'slide', label: '슬라이드', desc: '이전/다음 방향으로 슬라이드' },
  { value: 'zoom',  label: '줌인',     desc: '가운데서 확대되며 등장' },
];

const CollapsibleSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition-colors text-left group"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-bold text-gray-800">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        )}
      </button>
      {open && (
        <div className="border-t px-6 py-5 animate-in fade-in slide-in-from-top-1 duration-150">
          {children}
        </div>
      )}
    </div>
  );
};

const SettingsPage = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { imageTransition, updateImageTransition, isUpdating, isLoading } = useUserSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const res = await apiClient.put('/users/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMessage(data);
      setErrorMessage('');
      reset();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: string } };
      setErrorMessage(error.response?.data || '비밀번호 변경 중 오류가 발생했습니다.');
      setSuccessMessage('');
    },
  });

  const onSubmit = (data: PasswordFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="w-[80%] min-w-[320px] mx-auto py-8 px-4 space-y-3">

      {/* 1. 배경음악(BGM) 자산 관리 */}
      <CollapsibleSection
        title="배경음악(BGM) 자산 관리"
        icon={<Music size={16} className="text-blue-600" />}
      >
        <BgmAssetManager />
      </CollapsibleSection>

      {/* 2. 장식 이미지 자산 관리 */}
      <CollapsibleSection
        title="장식 이미지 자산 관리"
        icon={<Image size={16} className="text-indigo-600" />}
      >
        <DecorationAssetManager />
      </CollapsibleSection>

      {/* 3. 이미지 전환 애니메이션 */}
      <CollapsibleSection
        title="이미지 전환 애니메이션"
        icon={<Sparkles size={16} className="text-indigo-500" />}
      >
        <p className="text-xs text-gray-500 mb-4">
          이미지 뷰어에서 사진 간 전환 시 적용할 애니메이션 효과를 선택합니다.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TRANSITION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={isUpdating || isLoading}
              onClick={() => updateImageTransition(opt.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium
                ${imageTransition === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="text-[11px] text-center text-gray-400 font-normal leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* 4. 비밀번호 변경 */}
      <CollapsibleSection
        title="비밀번호 변경"
        icon={<KeyRound size={16} className="text-gray-500" />}
      >
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={20} />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">현재 비밀번호</label>
            <input
              type="password"
              {...register('currentPassword')}
              className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all ${
                errors.currentPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">새 비밀번호</label>
            <input
              type="password"
              {...register('newPassword')}
              className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all ${
                errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              {...register('confirmPassword')}
              className={`w-full h-11 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all ${
                errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  변경 중...
                </>
              ) : (
                '비밀번호 저장'
              )}
            </button>
          </div>
        </form>
      </CollapsibleSection>

    </div>
  );
};

export default SettingsPage;
