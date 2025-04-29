export type ImageInfo = {
  id: string;
  width: number;
  height: number;
  ownerName: string;
  ownerAvatarColor: string;
  fileCreatedAt: string;
  latitude: number | null;
  longitude: number | null;
};

export const enum SlideType {
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
