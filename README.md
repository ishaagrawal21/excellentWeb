## MERN Task Management Interview App

This project implements the required MERN + TypeScript + Socket.io task management app.

- **Backend** (Node.js, Express, TypeScript, MongoDB, Socket.io, JWT) in `server`
- **Frontend** (React, TypeScript, Socket.io client) in `client`

### Backend Setup (`server`)

1. Copy `.env.example` to `.env` and adjust values if needed:

```bash
cd server
cp .env.example .env
```

2. Install dependencies and run:

```bash
npm install
npm run dev
```

The API and Socket.io server will run on `http://localhost:5000`.

### Frontend Setup (`client`)

1. Copy `.env.example` to `.env` (defaults already point to the backend):

```bash
cd client
cp .env.example .env
```

2. Install dependencies and run:

```bash
npm install
npm run dev
```

The app will run via Vite (by default `http://localhost:5173`).

### Users and Roles



- Admin: username `admin`, password `password`
- Users: username `alice` / `bob`, password `password`

### Core Endpoints

- `POST /api/login` – returns JWT and user info
- `POST /api/tasks` – Admin only, create and assign a task
- `GET /api/tasks` – Admin gets all tasks, User gets only assigned tasks
- `PATCH /api/tasks/:id/status` – Assigned user only, update status

Socket.io sends a `task:assigned` event to the assigned user when a new task is created.

