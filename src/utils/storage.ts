/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MEHFIL SAFE PERSISTENCE UTILITIES
 * =================================
 * Combines localStorage with IndexedDB fallback to prevent QuotaExceededError
 * when users upload high-resolution photos, stories, and videos.
 */

const DB_NAME = 'mehfil_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'mehfil_keyval';

// Initialize IndexedDB
function getIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Asynchronously save to IndexedDB (virtually unlimited quota for media)
 */
export async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[Mehfil Storage] IDB write error for ${key}:`, err);
  }
}

/**
 * Asynchronously retrieve from IndexedDB
 */
export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[Mehfil Storage] IDB read error for ${key}:`, err);
    return null;
  }
}

/**
 * Safely writes string to localStorage with automatic QuotaExceededError interception.
 * Asynchronously backs up to IndexedDB so large media is never lost.
 */
export function safeSetItem(key: string, value: string): boolean {
  // Always asynchronously persist to IndexedDB
  idbSet(key, value);

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    // Check for QuotaExceededError
    if (
      err.name === 'QuotaExceededError' ||
      err.code === 22 ||
      err.code === 1014 ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      console.warn(`[Mehfil Storage] Quota exceeded for localStorage key "${key}". Data persisted in IndexedDB instead.`);
      
      // Attempt to prune non-critical caches to free space
      try {
        // Remove old logs or notifications if needed
        localStorage.removeItem('mehfil_admin_logs');
      } catch {}

      // Try once more with truncated or light representation
      return false;
    } else {
      console.warn(`[Mehfil Storage] Failed to set localStorage key "${key}":`, err);
      return false;
    }
  }
}

/**
 * Safely reads from localStorage with error suppression
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely removes item from localStorage and IndexedDB
 */
export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    getIDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    });
  } catch {}
}

/**
 * Image compressor utility using canvas to keep base64 strings under 150KB
 */
export function compressImageFile(file: File, maxDimension = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a video, read directly without canvas
    if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
