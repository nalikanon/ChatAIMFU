import mongoose from 'mongoose';
import { Schema } from 'mongoose';

interface ChatMessage {
  id: number | string;
  role: string;
  content: string;
  timestamp?: Date;
  images?: Array<{
    data: string;
    mediaType: string;
  }>;
  files?: Array<{
    name: string;
    data: string;
    mediaType: string;
    size: number;
  }>;
  sources?: Array<{
    modelId: string;
    collectionName: string;
    filename: string;
    similarity: number;
  }>;
  isImageGeneration?: boolean;
  isComplete?: boolean;
  isEdited?: boolean;
}

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  chatname: {
    type: String,
    default: 'Untitled Chat'
  },
  name: {
    type: String,
    required: true,
  },
  messages: {
    type: [{
      id: Schema.Types.Mixed,
      role: String,
      content: String,
      timestamp: { type: Date, default: Date.now },
      images: [{
        data: String,
        mediaType: String
      }],
      files: [{
        name: String,
        data: String,
        mediaType: String,
        size: Number
      }],
      sources: [{
        modelId: String,
        collectionName: String,
        filename: String,
        similarity: Number
      }],
      isImageGeneration: Boolean,
      isComplete: Boolean,
      isEdited: Boolean
    }],
    required: true,
    validate: {
      validator: function(messages: ChatMessage[]) {
        return messages.length > 0;
      },
      message: 'Messages array cannot be empty'
    }
  },
  modelId: {
    type: String,
    required: true,
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Chat = mongoose.model('Chat', chatSchema); 