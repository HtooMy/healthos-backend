const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
    },
    estimatedMinutes: {
      type: Number,
      required: true,
      min: 1,
      integer: true,
    },
    requiredEnergy: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    requiredAttention: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    deadline: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          return value === null || value === undefined || !Number.isNaN(new Date(value).getTime());
        },
        message: 'Deadline must be a valid date.',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Task', taskSchema);
