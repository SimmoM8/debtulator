export type StoredFileInfo = {
  exists: boolean;
  size: number;
};

export type PickedDocument = {
  uri: string;
  name: string | null;
  mimeType: string | null;
  size: number;
};

export type PickedImage = {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number;
};

export type FileSelection<T> =
  | { status: 'selected'; file: T }
  | { status: 'cancelled' };

export type MediaSelection =
  | FileSelection<PickedImage>
  | { status: 'permission_denied' };

export interface FileGateway {
  readText(uri: string): Promise<string>;
  readBase64(uri: string): Promise<string>;
  writeTextFile(fileName: string, contents: string): Promise<string>;
  getInfo(uri: string): Promise<StoredFileInfo>;
}

export interface DocumentPickerGateway {
  pickDocument(options: {
    mimeTypes: string[];
  }): Promise<FileSelection<PickedDocument>>;
}

export interface MediaPickerGateway {
  pickImage(): Promise<MediaSelection>;
}

export interface ShareGateway {
  shareFile(input: {
    uri: string;
    title?: string;
    message?: string;
  }): Promise<void>;
}

export type PlatformFileServices = {
  files: FileGateway;
  documents: DocumentPickerGateway;
  media: MediaPickerGateway;
  sharing: ShareGateway;
};
