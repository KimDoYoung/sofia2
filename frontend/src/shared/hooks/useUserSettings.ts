import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export type ImageTransition = 'none' | 'fade' | 'slide' | 'zoom';

export interface UserSettings {
  userId: number;
  imageTransition: ImageTransition;
}

const QUERY_KEY = ['user-settings'];

export function useUserSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UserSettings>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get('/users/settings');
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const mutation = useMutation({
    mutationFn: async (imageTransition: ImageTransition) => {
      const res = await apiClient.put('/users/settings', { imageTransition });
      return res.data as UserSettings;
    },
    onMutate: async (imageTransition) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<UserSettings>(QUERY_KEY);
      queryClient.setQueryData<UserSettings>(QUERY_KEY, (old) =>
        old ? { ...old, imageTransition } : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    settings: data,
    isLoading,
    imageTransition: data?.imageTransition ?? 'fade',
    updateImageTransition: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
