declare module "npm:@supabase/supabase-js@2" {
  export function createClient(...args: any[]): any;
}

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve: (handler: (request: unknown) => Promise<unknown>) => void;
};
