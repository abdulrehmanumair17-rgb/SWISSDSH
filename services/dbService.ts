
import { DepartmentMismatch, HolidaysMap, LocksMap } from '../types.ts';

const DB_NAME = 'SwissPharmaDatabase';
const DB_VERSION = 1;
const STORES = {
  DATA: 'operationData',
  CONFIG: 'systemConfig'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.DATA)) {
        db.createObjectStore(STORES.DATA);
      }
      if (!db.objectStoreNames.contains(STORES.CONFIG)) {
        db.createObjectStore(STORES.CONFIG);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveData = async (key: string, value: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DATA, STORES.CONFIG], 'readwrite');
    const store = STORES.DATA === key ? transaction.objectStore(STORES.DATA) : transaction.objectStore(STORES.CONFIG);
    const request = store.put(value, key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const getData = async (key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DATA, STORES.CONFIG], 'readonly');
    const store = key === 'operationData' ? transaction.objectStore(STORES.DATA) : transaction.objectStore(STORES.CONFIG);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
