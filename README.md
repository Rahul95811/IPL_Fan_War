# IPL Fan War

Production-ready full-stack IPL fan engagement app with live scores, real-time chat, JWT auth, and team voting.

## Tech Stack

- Frontend: React (Vite) + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB Atlas (Mongoose)
- Realtime: Socket.io
- External API: CricAPI live scores (proxied via backend with cache)

## Folder Structure

```txt
ipl/
  frontend/
    src/
      components/
      context/
      pages/
      services/
  backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    utils/
```

## Setup

### 1) Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Configure environment

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ipl_fan_war
JWT_SECRET=replace_with_long_secret
CLIENT_URL=http://localhost:5173
CRIC_API_URL=https://api.cricapi.com/v1/currentMatches
CRIC_API_KEY=your_cricapi_key
```

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3) Run locally

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/matches/live`
- `POST /api/vote` (protected)
- `GET /api/vote/:matchId`
- `GET /api/health`

## Sample API Responses

### Register/Login

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68063f04ef9f80d14d6f1159",
    "username": "rahul",
    "email": "rahul@example.com"
  }
}
```

### Live Match Scores

```json
{
  "source": "api",
  "matches": [
    {
      "matchId": "a1b2c3",
      "title": "MI vs CSK",
      "score": "168/5",
      "overs": "18.4",
      "status": "MI need 12 runs in 8 balls",
      "teamA": "MI",
      "teamB": "CSK"
    }
  ]
}
```

### Vote Submission

```json
{
  "message": "Vote submitted",
  "totalVotes": 152,
  "percentages": {
    "MI": 58.6,
    "CSK": 41.4
  }
}
```

## Deployment

### Frontend (Vercel)

- Import `frontend` directory as project root.
- Set env:
  - `VITE_API_BASE_URL=https://<your-backend-domain>/api`
  - `VITE_SOCKET_URL=https://<your-backend-domain>`

### Backend (Render or Railway)

- Deploy `backend` directory.
- Build command: `npm install`
- Start command: `npm start`
- Add all variables from `backend/.env.example`.
- Enable MongoDB Atlas network access and connection string.

## Security and Performance Included

- JWT auth + bcrypt password hashing
- Protected voting route
- API request rate limiting
- Socket chat rate limiting
- Basic abusive-word filter and message sanitization
- Helmet + CORS restrictions
- Live score API caching with stale fallback
- Input validation via `express-validator`
