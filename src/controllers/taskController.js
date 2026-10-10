const mongoose = require('mongoose');
const Task = require('../models/Task');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const allowedFields = [
  'title',
  'estimatedMinutes',
  'requiredEnergy',
  'requiredAttention',
  'priority',
  'deadline',
  'status',
];

function validateTaskPayload(payload, mode = 'create') {
  const keys = Object.keys(payload || {});
  const invalidKeys = keys.filter((key) => !allowedFields.includes(key));

  if (invalidKeys.length > 0) {
    return `Unsupported field(s): ${invalidKeys.join(', ')}`;
  }

  if (mode === 'create' && (!payload.title || !String(payload.title).trim())) {
    return 'Title is required and cannot be empty.';
  }

  if (payload.title !== undefined && (!String(payload.title).trim())) {
    return 'Title cannot be empty.';
  }

  if (payload.estimatedMinutes !== undefined) {
    const estimatedMinutes = Number(payload.estimatedMinutes);
    if (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0) {
      return 'estimatedMinutes must be a positive integer.';
    }
  }

  if (payload.requiredEnergy !== undefined && !['low', 'medium', 'high'].includes(payload.requiredEnergy)) {
    return 'requiredEnergy must be one of: low, medium, high.';
  }

  if (payload.requiredAttention !== undefined && !['low', 'medium', 'high'].includes(payload.requiredAttention)) {
    return 'requiredAttention must be one of: low, medium, high.';
  }

  if (payload.priority !== undefined && !['low', 'medium', 'high'].includes(payload.priority)) {
    return 'priority must be one of: low, medium, high.';
  }

  if (payload.status !== undefined && !['pending', 'completed'].includes(payload.status)) {
    return 'status must be one of: pending, completed.';
  }

  if (payload.deadline !== undefined && payload.deadline !== null && Number.isNaN(new Date(payload.deadline).getTime())) {
    return 'deadline must be a valid date when provided.';
  }

  return null;
}

const createTask = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  delete payload.userId;

  const validationError = validateTaskPayload(payload, 'create');
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const task = await Task.create({ ...payload, userId: req.userId });
  return res.status(201).json(task);
});

const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ userId: req.userId }).sort({ deadline: 1, createdAt: -1 }).lean();
  return res.status(200).json(tasks);
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Task ID is invalid.' });
  }

  const validationError = validateTaskPayload(req.body, 'update');
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const task = await Task.findOneAndUpdate(
    { _id: id, userId: req.userId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  return res.status(200).json(task);
});

const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Task ID is invalid.' });
  }

  const task = await Task.findOneAndDelete({ _id: id, userId: req.userId });

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  return res.status(200).json({ message: 'Task deleted successfully.', taskId: id });
});

module.exports = { createTask, getTasks, updateTask, deleteTask };
