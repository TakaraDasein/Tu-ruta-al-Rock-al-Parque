interface ImportMetaEnv {
  readonly PUBLIC_UMAMI_ID?: string;
  readonly PUBLIC_UMAMI_SRC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
