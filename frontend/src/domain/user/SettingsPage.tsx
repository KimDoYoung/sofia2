import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
  newPassword: z.string().min(4, '새 비밀번호는 최소 4자 이상이어야 합니다.'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "새 비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const SettingsPage = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">사용자 설정</h2>
        
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">비밀번호 변경</h3>
            
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
