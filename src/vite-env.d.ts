interface ImportMetaEnv {
  readonly FIREBASE_HOST?: string;
  readonly FIREBASE_AUTH?: string;
  readonly FIREBASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}