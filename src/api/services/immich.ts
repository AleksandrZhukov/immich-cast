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

export const BATCH_SIZE = 50;

export const validateToken = () => immichApi.post('/auth/validateToken');

export const fetchRandomImages = async (): Promise<AssetResponseDto[]> => {
  try {
    const res = await immichApi.post<AssetResponseDto[]>('/search/random', {
      isVisible: true,
      isArchived: false,
      size: BATCH_SIZE,
      takenAfter: '2017-01-01T00:00:00.000Z',
      type: AssetTypeEnum.Image,
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching random images:', error);
    return [];
  }
};

export const fetchMemoryImages = async (takenAfter: string, takenBefore: string): Promise<AssetResponseDto[]> => {
  try {
    const res = await immichApi.post<AssetResponseDto[]>('/search/random', {
      isVisible: true,
      isArchived: false,
      size: BATCH_SIZE,
      takenAfter,
      takenBefore,
      type: AssetTypeEnum.Image,
    });
    return res.data;
  } catch (error) {
    console.error(`Error fetching memory images (${takenAfter} - ${takenBefore}):`, error);
    return [];
  }
};

export const getAssetBuffer = async (id: string): Promise<Buffer<any>> => {
  const res = await immichApi.get(`/assets/${id}/thumbnail?size=preview`, {
    responseType: 'arraybuffer',
  });

  return Buffer.from(res.data);
};

export const fetchAssetInfo = async (id: string): Promise<AssetResponseDto> => {
  const res = await immichApi.get<AssetResponseDto>(`/assets/${id}`);
  return res.data;
};

export const archiveAsset = async (id: string): Promise<AssetResponseDto> => {
  const { ownerId } = await fetchAssetInfo(id);

  const apiKey = env.immich.ownersApiKeys[ownerId];

  if (!apiKey) {
    throw new Error(`No API key found for owner ${ownerId}`);
  }

  const res = await immichApi.put<AssetResponseDto>(
    `/assets/${id}`,
    { visibility: 'archive' },
    {
      headers: {
        'x-api-key': apiKey,
      },
    },
  );
  return res.data;
};
