# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints except `/auth/login` and `/auth/signup` require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@demo.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@demo.com",
    "role": "ADMIN",
    "organizationId": "uuid",
    "organization": {
      "id": "uuid",
      "name": "Acme Corporation",
      "themeColor": "#3B82F6"
    }
  }
}
```

#### Signup
```http
POST /auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "securepassword",
  "organizationName": "My Company"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

#### Invite User (Admin/Manager only)
```http
POST /auth/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "role": "MEMBER"
}
```

### Projects

#### List Projects
```http
GET /projects
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Mobile App Redesign",
    "description": "Complete redesign...",
    "status": "ACTIVE",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-06-30T00:00:00.000Z",
    "totalBudget": "150000",
    "usedBudget": "87500",
    "manager": {
      "id": "uuid",
      "name": "Project Manager",
      "email": "manager@demo.com"
    },
    "_count": {
      "tasks": 15,
      "phases": 5
    }
  }
]
```

#### Get Project
```http
GET /projects/:id
Authorization: Bearer <token>
```

#### Create Project (Admin/Manager)
```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "totalBudget": 100000,
  "managerId": "uuid",
  "status": "PLANNING"
}
```

#### Update Project (Admin/Manager)
```http
PUT /projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "status": "ACTIVE",
  "usedBudget": 25000
}
```

#### Delete Project (Admin/Manager)
```http
DELETE /projects/:id
Authorization: Bearer <token>
```

### Tasks

#### List Tasks
```http
GET /tasks?projectId=uuid&status=IN_PROGRESS&priority=HIGH
Authorization: Bearer <token>
```

Query Parameters:
- `projectId` (optional): Filter by project
- `status` (optional): TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, BLOCKED
- `priority` (optional): LOW, MEDIUM, HIGH, URGENT
- `assignedTo` (optional): User ID

#### Get Task
```http
GET /tasks/:id
Authorization: Bearer <token>
```

#### Create Task
```http
POST /tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "uuid",
  "phaseId": "uuid",
  "title": "Implement authentication",
  "description": "Build JWT authentication",
  "assignedTo": "uuid",
  "status": "TODO",
  "priority": "HIGH",
  "completionPercentage": 0,
  "dueDate": "2024-02-15",
  "tags": ["backend", "security"]
}
```

#### Update Task
```http
PUT /tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "completionPercentage": 50
}
```

#### Delete Task
```http
DELETE /tasks/:id
Authorization: Bearer <token>
```

### Dashboard

#### Get Project Dashboard
```http
GET /dashboard/:projectId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "project": { ... },
  "overview": {
    "totalTasks": 15,
    "completedTasks": 8,
    "overdueTasksCount": 2,
    "inProgressTasks": 5,
    "activeMembers": 4,
    "daysToLaunch": 45
  },
  "budget": {
    "total": 150000,
    "used": 87500,
    "remaining": 62500,
    "usedPercentage": 58.33
  },
  "phases": [ ... ],
  "overdueTasks": [ ... ],
  "workloads": [ ... ],
  "upcomingDeadlines": [ ... ],
  "recentActivity": [ ... ]
}
```

### Reports

#### Export to PDF
```http
POST /reports/:projectId/pdf
Authorization: Bearer <token>
Content-Type: application/json

{
  "html": "<html>...</html>"
}
```

**Response:** Binary PDF data

#### Export to PNG
```http
POST /reports/:projectId/png
Authorization: Bearer <token>
Content-Type: application/json

{
  "html": "<html>...</html>"
}
```

**Response:** Binary PNG image data

### Users

#### List Organization Users
```http
GET /users
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@demo.com",
    "role": "ADMIN",
    "avatar": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Roles & Permissions

| Endpoint | Admin | Manager | Member | Client |
|----------|-------|---------|--------|--------|
| GET /projects | ✅ | ✅ | ✅ | ✅ |
| POST /projects | ✅ | ✅ | ❌ | ❌ |
| PUT /projects | ✅ | ✅ | ❌ | ❌ |
| DELETE /projects | ✅ | ✅ | ❌ | ❌ |
| GET /tasks | ✅ | ✅ | ✅ | ✅ |
| POST /tasks | ✅ | ✅ | ✅ | ❌ |
| PUT /tasks | ✅ | ✅ | ✅ | ❌ |
| DELETE /tasks | ✅ | ✅ | ✅ | ❌ |
| POST /auth/invite | ✅ | ✅ | ❌ | ❌ |

## Rate Limiting

Currently no rate limiting is implemented. For production, consider adding rate limiting middleware.

## CORS

CORS is enabled for all origins in development. Update CORS configuration for production.
