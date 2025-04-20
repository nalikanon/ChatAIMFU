import { Document, Schema, model } from 'mongoose';

export enum CollectionPermission {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export interface ICollection {
  name: string;
  permission: string;
  createdBy: string;
  createdAt?: Date;  // Optional since Mongoose adds it automatically
  updatedAt?: Date;  // Optional since Mongoose adds it automatically
  // add other fields as needed
}

export type CollectionDocument = ICollection & Document;

const collectionSchema = new Schema<CollectionDocument>({
  name: { type: String, required: true },
  permission: { type: String, required: true },
  createdBy: { type: String, required: true },
  // add default values if needed
}, { timestamps: true });

export const CollectionModel = model<CollectionDocument>('Collection', collectionSchema);  