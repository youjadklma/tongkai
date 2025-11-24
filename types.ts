export interface WordItem {
  id: string;
  english: string;
  chinese: string;
  dateAdded: number; // timestamp
  errorCount: number; // Number of times misspelled
}

export enum AppScreen {
  WELCOME = 'WELCOME',
  DAILY_INPUT = 'DAILY_INPUT',
  DICTATION_GAME = 'DICTATION_GAME',
  REVIEW_GAME = 'REVIEW_GAME',
  WORD_BOOK = 'WORD_BOOK',
}

export enum GameMode {
  DAILY = 'DAILY',
  REVIEW = 'REVIEW',
}

export interface GameConfig {
  words: WordItem[];
  mode: GameMode;
}