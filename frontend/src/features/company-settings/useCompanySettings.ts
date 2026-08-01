import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companySettingsApi } from './companySettingsApi';
import { UpdateCompanySettingsPayload } from './types';

export const COMPANY_SETTINGS_QUERY_KEY = ['company-settings'];

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: COMPANY_SETTINGS_QUERY_KEY,
    queryFn: companySettingsApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCompanySettingsPayload) => companySettingsApi.updateSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, data);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => companySettingsApi.uploadLogo(file),
    onSuccess: (data) => {
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, data);
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => companySettingsApi.deleteLogo(),
    onSuccess: (data) => {
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, data);
    },
  });

  const uploadStampMutation = useMutation({
    mutationFn: (file: File) => companySettingsApi.uploadStamp(file),
    onSuccess: (data) => {
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, data);
    },
  });

  const deleteStampMutation = useMutation({
    mutationFn: () => companySettingsApi.deleteStamp(),
    onSuccess: (data) => {
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, data);
    },
  });

  return {
    isConfigured: settingsQuery.data?.isConfigured ?? false,
    settings: settingsQuery.data?.settings ?? null,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
    refetch: settingsQuery.refetch,

    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    uploadLogo: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,

    deleteLogo: deleteLogoMutation.mutateAsync,
    isDeletingLogo: deleteLogoMutation.isPending,

    uploadStamp: uploadStampMutation.mutateAsync,
    isUploadingStamp: uploadStampMutation.isPending,

    deleteStamp: deleteStampMutation.mutateAsync,
    isDeletingStamp: deleteStampMutation.isPending,
  };
}
