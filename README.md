# SaaS Multi-Project Task & Progress Management Platform

> 🚀 **A comprehensive task and progress management platform designed for visual reporting, client-facing dashboards, and presentation-ready analytics.**

![Platform Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Overview

A complete full-stack SaaS platform that allows companies to manage multiple projects, visualize progress, and export professional dashboards before client meetings. Built with modern technologies and best practices.

## 🎯 Key Features

- 🏢 **Multi-Tenant Architecture** - Multiple organizations with isolated data
- 📊 **Visual Dashboards** - Executive-level reporting with interactive charts
- 📁 **Multi-Project Management** - Handle unlimited projects per organization
- 👥 **Role-Based Access Control** - Admin, Manager, Member, Client roles
- 📈 **Phase Tracking** - Visual progress through 5 project phases
- 📋 **Advanced Task Management** - Full CRUD with Kanban-style workflow
- 💰 **Budget Tracking** - Monitor project budgets and spending in real-time
- 📤 **Export Capabilities** - PDF and PNG exports for presentations
- 🎯 **Presentation Mode** - Fullscreen dashboard for client meetings
- ⚠️ **Workload Analysis** - Automatic team workload distribution
- 🔐 **Secure Authentication** - JWT-based with role-based permissions
- 🎨 **Professional UI** - Clean, modern design with Tailwind CSS

## 📸 Screenshots

### Dashboard Overview
- Project grid with status indicators
- Quick access to all projects
- Real-time statistics

### Project Dashboard
- Phase progress tracker with visual stepper
- Overview cards showing key metrics
- Budget tracker with usage charts
- Workload distribution visualization
- Overdue tasks table with alerts
- Upcoming deadlines widget

### Presentation Mode
- Fullscreen view for client meetings
- Large fonts and clean layout
- Professional appearance
- PDF/PNG export ready

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- shadcn/ui
- Recharts
- Zustand (state management)
- React Router

### Backend
- Node.js
- Express
- JWT authentication
- Bcrypt for password hashing

### Database
- PostgreSQL
- Prisma ORM

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone and install dependencies:
```bash
npm run install-all
```

2. Set up environment variables:

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/taskmanagement"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
```

3. Set up database:
```bash
npm run db:migrate
npm run db:seed
```

4. Start development servers:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` and backend on `http://localhost:5000`.

## Demo Credentials

After seeding, you can login with:
- **Admin**: admin@demo.com / password123
- **Manager**: manager@demo.com / password123
- **Member**: member@demo.com / password123
- **Client**: client@demo.com / password123

## Project Structure

```
task-management-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── lib/
│   │   └── App.jsx
│   └── package.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/invite` - Invite team member

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Dashboard
- `GET /api/dashboard/:projectId` - Get project dashboard data

### Reports
- `GET /api/reports/:projectId/pdf` - Export dashboard as PDF
- `GET /api/reports/:projectId/png` - Export dashboard as PNG

## Database Schema

See `backend/prisma/schema.prisma` for complete schema.

## License

MIT
# SSPL-TasFlow
# SSPL-TasFlow
