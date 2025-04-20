import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  data: { type: String, required: true },
  mediaType: { type: String, required: true }
}, { _id: false });

const sourceSchema = new mongoose.Schema({
  modelId: { type: String },
  collectionName: { type: String },
  filename: { type: String },
  similarity: { type: Number }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['user', 'assistant', 'system'], 
    required: true 
  },
  content: { 
    type: String, 
    required: function(this: { images?: { data: string; mediaType: string }[] }) {
      return !this.images || this.images.length === 0;
    }
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    validate: {
      validator: function(v: any) {
        if (!v) return true; // Allow default value to be set
        const date = new Date(v);
        return !isNaN(date.getTime());
      },
      message: (props: { value: any }) => `${props.value} is not a valid timestamp!`
    },
    set: function(v: any) {
      if (!v) return new Date();
      if (v.$date) return new Date(v.$date);
      return new Date(v);
    }
  },
  images: [imageSchema],
  sources: [sourceSchema],
  isImageGeneration: { 
    type: Boolean, 
    default: false 
  }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  modelId: { type: String, required: true },
  chatname: { 
    type: String, 
    required: true,
    maxLength: 100 
  },
  messages: [messageSchema],
  isPinned: { type: Boolean, default: false },
}, { 
  timestamps: true,
  index: [
    { userId: 1 },
    { userId: 1, updatedAt: -1 },
    { userId: 1, modelId: 1 }
  ]
});

// Add validation for messages array
chatSchema.pre('save', function(next) {
  if (!this.messages || this.messages.length === 0) {
    next(new Error('Chat must have at least one message'));
    return;
  }
  next();
});

export const Chat = mongoose.model('Chat', chatSchema); 