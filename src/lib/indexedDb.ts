type IndexedDbConfig = {
  dbName?: string;
  storeName?: string;
  version?: number;
};

export class IndexedDbStorage<T> {
  private dbName: string;
  private storeName: string;
  private version: number;
  private db: IDBDatabase | null;

  constructor(config: IndexedDbConfig = {}) {
    this.dbName = config.dbName || 'AppDB';
    this.storeName = config.storeName || 'sessions';
    this.version = config.version || 1;
    this.db = null;
  }

  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  private async getDb() {
    return this.db ?? this.init();
  }

  async save(id: string, data: T) {
    const database = await this.getDb();

    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put({
        id,
        timestamp: Date.now(),
        ...data,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async load(id: string) {
    const database = await this.getDb();

    return new Promise<(T & { id: string; timestamp?: number }) | null>((resolve, reject) => {
      const transaction = database.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    const database = await this.getDb();

    return new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
