# LiveLogic - Real-Time Collaborative Code Interview Platform

A cutting-edge platform for conducting real-time collaborative coding interviews with shared code execution, intelligent synchronization, and a professional interface.

## 🚀 Project Structure

```
LiveLogic-main/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── hooks/
│   ├── package.json
│   └── .env.example
├── backend/           # Express backend server
│   ├── src/
│   │   ├── models/
│   │   ├── config/
│   │   └── index.ts
│   ├── seed/
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB running on localhost:27017
- Git for version control

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LiveLogic-main
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure environment variables
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Configure environment variables
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on localhost:27017
   mongod
   ```

5. **Start backend server**
   ```bash
   cd backend
   npm run dev
   # Server runs on: http://localhost:3000
   ```

6. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   # Frontend runs on: http://localhost:5173
   ```

---

## ⚙️ Configuration

### Backend Environment Variables (`backend/.env`)
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/codesync
EXEC_PROVIDER=judge0
EXEC_ENDPOINT=https://judge0-ce.p.rapidapi.com
EXEC_API_KEY=your_rapidapi_key_here
CORS_ORIGINS=http://localhost:5173
```

### Frontend Environment Variables (`frontend/.env`)
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
