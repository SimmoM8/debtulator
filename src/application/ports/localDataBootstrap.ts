import type { AppSnapshot } from "@/src/application/model/AppSnapshot";

export type AppDataRepository = {
  load(): Promise<AppSnapshot>;
  transaction<T>(operation: (repository: any) => Promise<T>): Promise<T>;
  [method: string]: any;
};

export type LocalDataBootstrap = {
  boot(): Promise<{
    repository: AppDataRepository;
    snapshot: AppSnapshot;
  }>;
};
