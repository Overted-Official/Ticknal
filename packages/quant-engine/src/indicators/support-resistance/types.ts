import { Time } from 'lightweight-charts';

export type SwingType = 'high' | 'low';

export interface SwingPoint {
  index: number;
  time: Time;
  price: number;
  type: SwingType;
}

export interface PriceCluster {
  id: string;
  type: 'resistance' | 'support' | 'pivot';
  centerPrice: number;
  minPrice: number;
  maxPrice: number;
  touchCount: number;
  firstIndex: number;
  firstTime: Time;
  lastIndex: number;
  lastTime: Time;
  swings: SwingPoint[];
}

export interface SROptionsState {
  step?: boolean;
  zones?: boolean;
  trend?: boolean;
}
