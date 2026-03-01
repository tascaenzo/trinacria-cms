export type DbPrimitive = string | number | boolean | null;
export type DbValue =
  | DbPrimitive
  | DbValue[]
  | {
      [key: string]: DbValue;
    };

export interface DbQuery {
  [key: string]: DbValue;
}

export interface DbDocument {
  id?: string;
  [key: string]: DbValue | undefined;
}

export interface DbCollection<T extends DbDocument = DbDocument> {
  findOne(query: DbQuery): Promise<T | null>;
  findMany(query?: DbQuery): Promise<T[]>;
  insertOne(document: T): Promise<T>;
  updateOne(query: DbQuery, patch: Partial<T>): Promise<T | null>;
  deleteOne(query: DbQuery): Promise<boolean>;
}

export interface DbClient {
  collection<T extends DbDocument = DbDocument>(name: string): DbCollection<T>;
}

export interface NamespacedDbFactory {
  forNamespace(namespace: string): DbClient;
}
