# Technology Stack

## Architecture
Full-stack TypeScript application with separate backend API, React frontend, and React Native mobile app.

## Backend
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript (compiled to CommonJS)
- **Database**: PostgreSQL
- **Authentication**: JWT tokens with bcryptjs hashing
- **File Uploads**: Multer middleware
- **Environment**: dotenv for configuration

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with React plugin
- **UI Library**: Material-UI (@mui/material, @mui/icons-material)
- **Routing**: React Router v6 (with v7 compatibility flags)
- **HTTP Client**: Axios
- **Styling**: Emotion (CSS-in-JS)

## Mobile
- **Framework**: React Native with Expo SDK 50
- **Navigation**: React Navigation v6
- **Features**: GPS location, push notifications
- **HTTP Client**: Axios

## Development Tools
- **Linting**: ESLint with TypeScript rules
- **Type Checking**: TypeScript 5.4+
- **Dev Server**: ts-node-dev (backend), Vite dev server (frontend)

## Common Commands

### Backend
```bash
cd backend
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to dist/
npm start           # Run compiled production build
npm run lint        # Run ESLint
```

### Frontend
```bash
cd frontend
npm run dev         # Start Vite dev server (port 5173)
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Mobile
```bash
cd mobile
npm start           # Start Expo development server
npm run android     # Run on Android device/emulator
npm run ios         # Run on iOS device/simulator
npm run web         # Run in web browser
```

### Full Stack Development
```powershell
# Use the provided PowerShell script
./dev-manager.ps1   # Installs deps and starts backend + frontend
```

## Configuration Notes
- Frontend proxy configured to backend at `192.168.18.12:3000`
- Backend serves on port 3000, frontend on 5173
- Docker support available with Dockerfiles in backend/frontend
- Environment variables managed via .env files