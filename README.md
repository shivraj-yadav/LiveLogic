# LiveLogic

LiveLogic is a comprehensive realtime coding interview platform that enables interviewers and candidates to collaborate seamlessly in a shared coding environment. Built with modern web technologies, it provides an intuitive interface for conducting technical interviews with support for multiple programming languages and instant code execution.

## Features

### 🎭 Role-Based Collaboration
- **Interviewer Mode**: Full control over question selection and room management
- **Candidate Mode**: Collaborative coding with realtime synchronization
- Automatic role assignment based on room entry order

### 💻 Realtime Shared Editor
- Collaborative code editing with instant synchronization
- Support for JavaScript, Python, Java, and C++
- Persistent state management with MongoDB
- Syntax highlighting and language-specific features

### 📚 Built-in Question Bank
- Curated coding problems with varying difficulty levels
- Searchable by tags and difficulty
- Instant question loading for all participants
- Structured problem descriptions with examples

### ⚡ Multi-Language Code Execution
- Execute code in multiple programming languages
- Integration with Judge0 and JDoodle execution providers
- Display execution time and memory statistics
- Real-time result broadcasting to all participants

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn-inspired components
- **Real-time**: Socket.io Client
- **State Management**: React Hooks

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express with TypeScript
- **WebSockets**: Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Code Execution**: Judge0 / JDoodle API integration

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render 
- **Database**: MongoDB Atlas

## Quick Start

### Prerequisites

Ensure you have the following installed:
- Node.js 18 or higher
- Git
- MongoDB instance (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shivraj-yadav/LiveLogic.git
   cd LiveLogic
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

   Create `backend/.env`:
   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
   CORS_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
   
   # Optional: Code execution provider
   EXEC_PROVIDER=judge0
   EXEC_ENDPOINT=https://your-judge0-instance
   EXEC_API_KEY=your-exec-api-key
   EXEC_API_SECRET=your-exec-api-secret
   INTERVIEWER_END_GRACE_MS=15000
   ```

   Start the backend server:
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

   Create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_SOCKET_URL=http://localhost:3000
   ```

   Start the frontend development server:
   ```bash
   npm run dev
   # App runs on http://localhost:5173
   ```

4. **Test the Application**
   - Open `http://localhost:5173` in your browser
   - Create a room as an Interviewer
   - Join the same room from another browser/tab as a Candidate
   - Start collaborating!

## Deployment

### Frontend (Vercel)

**Configuration:**
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

**Environment Variables:**
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
```

### Backend (Render)

**Configuration:**
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Environment Variables:**
```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>
CORS_ORIGINS=https://your-frontend.vercel.app
EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://your-judge0-instance
EXEC_API_KEY=your-api-key
EXEC_API_SECRET=your-api-secret
INTERVIEWER_END_GRACE_MS=15000
```

## Project Structure

```
LiveLogic/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── routes/          # Page components (Home, Room)
│   │   ├── components/      # Reusable UI components
│   │   ├── lib/             # Socket client and utilities
│   │   └── hooks/           # Custom React hooks
│   └── package.json
│
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/          # Database connection and seeding
│   │   ├── models/          # Mongoose schemas (Room, Question, Execution)
│   │   └── index.ts         # Main server and Socket.io handlers
│   ├── seed/                # Database seed data
│   └── package.json
│
└── README.md
```

## Socket.io Events

### Client → Server
- `join-room`: Join a room with `roomId` and `displayName`
- `leave-room`: Leave the current room
- `code-change`: Update shared editor content
- `language-change`: Change programming language
- `set-question`: Select a question (interviewer only)
- `run-execute`: Execute code and get results

### Server → Client
- `participants-updated`: Broadcast updated participant list
- `room-ended`: Notify that the room has been closed
- `execution-result`: Broadcast code execution results

## Contributing

We welcome contributions from the community! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

Please ensure your code follows the existing style and includes appropriate tests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies
- Inspired by the need for better remote technical interviews
- Community-driven development

