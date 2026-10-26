export type HeatmapMode = 'off' | 'volume' | 'score' | 'time';

export interface CalendarBlock {
  id: string;
  name?: string;
  platform?: string;
  body?: string;
  scheduledDate?: any;
  publishTime?: string;
  autoPublish?: boolean;
  published?: boolean;
  status?: string;
  createdAt?: any;
  data?: {
    title?: string;
    body?: string;
    platform?: string;
    score?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface PlatformStyle {
  bg: string;
  border: string;
  text: string;
  solidBg: string;
  solidText: string;
  name: string;
  accent: string;
}

export interface ConnectedAccount {
  platform: string;
  profile?: {
    name?: string;
    username?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ReformatSuggestion {
  platform: string;
  title: string;
  body: string;
}
