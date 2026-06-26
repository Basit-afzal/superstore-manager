# SuperStore Manager — MERN Stack

A super store management system with React (Vite) frontend and Node.js/Express backend.

## Project Structure

```
mern-project/
├── client/          # React frontend (Vite)
├── server/          # Node.js/Express backend
├── package.json     # Root scripts
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MongoDB URI and JWT secret.

### 3. Run development servers

```bash
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:5000

Or run them separately:

```bash
npm run dev:client
npm run dev:server
```

## Frontend

The React client includes:

- Login page (UI ready — connect to `POST /api/auth/login`)
- Dashboard with charts and stats
- Products, Inventory, Sales, Employees, Salesmen pages
- API service layer at `client/src/services/api.js`

All API calls go through `client/src/services/api.js`. Wire each endpoint to your Express routes.

## Backend

The Express server is a **skeleton only** — implement your own:

- `server/src/config/db.js` — MongoDB connection
- `server/src/models/` — Mongoose models
- `server/src/controllers/` — Route handlers
- `server/src/routes/` — API routes
- `server/src/middleware/` — Auth & error handling
- `server/src/utils/` — JWT & password hashing

Health check: `GET /api/health`

## Tech Stack

- **Frontend:** React, Vite, React Router, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Auth:** JWT (implement in server)

## License

MIT
