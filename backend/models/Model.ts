import { Schema, model, Document } from 'mongoose';

export interface ModelDocument extends Document {
  name: string;
  collections: string[];
  createdBy: string;
  modelType: 'official' | 'personal' | 'department';
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const modelSchema = new Schema<ModelDocument>({
  name: { type: String, required: true },
  collections: [{ type: String }],
  createdBy: { type: String, required: true },
  modelType: { type: String, enum: ['official', 'personal', 'department'], required: true },
  department: { type: String },
}, { timestamps: true });

export const ModelModel = model<ModelDocument>('Model', modelSchema);