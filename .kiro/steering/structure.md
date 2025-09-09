# Project Structure

## Root Level
```
├── backend/           # Node.js/Express API server
├── frontend/          # React web application  
├── mobile/            # React Native mobile app
├── docs/              # Documentation and debug guides
├── .env               # Root environment variables
├── dev-manager.ps1    # Development startup script
└── database.db        # Arquivo de banco removido (migrado para PostgreSQL)
```

## Backend Structure (`backend/`)
```
├── src/               # TypeScript source code
├── dist/              # Compiled JavaScript output
├── uploads/           # File upload storage
├── database.db        # Arquivo removido (migrado para PostgreSQL)
├── *.js               # Migration and utility scripts
├── docker-compose.yml # Docker configuration
└── .env               # Backend environment variables
```

## Frontend Structure (`frontend/`)
```
├── src/               # React source code
├── dist/              # Vite build output
├── index.html         # Entry HTML file
└── vite.config.ts     # Vite configuration
```

## Mobile Structure (`mobile/`)
```
├── src/               # React Native source code
├── app.json           # Expo configuration
└── tsconfig.json      # TypeScript configuration
```

## Architecture Patterns

### Backend Organization
- **Modular Structure**: Controllers, models, routes separation
- **TypeScript**: Strict typing with ES2020 target
- **Database**: PostgreSQL para desenvolvimento e produção
- **Authentication**: JWT middleware pattern
- **File Handling**: Multer for uploads in dedicated directory

### Frontend Organization  
- **Component-Based**: React functional components with hooks
- **Material-UI**: Consistent design system
- **Routing**: React Router with nested routes
- **State Management**: React hooks and context
- **API Integration**: Axios with proxy configuration

### Mobile Organization
- **Expo Managed**: Simplified React Native development
- **Navigation**: Stack-based navigation pattern
- **Platform Features**: Location services, notifications
- **Delivery Focus**: Specialized for delivery personnel workflow

## Key Conventions
- **Language**: Portuguese comments and variable names
- **File Naming**: kebab-case for files, PascalCase for components
- **Database**: Snake_case table and column names
- **API Routes**: RESTful patterns with `/api` prefix
- **Environment**: Separate .env files per service
- **Migration Scripts**: Standalone JavaScript files in backend root