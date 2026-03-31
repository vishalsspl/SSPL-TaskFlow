# SaaS Task Management Platform - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

## Step-by-Step Installation

### 1. Install Dependencies

From the root directory:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 2. Set Up PostgreSQL Database

Create a PostgreSQL database:

```sql
CREATE DATABASE taskmanagement;
```

Or using command line:

```bash
psql -U postgres
CREATE DATABASE taskmanagement;
\q
```

### 3. Configure Environment Variables

**Backend Configuration:**

Create `backend/.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/taskmanagement"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
NODE_ENV=development
```

Replace:
- `username` with your PostgreSQL username (usually `postgres`)
- `password` with your PostgreSQL password

**Frontend Configuration:**

Create `frontend/.env` file:

```bash
cd ../frontend
cp .env.example .env
```

The default configuration should work:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Initialize the Database

From the backend directory:

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

You should see output confirming the database has been seeded with demo data.

### 5. Start the Application

You can start both frontend and backend together from the root:

```bash
# From root directory
npm run dev
```

Or start them separately:

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **API Health Check:** http://localhost:5000/api/health

## Demo Accounts

After seeding, you can login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | password123 |
| Manager | manager@demo.com | password123 |
| Member | member@demo.com | password123 |
| Client | client@demo.com | password123 |

## Features Overview

### 1. Authentication
- Login and signup
- JWT-based authentication
- Role-based access control (Admin, Manager, Member, Client)

### 2. Multi-Project Management
- Create and manage multiple projects
- Track project phases (Planning → Design → Development → Testing → Deployment)
- Assign project managers
- Budget tracking

### 3. Task Management
- Create, update, and delete tasks
- Assign tasks to team members
- Set priorities (Low, Medium, High, Urgent)
- Track completion percentage
- Filter tasks by status

### 4. Visual Dashboards
- Project overview cards
- Phase progress tracker
- Budget utilization charts
- Workload distribution charts
- Overdue tasks table
- Upcoming deadlines

### 5. Team Management
- View all team members
- See role distribution
- Member profiles with avatars

### 6. Export & Presentation
- Export dashboard as PDF
- Export dashboard as PNG
- Fullscreen presentation mode for client meetings

## Project Structure

```
task-management-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.js            # Demo data seeder
│   ├── src/
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth & error handling
│   │   ├── routes/            # API routes
│   │   └── server.js          # Express app
│   ├── .env                   # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   └── Layout.jsx
│   │   ├── pages/            # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProjectView.jsx
│   │   │   ├── Tasks.jsx
│   │   │   ├── Team.jsx
│   │   │   └── Settings.jsx
│   │   ├── store/            # Zustand state management
│   │   ├── lib/              # Utilities & API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                  # Environment variables
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/invite` - Invite team member (Admin/Manager only)
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project (Admin/Manager only)
- `PUT /api/projects/:id` - Update project (Admin/Manager only)
- `DELETE /api/projects/:id` - Delete project (Admin/Manager only)

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Dashboard
- `GET /api/dashboard/:projectId` - Get project dashboard data

### Reports
- `POST /api/reports/:projectId/pdf` - Export dashboard as PDF
- `POST /api/reports/:projectId/png` - Export dashboard as PNG

### Users
- `GET /api/users` - List organization users

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   pg_ctl status

   # macOS/Linux
   brew services list # if installed via Homebrew
   ```

2. Check your DATABASE_URL in `backend/.env`

3. Ensure the database exists:
   ```bash
   psql -U postgres -l
   ```

### Port Already in Use

If port 5000 or 5173 is already in use:

**Backend:** Change PORT in `backend/.env`
**Frontend:** Change port in `frontend/vite.config.js`

### Prisma Client Issues

If you encounter Prisma client errors:

```bash
cd backend
npm run db:generate
```

## Development Tips

### Viewing the Database

Use Prisma Studio to view and edit data:

```bash
cd backend
npm run db:studio
```

This opens a web interface at http://localhost:5555

### Adding New Dependencies

**Backend:**
```bash
cd backend
npm install <package-name>
```

**Frontend:**
```bash
cd frontend
npm install <package-name>
```

### Resetting the Database

To reset and reseed:

```bash
cd backend
npx prisma migrate reset
npm run db:seed
```

## Production Deployment

### Environment Variables

Update these for production:

**Backend:**
- Change `JWT_SECRET` to a strong random string
- Set `NODE_ENV=production`
- Use production database URL

**Frontend:**
- Update `VITE_API_URL` to your production API URL

### Build Frontend

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

### Security Considerations

1. Never commit `.env` files
2. Use strong JWT secrets
3. Enable HTTPS in production
4. Set up CORS properly
5. Use environment-specific database credentials
6. Implement rate limiting
7. Add input validation

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check browser console for frontend errors
4. Check backend logs for API errors

## License

MIT
