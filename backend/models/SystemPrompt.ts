import mongoose from 'mongoose';

interface ISystemPrompt {
  prompt: string;
  updatedBy: string;
  updatedAt: Date;
}

const systemPromptSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
  },
  updatedBy: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

export const SystemPrompt = mongoose.model<ISystemPrompt>('SystemPrompt', systemPromptSchema); 