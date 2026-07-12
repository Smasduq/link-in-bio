# LinkBio

A link-in-bio platform with a **Next.js frontend** and **FastAPI backend**.

## Project Structure

```
link-in-bio/
├── backend/          # FastAPI API server
│   ├── app/
│   │   ├── routers/  # auth, profile, links, public, analytics
│   │   ├── models/   # SQLAlchemy models
│   │   └── schemas/  # Pydantic schemas
│   └── requirements.txt
└── frontend/         # Next.js 14 App Router UI
    └── src/
```

## Features

- **Auth** — Register, login (JWT), protected dashboard
- **Profile** — Username, bio, avatar, display name
- **Links** — CRUD, drag-and-drop reorder, active/inactive toggle, auto favicon
- **Appearance** — Background, accent color, button style customization
- **Analytics** — Page views, link clicks, 7-day charts, per-link stats
- **Public pages** — `/[username]` with theme applied and click tracking

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

App: http://localhost:3000

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon/PostgreSQL connection string (paste from Neon dashboard). Plain `postgresql://` URLs work — the app auto-selects the `psycopg` driver |
| `SECRET_KEY` | JWT signing secret |
| `CORS_ORIGINS` | Comma-separated frontend URLs |
| `FRONTEND_URL` | Frontend base URL (used in email links) |
| `BREVO_API_KEY` | Brevo transactional email API key (sends from `hello@smasduq.xyz`) |
| `DEV_ROUTES_ENABLED` | Set `true` locally to enable `POST /api/dev/test-email` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:8000`) |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/request` | — | Send signup OTP |
| POST | `/api/auth/register/verify` | — | Verify OTP & create account |
| POST | `/api/auth/login/request` | — | Send login OTP |
| POST | `/api/auth/login/verify` | — | Verify OTP & sign in |
| POST | `/api/auth/otp/resend` | — | Resend OTP code |
| POST | `/api/auth/forgot-password` | — | Send password reset email |
| POST | `/api/auth/reset-password` | — | Reset password with token |
| GET/PATCH | `/api/profile` | JWT | Profile settings |
| GET/POST | `/api/links` | JWT | List/create links |
| PATCH/DELETE | `/api/links/{id}` | JWT | Update/delete link |
| POST | `/api/links/reorder` | JWT | Reorder links |
| GET | `/api/public/{username}` | — | Public profile page data |
| POST | `/api/public/{username}/view` | — | Track page view |
| POST | `/api/public/links/{id}/click` | — | Track link click |
| GET | `/api/analytics` | JWT | Dashboard analytics |
