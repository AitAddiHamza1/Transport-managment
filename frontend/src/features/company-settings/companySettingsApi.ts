import { api } from '../../lib/axios';
import { GetCompanySettingsResponse, UpdateCompanySettingsPayload } from './types';

export const companySettingsApi = {
  getSettings: async (): Promise<GetCompanySettingsResponse> => {
    const res = await api.get<GetCompanySettingsResponse>('/company-settings');
    return res.data;
  },

  updateSettings: async (payload: UpdateCompanySettingsPayload): Promise<GetCompanySettingsResponse> => {
    const res = await api.patch<GetCompanySettingsResponse>('/company-settings', payload);
    return res.data;
  },

  uploadLogo: async (file: File): Promise<GetCompanySettingsResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<GetCompanySettingsResponse>('/company-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteLogo: async (): Promise<GetCompanySettingsResponse> => {
    const res = await api.delete<GetCompanySettingsResponse>('/company-settings/logo');
    return res.data;
  },

  uploadStamp: async (file: File): Promise<GetCompanySettingsResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<GetCompanySettingsResponse>('/company-settings/stamp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteStamp: async (): Promise<GetCompanySettingsResponse> => {
    const res = await api.delete<GetCompanySettingsResponse>('/company-settings/stamp');
    return res.data;
  },
};
