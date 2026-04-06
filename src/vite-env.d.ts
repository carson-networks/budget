/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONNECT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
