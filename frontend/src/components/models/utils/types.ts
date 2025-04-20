export interface Model {
  id: string;
  name: string;
  collections: string[]; // list of collection names selected in the model
  modelType: 'official' | 'personal' | 'department';
  department?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Collection {
  id: string;
  name: string;
  createdBy: string;
  created: string;
  permission: CollectionPermission | string[] | undefined;
}

export enum CollectionPermission {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export interface User {
  username: string;
  role: string;
  groups?: string[];
  nameID: string;
  firstName: string;
  department?: string;
} 