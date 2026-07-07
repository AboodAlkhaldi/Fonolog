import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

import { supabase } from './supabase';
import type { ReportRow } from './database.types';

const REPORT_BUCKET = 'reports';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'report';
}

function localDateStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function getReportUrl(report: ReportRow): string {
  if (report.file_url) return report.file_url;
  return supabase.storage.from(REPORT_BUCKET).getPublicUrl(report.file_path).data.publicUrl;
}

export function getReportPreviewUrl(report: ReportRow): string {
  const url = getReportUrl(report);
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
}

export async function downloadReportToLocal(report: ReportRow): Promise<string> {
  const url = getReportUrl(report);
  const folder = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}reports`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true }).catch(() => {});
  const localPath = `${folder}/${report.file_name}`;
  const result = await FileSystem.downloadAsync(url, localPath);
  return result.uri;
}

export async function saveReportToDevice(report: ReportRow): Promise<string> {
  const localUri = await downloadReportToLocal(report);

  if (Platform.OS !== 'android') {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    }
    return localUri;
  }

  const initialDir = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialDir);
  if (!permissions.granted) {
    throw new Error('Kaydetme izni verilmedi.');
  }

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const destination = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    report.file_name.replace(/\.pdf$/i, ''),
    'application/pdf',
  );
  await FileSystem.StorageAccessFramework.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destination;
}

export async function storeGeneratedReportPdf(params: {
  pdfUri: string;
  ownerId: string;
  createdById?: string | null;
  title: string;
  fileNamePrefix: string;
  accessToken: string;
}): Promise<ReportRow> {
  const storagePrefix = slugify(params.createdById ?? params.ownerId);
  const fileName = `${slugify(params.fileNamePrefix)}-${localDateStamp()}-${Date.now()}.pdf`;
  const filePath = `${storagePrefix}/${fileName}`;
  const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/reports/${filePath}`;

  const uploadResult = await FileSystem.uploadAsync(uploadUrl, params.pdfUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/pdf',
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`PDF yüklenemedi (${uploadResult.status})`);
  }

  const { data: publicData } = supabase.storage.from(REPORT_BUCKET).getPublicUrl(filePath);
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: params.ownerId,
      created_by: params.createdById ?? null,
      title: params.title,
      file_name: fileName,
      file_path: filePath,
      file_url: publicData.publicUrl,
      mime_type: 'application/pdf',
      size_bytes: null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Rapor kaydedilemedi');
  }

  return data as ReportRow;
}
