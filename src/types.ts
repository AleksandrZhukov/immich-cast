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
