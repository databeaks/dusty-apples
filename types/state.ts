export interface LoadingState {
  hello: boolean;
  health: boolean;
  data: boolean;
  user: boolean;
}

export interface ErrorState {
  hello: string | null;
  health: string | null;
  data: string | null;
  user: string | null;
}