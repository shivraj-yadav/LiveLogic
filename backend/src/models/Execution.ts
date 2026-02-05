import mongoose from 'mongoose'

const ExecutionSchema = new mongoose.Schema({
  roomId: String,
  userId: String,
  code: String,
  language: String,
  input: String,
  output: {
    stdout: String,
    stderr: String,
    timeMs: Number,
    memoryKb: Number,
    status: String
  },
  provider: {
    type: String,
    enum: ['judge0', 'jdoodle']
  },
  executedAt: {
    type: Date,
    default: Date.now
  }
})

export const Execution = mongoose.model('Execution', ExecutionSchema)
