import titles from './data/titles.json';

export interface Title {
  id: number;
  title: string;
  type: 'movie' | 'series';
  genre: string;
  language: string;
  releaseYear: number;
  rating: number;
  durationMinutes?: number;
  seasons?: number;
}

/** Read-only "mock database" backed by a JSON file. */
const TITLES: readonly Title[] = Object.freeze(titles as Title[]);

export const GENRES = [...new Set(TITLES.map((t) => t.genre))].sort();
export const LANGUAGES = [...new Set(TITLES.map((t) => t.language))].sort();

export const allTitles = (): Title[] => [...TITLES];
export const findTitle = (id: number): Title | undefined => TITLES.find((t) => t.id === id);
