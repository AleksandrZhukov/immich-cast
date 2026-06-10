export enum ExifOrientation {
  Horizontal = 1,
  MirrorHorizontal = 2,
  Rotate180 = 3,
  MirrorVertical = 4,
  MirrorHorizontalRotate270CW = 5,
  Rotate90CW = 6,
  MirrorHorizontalRotate90CW = 7,
  Rotate270CW = 8,
}

export type ExifResponseDto = {
  city?: string | null;
  country?: string | null;
  dateTimeOriginal?: string | null;
  description?: string | null;
  exifImageHeight?: number | null;
  exifImageWidth?: number | null;
  exposureTime?: string | null;
  fNumber?: number | null;
  fileSizeInByte?: number | null;
  focalLength?: number | null;
  iso?: number | null;
  latitude?: number | null;
  lensModel?: string | null;
  longitude?: number | null;
  make?: string | null;
  model?: string | null;
  modifyDate?: string | null;
  orientation?: string | null;
  projectionType?: string | null;
  rating?: number | null;
  state?: string | null;
  timeZone?: string | null;
};

export enum UserAvatarColor {
  Primary = 'primary',
  Pink = 'pink',
  Red = 'red',
  Yellow = 'yellow',
  Blue = 'blue',
  Green = 'green',
  Purple = 'purple',
  Orange = 'orange',
  Gray = 'gray',
  Amber = 'amber',
}

export type UserResponseDto = {
  avatarColor: UserAvatarColor;
  email: string;
  id: string;
  name: string;
  profileChangedAt: string;
  profileImagePath: string;
};

export enum AssetTypeEnum {
  Image = 'IMAGE',
  Video = 'VIDEO',
  Audio = 'AUDIO',
  Other = 'OTHER',
}

export type ImageInfo = {
  id: string;
  width: number;
  height: number;
  ownerId: string;
  ownerName: string;
  ownerAvatarColor: string;
  fileCreatedAt: string;
  latitude: number | null;
  longitude: number | null;
  orientation?: string | null;
  yearsAgo?: number;
};

export enum SlideType {
  SINGLE = 'single',
  DOUBLE = 'double',
}

export type SingleSlide = {
  type: SlideType.SINGLE;
  id: string;
  isPortrait: boolean;
  items: [ImageInfo];
};

export type DoubleSlide = {
  type: SlideType.DOUBLE;
  id: string;
  items: [ImageInfo, ImageInfo];
};

export type Slide = SingleSlide | DoubleSlide;

export type CurrentWeather = {
  aqi: number;
  humidity: number;
  icon: string;
  iconUrl: string;
  pressure: number;
  temperature: number;
  wind: {
    speed: number;
    direction: number;
  };
};

export type Summary = {
  totalServed: number;
  memoryServed: number;
  uniqueImages: number;
  uniqueOwners: number;
  rangeDays: number;
  perOwner: Array<{ ownerId: string; ownerName: string; count: number }>;
  perCaptureYear: Array<{ year: number; count: number }>;
};

export type DailyPoint = { date: string; served: number; memory: number };

export type CaptureCell = { year: number; doy: number; count: number; memoryCount: number };

export type CaptureSpread = { minYear: number; maxYear: number; cells: CaptureCell[] };

export type DailyByOwner = {
  owners: Array<{ ownerId: string; ownerName: string; total: number }>;
  days: Array<{ date: string; byOwner: Record<string, number> }>;
};

export type CastEventRow = { ts: string; kind: string; detail?: string };

export type WeatherPoint = {
  ts: string;
  temperature: number;
  aqi: number;
  humidity: number;
  icon: string;
  windSpeed: number;
};

export type WeatherDailyRow = {
  date: string;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  aqiAvg: number | null;
  aqiMax: number | null;
  dominantIcon: string | null;
  samples: number;
};

export type MemoryDeckStats = {
  total: number;
  shown: number;
  remaining: number;
  shuffles: number;
  byYear: Record<string, number>;
};

export type AssetResponseDto = {
  checksum: string;
  deviceAssetId: string;
  deviceId: string;
  duplicateId?: string | null;
  duration: string;
  exifInfo?: ExifResponseDto;
  fileCreatedAt: string;
  fileModifiedAt: string;
  hasMetadata: boolean;
  id: string;
  isArchived: boolean;
  isFavorite: boolean;
  isOffline: boolean;
  isTrashed: boolean;
  livePhotoVideoId?: string | null;
  localDateTime: string;
  originalFileName: string;
  originalMimeType?: string;
  originalPath: string;
  owner?: UserResponseDto;
  ownerId: string;
  people?: unknown;
  stack?: unknown;
  tags?: unknown;
  thumbhash: string | null;
  type: AssetTypeEnum;
  unassignedFaces?: unknown;
  updatedAt: string;
};
