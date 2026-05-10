import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import write_blob from 'capacitor-blob-writer';

const CACHE_DIRECTORY = Directory.Cache;

type CacheFileEntry = {
	path: string;
	size: number;
	modified?: number;
};

const normalizeBase64 = (data: string): string => {
	const markerIndex = data.indexOf('base64,');
	if (markerIndex !== -1) {
		return data.slice(markerIndex + 'base64,'.length);
	}

	return data;
};

const getParentDir = (path: string): string => {
	const lastSlashIndex = path.lastIndexOf('/');
	if (lastSlashIndex <= 0) {
		return '';
	}

	return path.slice(0, lastSlashIndex);
};

const ensureParentDir = async (path: string): Promise<void> => {
	const parentDir = getParentDir(path);
	if (!parentDir) {
		return;
	}

	try {
		await Filesystem.mkdir({
			path: parentDir,
			directory: CACHE_DIRECTORY,
			recursive: true,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		if (!message.toLowerCase().includes('exist')) {
			throw error;
		}
	}
};

const blobToBase64 = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result?.toString() ?? '';
			resolve(normalizeBase64(result));
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

const isOutOfSpaceError = (error: unknown): boolean => {
	if (!error) {
		return false;
	}

	const message =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: JSON.stringify(error);
	const normalized = message.toLowerCase();

	return (
		normalized.includes('no space') ||
		normalized.includes('insufficient storage') ||
		normalized.includes('out of space') ||
		normalized.includes('enospc') ||
		normalized.includes('quota') ||
		normalized.includes('disk full')
	);
};

const wrapOutOfSpaceError = (error: unknown): never => {
	if (isOutOfSpaceError(error)) {
		throw new Error('Không đủ dung lượng lưu trữ để ghi file vào cache.');
	}

	throw error instanceof Error ? error : new Error(String(error));
};

const listCacheFilesRecursive = async (path = ''): Promise<CacheFileEntry[]> => {
	const response = await Filesystem.readdir({
		path,
		directory: CACHE_DIRECTORY,
	});

	const entries = response.files ?? [];
	const results: CacheFileEntry[] = [];

	for (const entry of entries) {
		const name = typeof entry === 'string' ? entry : entry.name;
		if (!name) {
			continue;
		}

		const fullPath = path ? `${path}/${name}` : name;
		const entryType = typeof entry === 'string' ? undefined : entry.type;

		if (entryType === 'directory') {
			results.push(...(await listCacheFilesRecursive(fullPath)));
			continue;
		}

		try {
			const stats = await Filesystem.stat({
				path: fullPath,
				directory: CACHE_DIRECTORY,
			});

			if (stats.type === 'directory') {
				results.push(...(await listCacheFilesRecursive(fullPath)));
			} else {
				results.push({
					path: fullPath,
					size: stats.size ?? 0,
					modified: stats.mtime,
				});
			}
		} catch {
			// Ignore missing or inaccessible entries
		}
	}

	return results;
};

export const writeCacheFileBase64 = async (
	path: string,
	base64Data: string,
): Promise<string> => {
	try {
		await ensureParentDir(path);
		await Filesystem.writeFile({
			path,
			directory: CACHE_DIRECTORY,
			data: normalizeBase64(base64Data),
		});

		const result = await Filesystem.getUri({
			path,
			directory: CACHE_DIRECTORY,
		});
		return result.uri;
	} catch (error) {
		wrapOutOfSpaceError(error);
	}

	throw new Error('Failed to write cache file.');
};

export const writeCacheFileBlob = async (path: string, blob: Blob): Promise<string> => {
	try {
		await ensureParentDir(path);

		try {
			await write_blob({
				path,
				directory: CACHE_DIRECTORY,
				blob,
			});
		} catch (error) {
			if (isOutOfSpaceError(error)) {
				wrapOutOfSpaceError(error);
			}
			const base64 = await blobToBase64(blob);
			await Filesystem.writeFile({
				path,
				directory: CACHE_DIRECTORY,
				data: base64,
			});
		}

		const result = await Filesystem.getUri({
			path,
			directory: CACHE_DIRECTORY,
		});
		return result.uri;
	} catch (error) {
		wrapOutOfSpaceError(error);
	}

	throw new Error('Failed to write cache file.');
};

export const readCacheFile = async (path: string): Promise<string> => {
	const result = await Filesystem.readFile({
		path,
		directory: CACHE_DIRECTORY,
	});

	if (typeof result.data === 'string') {
		return result.data;
	}

	if (result.data instanceof Blob) {
		return blobToBase64(result.data);
	}

	return '';
};

export const readCacheFileBlob = async (path: string): Promise<Blob> => {
	const result = await Filesystem.readFile({
		path,
		directory: CACHE_DIRECTORY,
	});

	if (result.data instanceof Blob) {
		return result.data;
	}

	const uriResult = await Filesystem.getUri({
		path,
		directory: CACHE_DIRECTORY,
	});
	const fetchUrl = Capacitor.convertFileSrc(uriResult.uri);
	const response = await fetch(fetchUrl);

	if (!response.ok) {
		throw new Error(`Failed to read cache file blob: ${response.status}`);
	}

	return response.blob();
};

export const deleteCacheFile = async (path: string): Promise<void> => {
	await Filesystem.deleteFile({
		path,
		directory: CACHE_DIRECTORY,
	});
};

export const clearCacheFiles = async (): Promise<void> => {
	try {
		const entries = await listCacheFilesRecursive();
		await Promise.all(
			entries.map((entry) =>
				Filesystem.deleteFile({
					path: entry.path,
					directory: CACHE_DIRECTORY,
				}),
			),
		);
	} catch {
		// Ignore errors when cache is empty
	}
};

export const getCacheSizeBytes = async (): Promise<number> => {
	try {
		const entries = await listCacheFilesRecursive();
		return entries.reduce((total, entry) => total + entry.size, 0);
	} catch {
		return 0;
	}
};

export const listCacheFiles = async (): Promise<CacheFileEntry[]> =>
	listCacheFilesRecursive();

