/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_LOGTO_ENDPOINT?: string;
  readonly VITE_LOGTO_APP_ID?: string;
  readonly VITE_LOGTO_API_RESOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
