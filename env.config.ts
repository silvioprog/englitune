export type Environment = "development" | "production";

export type EnvironmentConfig<T> = Record<Environment, T>;

export const apiUrls: EnvironmentConfig<string> = {
  development: "http://localhost:8787",
  production: "https://englitune-worker.silvioprog.dev"
} as const;

export const audioUrls: EnvironmentConfig<string> = {
  development: "https://englitune-audio.silvioprog.dev", // We don't have an audio server for development
  production: "https://englitune-audio.silvioprog.dev"
} as const;
