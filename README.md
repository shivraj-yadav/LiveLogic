# LiveLogic - Real-Time Collaborative Code Interview Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://live-logic.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

**LiveLogic** is a cutting-edge, developer-first platform designed for conducting real-time collaborative coding interviews. Built with modern web technologies, it provides an immersive interview experience with shared code execution, intelligent synchronization, and a professional interface that showcases technical excellence.

## 🚀 Live Demo
Experience the platform at: **[https://live-logic.vercel.app](https://live-logic.vercel.app)**

---

## ✨ Core Features

### 🤝 Real-Time Collaboration
- **Shared Monaco Editor**: Multi-user code editing with real-time synchronization using Socket.io
- **Live Cursor Tracking**: See other participants' cursor positions and selections
- **Instant Code Sync**: Every keystroke is broadcasted to all participants instantly
- **Role-Based Access**: Interviewer and Candidate roles with appropriate permissions

### ⚡ Smart Code Execution
- **Unified Execution**: Run code once, see results everywhere in real-time
- **Multiple Language Support**: JavaScript, Python, Java, and C++ with syntax highlighting
- **Rich Execution Results**: 
  - Standard output and error streams
  - Execution time and memory usage
  - Status indicators (Accepted, Wrong Answer, Runtime Error, etc.)
  - Test case input/output display
- **Dual Execution Providers**: Judge0 (RapidAPI) and JDoodle integration

### 📚 Comprehensive Question Bank
- **Curated Problems**: Pre-loaded interview questions with varying difficulty levels
- **Smart Filtering**: Filter questions by difficulty (Easy, Medium, Hard)
- **Rich Problem Statements**: Detailed descriptions with sample inputs/outputs
- **Quick Search**: Find questions instantly with search functionality

### 🏠 Room Management
- **Instant Room Creation**: Generate unique room IDs with one click
- **Participant Presence**: Real-time participant list with online status
- **Room Controls**: Copy room link, leave room, manage participants
- **Session Persistence**: Maintain state during navigation

---

## 🛠️ Technical Architecture

### Frontend Stack
```
React 18 + TypeScript
├── Vite (Build Tool)
├── Tailwind CSS + shadcn/ui (Styling)
├── Radix UI (Component Primitives)
├── Monaco Editor (Code Editor)
├── Socket.io Client (Real-time Communication)
├── Framer Motion (Animations)
├── React Router (Navigation)
├── Axios (HTTP Client)
└── Lucide React (Icons)
```

### Backend Stack
```
Node.js + Express + TypeScript
├── Socket.io (WebSocket Server)
├── Helmet (Security)
├── CORS (Cross-Origin Resource Sharing)
├── Judge0/JDoodle (Code Execution)
└── In-Memory Room Management
```

### Monorepo Structure
```
LiveLogic/
├── apps/
│   ├── web/          # React frontend application
│   └── server/       # Express backend server
├── package.json      # Workspace configuration
└── README.md         # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git for version control

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shivraj-yadav/LiveLogic
   cd LiveLogic
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install workspace dependencies
   npm install --workspaces
   ```

3. **Backend Setup**
   ```bash
   cd apps/server
   cp .env.example .env
   # Configure environment variables (see below)
   npm run dev
   ```
   Server runs on: `http://localhost:3000`

4. **Frontend Setup**
   ```bash
   cd apps/web
   cp .env.example .env
   # Configure environment variables (see below)
   npm run dev
   ```
   Frontend runs on: `http://localhost:5173`

5. **Test the Application**
   - Open two browser tabs
   - Create a room in one tab
   - Join the room in the second tab
   - Start coding collaboratively!

---

## ⚙️ Configuration

### Backend Environment Variables (`apps/server/.env`)
```env
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173

# Code Execution Provider (choose one)
EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com
EXEC_API_KEY=your_rapidapi_key_here

# Alternative: JDoodle
# JDOODLE_CLIENT_ID=your_jdoodle_client_id
# JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret
```

### Frontend Environment Variables (`apps/web/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## 🌐 Production Deployment

### Recommended Architecture
- **Backend**: Render.com (WebSocket support)
- **Frontend**: Vercel (Edge deployment)

### Deployment Steps

1. **Deploy Backend to Render**
   - Root directory: `apps/server`
   - Build command: `npm ci && npm run build`
   - Start command: `npm run start`
   - Environment variables: Configure production values

2. **Deploy Frontend to Vercel**
   - Root directory: `apps/web`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables: Set production API URLs

### Production Environment Variables

**Frontend (Vercel):**
```env
VITE_API_BASE_URL=https://your-render-app.onrender.com
VITE_SOCKET_URL=https://your-render-app.onrender.com
```

**Backend (Render):**
```env
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://your-vercel-app.vercel.app
EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com
EXEC_API_KEY=your_production_api_key
```

---

## 📊 Socket.io Events

### Room Management
- `join-room` - Join a collaborative room
- `leave-room` - Leave current room
- `participants-updated` - Broadcast participant changes

### Code Collaboration
- `code-change` - Real-time code synchronization
- `language-change` - Change programming language
- `reset-document` - Clear editor content

### Question Management
- `set-question` - Select interview question
- `questions-loaded` - Load question bank

### Code Execution
- `run-execute` - Execute code with test cases
- `execution-result` - Broadcast execution results

---

## 🧪 Development Workflow

### Key Components

**Frontend (`apps/web/src/`):**
- `routes/Room.tsx` - Main collaborative interface
- `routes/Home.tsx` - Landing and room creation
- `components/room/` - Room-specific components
- `components/ui/` - Reusable UI components (shadcn/ui)
- `lib/socket.ts` - Socket.io client configuration
- `theme/tokens.ts` - Design system tokens

**Backend (`apps/server/src/`):**
- `index.ts` - Main server and Socket.io logic
- `seed/questions.json` - Interview question database

### Development Scripts
```bash
# Development
npm run dev:web      # Start frontend
npm run dev:server   # Start backend

# Building
npm run build:web    # Build frontend
npm run build:server # Build backend

# Production
npm run start:server # Start production server

# Code Quality
npm run lint         # ESLint
npm run format       # Prettier
```

---

## 🎯 Use Cases

### For Interviewers
- Conduct technical interviews remotely
- Share coding problems in real-time
- Monitor candidate thought process
- Evaluate problem-solving approach
- Maintain interview session records

### For Candidates
- Practice collaborative coding
- Experience real interview environment
- Receive immediate feedback
- Showcase technical communication skills

### For Educational Institutions
- Conduct live coding classes
- Host programming competitions
- Facilitate peer programming sessions
- Provide interactive learning experiences

---

## 🔧 Technical Highlights

### Performance Optimizations
- **Debounced Code Sync**: Prevents network flooding during rapid typing
- **Efficient State Management**: Minimizes re-renders with React hooks
- **Lazy Loading**: Components load on-demand for faster initial load
- **WebSocket Connection Pooling**: Efficient resource utilization

### Security Features
- **CORS Configuration**: Secure cross-origin requests
- **Helmet.js**: Security headers for Express
- **Input Validation**: Sanitized user inputs
- **Rate Limiting**: Prevents abuse of execution APIs

### Code Quality
- **TypeScript**: Full type safety across the stack
- **ESLint + Prettier**: Consistent code formatting
- **Component Architecture**: Modular, reusable components
- **Error Boundaries**: Graceful error handling

---


---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Monaco Editor** - For the powerful code editing experience
- **Socket.io** - For seamless real-time communication
- **shadcn/ui** - For beautiful, accessible UI components
- **Judge0** - For reliable code execution services
- **Vercel & Render** - For excellent hosting platforms

---

## 📞 Contact & Support

- **Author**: Shivraj Yadav
- **Live Demo**: [https://live-logic.vercel.app](https://live-logic.vercel.app)
- **Issues**: [GitHub Issues](https://github.com/shivraj-yadav/LiveLogic/issues)


---

<div align="center">

**⭐ Star this repository if it helped you!**

Made with ❤️ for the developer community

</div>
