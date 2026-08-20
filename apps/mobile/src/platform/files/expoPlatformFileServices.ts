import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Share } from 'react-native';

import type { PlatformFileServices } from '@debtulator/application/ports/fileGateway';

function writableDirectory() {
  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error('No writable document directory is available.');
  }
  return directory;
}

function validateFileName(fileName: string) {
  if (!fileName || /[/\\]/.test(fileName) || fileName.includes('..')) {
    throw new Error('The requested file name is not safe.');
  }
}

export const expoPlatformFileServices: PlatformFileServices = {
  files: {
    async readText(uri) {
      return FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    },
    async readBase64(uri) {
      return FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    },
    async writeTextFile(fileName, contents) {
      validateFileName(fileName);
      const uri = `${writableDirectory()}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, contents, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return uri;
    },
    async getInfo(uri) {
      const info = await FileSystem.getInfoAsync(uri);
      return {
        exists: info.exists,
        size: info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0,
      };
    },
  },
  documents: {
    async pickDocument({ mimeTypes }) {
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled || !result.assets[0]) {
        return { status: 'cancelled' };
      }
      const asset = result.assets[0];
      return {
        status: 'selected',
        file: {
          uri: asset.uri,
          name: asset.name || null,
          mimeType: asset.mimeType ?? null,
          size: asset.size ?? 0,
        },
      };
    },
  },
  media: {
    async pickImage() {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return { status: 'permission_denied' };
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) {
        return { status: 'cancelled' };
      }
      const asset = result.assets[0];
      return {
        status: 'selected',
        file: {
          uri: asset.uri,
          fileName: asset.fileName ?? null,
          mimeType: asset.mimeType ?? null,
          fileSize: asset.fileSize ?? 0,
        },
      };
    },
  },
  sharing: {
    async shareFile({ uri, title, message }) {
      await Share.share({
        url: uri,
        title,
        message: message ?? title,
      });
    },
  },
};
