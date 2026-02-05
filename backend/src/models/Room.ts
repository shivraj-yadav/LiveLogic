import mongoose from 'mongoose'

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  participants: [{
    socketId: String,
    displayName: String,
    role: {
      type: String,
      enum: ['Interviewer', 'Candidate'],
      required: true
    },
    userId: mongoose.Schema.Types.ObjectId
  }],
  language: {
    type: String,
    enum: ['javascript', 'python', 'java', 'cpp'],
    default: 'javascript'
  },
  document: {
    type: String,
    default: ''
  },
  input: {
    type: String,
    default: ''
  },
  selectedQuestionId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
})

export const Room = mongoose.model('Room', RoomSchema)
