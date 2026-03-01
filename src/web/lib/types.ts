export type ImageInfo = {
  id: string;
  width: number;
  height: number;
  ownerName: string;
  ownerAvatarColor: string;
  fileCreatedAt: string;
  latitude: number | null;
  longitude: number | null;
  yearsAgo?: number;
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

export type WeatherResponse = {
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
