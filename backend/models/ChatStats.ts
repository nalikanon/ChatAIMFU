import mongoose, { Document } from 'mongoose';

interface IChatStats extends Document {
  date: Date;
  uniqueUsers: string[];
  totalChats: number;
  totalTokens: number;
}

const chatStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  uniqueUsers: [{
    type: String
  }],
  totalChats: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  }
});

export const ChatStats = mongoose.model<IChatStats>('ChatStats', chatStatsSchema); 