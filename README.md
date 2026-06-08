# TaskFlow: Premium Full-Stack Task Workspace

TaskFlow is a secure, scalable, full-stack Task Management System designed for high-concurrency environments. Built with **Next.js (App Router)** and **Prisma ORM**, it provides a unified platform hosting versioned REST APIs and a responsive glassmorphic frontend. It incorporates JWT session cookie authorization, role-based access control, input validation, and a self-invalidating Redis caching layer.

---

## Key Features

- 🔐 **Secure Authentication**: Hashed passwords (via `bcryptjs`) and secure session tokens (`JWT`) stored in `httpOnly` cookies to prevent XSS attacks. Supports standard bearer headers.
- 🛡️ **Role-Based Access Control (RBAC)**: Distinct permissions for `USER` and `ADMIN` profiles. Admins can view all tasks, assign tasks to any user, and list system developers.
- 🚀 **Redis Caching Layer**: Automated caching on high-frequency `GET /api/v1/tasks` endpoints with active cache invalidation on mutations (POST, PUT, DELETE).
- 💾 **Database Portability**: Configured with Prisma ORM. Uses **SQLite** locally for zero-config evaluation, and supports scaling to **PostgreSQL** in production simply by altering the environment variables.
- 📦 **Docker Containerization**: Includes multi-stage production `Dockerfile` and `docker-compose.yml` for running Next.js alongside PostgreSQL and Redis.
- 🎨 **Premium Glassmorphic UI**: Styled with modern, high-fidelity Vanilla CSS variables, micro-animations, theme tokens, and dynamic layout grids.

---

## Project Structure

```
/
├── prisma/
│   ├── schema.prisma        # Database schema definitions
│   └── dev.db               # Local SQLite database (git-ignored)
├── src/
│   ├── app/
│   │   ├── api/             # Backend Route Handlers (API Versioning)
│   │   │   └── v1/
│   │   │       ├── auth/    # Register, login, logout, profile
│   │   │       ├── tasks/   # CRUD routes for tasks
│   │   │       └── users/   # User directory (Admin only)
│   │   ├── dashboard/       # Protected Client-Side Workspace
│   │   ├── page.jsx         # Login/Registration Landing Page
│   │   ├── layout.jsx       # Layout containing global states
│   │   └── globals.css      # Custom design tokens, scrollbars, styles
│   ├── components/          # Reusable UI layouts (Navbar, TaskCard)
│   ├── context/             # React authentication contexts
│   ├── lib/                 # DB, JWT, and Redis connection handlers
│   └── middleware.js        # Next.js router middleware (Session redirects)
├── docs/
│   └── postman_collection.json # Postman collection file
├── Dockerfile               # Multi-stage production container setup
├── docker-compose.yml       # Next.js + PostgreSQL + Redis stack
└── README.md                # System documentation
```

---

## Quick Start Setup (Local Run)

### 1. Prerequisites
- **Node.js**: `v18` or higher (`v22` recommended)
- **NPM**: `v9` or higher

### 2. Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Inside `.env`, verify the default SQLite settings:
```ini
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-random-jwt-key-2026-intern-project"
REDIS_URL="redis://localhost:6379"
PORT=3000
```
> **Note**: If Redis is not running locally, the application will **automatically fall back** to a robust in-memory caching mechanism, outputting no runtime errors.

### 3. Generate Database Client & Migrations
Sync your local database using Prisma:
```bash
npx prisma migrate dev --name init
```
This command initializes the local SQLite `dev.db` database file and generates the compiled Prisma client.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the frontend interface.

---

## API Reference (`/api/v1`)

All authenticated API routes accept both the HTTP cookie `token` or the standard header `Authorization: Bearer <token>`.

### Authentication Endpoints
| Method | Endpoint | Access | Body Parameters | Description |
|:---|:---|:---|:---|:---|
| `POST` | `/api/v1/auth/register` | Public | `name`, `email`, `password`, `role` | Register new user. `role` can be `USER` or `ADMIN`. |
| `POST` | `/api/v1/auth/login` | Public | `email`, `password` | Authenticate user. Sets `token` cookie and returns JWT payload. |
| `POST` | `/api/v1/auth/logout` | Public | None | Clears the session cookie. |
| `GET` | `/api/v1/auth/me` | Logged In | None | Retrieve user profile details. |

### User Endpoints
| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/v1/users` | Admin Only | Retrieves list of all developers in the system. |

### Task Endpoints
| Method | Endpoint | Access | Query Parameters / Body Parameters | Description |
|:---|:---|:---|:---|:---|
| `GET` | `/api/v1/tasks` | Logged In | `status`, `priority`, `search` | Lists tasks. Regular users get their own; Admins get all. Queries are cached. |
| `POST` | `/api/v1/tasks` | Logged In | `title`, `description`, `status`, `priority`, `dueDate`, `userId` | Creates a task. Admins can specify any `userId` for assignment. |
| `GET` | `/api/v1/tasks/:id` | Logged In | None | Fetches detailed parameters of a task. |
| `PUT` | `/api/v1/tasks/:id` | Logged In | `title`, `description`, `status`, `priority`, `dueDate`, `userId` | Updates task parameters. |
| `DELETE` | `/api/v1/tasks/:id` | Logged In | None | Deletes a task. |

---

## Docker Deployment (PostgreSQL + Redis)

To run the complete production environment containing Next.js, a PostgreSQL database container, and a Redis caching server, use Docker Compose:

```bash
docker-compose up --build
```
Once initialized:
- Next.js Web App and REST APIs will run on [http://localhost:3000](http://localhost:3000).
- PostgreSQL database will expose port `5432`.
- Redis caching server will expose port `6379`.

---

## Scalability & Production Readiness Note

To transition this application to a high-availability, microservices-oriented architecture:

### 1. Decoupling Frontend and Backend (Microservices)
Next.js route handlers can be moved into dedicated backend services:
- **Auth Microservice**: A Go/Rust service handle token signing, bcrypt verification, and user storage. Can use an identity broker (e.g., Keycloak).
- **Task Microservice**: A lightweight Express/Go service handling task CRUD, connecting to a separate task database.
- **API Gateway**: An API Gateway (e.g. Kong, AWS API Gateway) handling routing, rate limiting, CORS, and token validation.

### 2. Caching Strategy (Redis Scale)
- **Redis Cluster**: For larger databases, deploy Redis in a Master-Slave cluster with Redis Sentinel to handle failover.
- **Cache-Aside Pattern**: High-frequency task queries are cached with a short TTL (Time to Live). When a mutation occurs, a message queue (e.g. RabbitMQ or Apache Kafka) can notify the caching service to invalidate keys asynchronously.

### 3. Database Scaling
- **Read/Write Split**: Split the PostgreSQL cluster into 1 Master (for write mutations) and multiple Read Replicas (for listing queries). Configure Prisma client to route requests accordingly.
- **Connection Pooling**: Use PgBouncer or Prisma Accelerate to handle serverless database connection limits.

### 4. Load Balancing & Edge CDN
- Deploy Next.js behind an Application Load Balancer (ALB) or Nginx reverse proxy.
- Cache static assets, layouts, and public profiles at edge nodes using Cloudflare or AWS CloudFront.
