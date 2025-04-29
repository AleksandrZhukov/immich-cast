import axios from 'axios';
import { env } from '../config/env';
import { type AssetResponseDto, AssetTypeEnum } from '../../types';

export const immichApi = axios.create({
  baseURL: env.immich.apiUrl,
  headers: {
    Accept: 'application/json',
    'x-api-key': env.immich.apiKey,
  },
});

export const BATCH_SIZE = 10;

export const fetchRandomImages = async (): Promise<AssetResponseDto[]> => {
  try {
    const searchResult = await immichApi.post<AssetResponseDto[]>('/search/random', {
      isVisible: true,
      size: BATCH_SIZE,
      takenAfter: '2017-01-01T00:00:00.000Z',
      type: AssetTypeEnum.Image,
    });
    return searchResult.data;
  } catch (error) {
    console.error('Error fetching random images:', error);
    return [];
  }
};

export const fetchAssetInfo = async (id: string): Promise<AssetResponseDto> => {
  const assetResp = await immichApi.get<AssetResponseDto>(`/assets/${id}`);
  return assetResp.data;
};
