type DocData = Record<string, unknown>;

class MockDocSnapshot {
  constructor(private dataValue: DocData | undefined) {}
  data() {
    return this.dataValue;
  }
}

class MockDocRef {
  constructor(private store: MockFirestoreStore, private path: string) {}

  async get() {
    return new MockDocSnapshot(this.store.get(this.path));
  }

  async set(data: DocData) {
    this.store.set(this.path, data);
  }

  async update(data: DocData) {
    const existing = this.store.get(this.path) || {};
    this.store.set(this.path, { ...existing, ...data });
  }

  collection(subPath: string) {
    return new MockCollectionRef(this.store, `${this.path}/${subPath}`);
  }
}

class MockCollectionRef {
  constructor(private store: MockFirestoreStore, private path: string) {}

  doc(id: string) {
    return new MockDocRef(this.store, `${this.path}/${id}`);
  }

  async get() {
    const docs = this.store
      .entries()
      .filter(([path]) => path.startsWith(this.path + "/"))
      .map(([, data]) => ({ data: () => data }));

    return { docs };
  }
}

class MockFirestoreStore {
  private data = new Map<string, DocData>();

  get(path: string) {
    return this.data.get(path);
  }

  set(path: string, value: DocData) {
    this.data.set(path, value);
  }

  entries() {
    return Array.from(this.data.entries());
  }

  clear() {
    this.data.clear();
  }
}

export class MockFirestore {
  private store = new MockFirestoreStore();

  collection(path: string) {
    return new MockCollectionRef(this.store, path);
  }

  runTransaction<T>(fn: (tx: any) => Promise<T>) {
    const tx = {
      get: async (ref: any) => ref.get(),
      set: async (ref: any, data: DocData) => ref.set(data),
    };
    return fn(tx);
  }

  _store() {
    return this.store;
  }
}

export const mockFirestore = new MockFirestore();

export const firestoreFn = Object.assign(() => mockFirestore, {
  FieldValue: {
    increment: (value: number) => ({ __increment__: value }),
    serverTimestamp: () => ({ __serverTimestamp__: true }),
  },
});
