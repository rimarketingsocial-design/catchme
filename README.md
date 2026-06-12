# CatchMe — Location-Based Dating App for Nightclubs

CatchMe connects people at nightclubs in real-time. Males pay to check in and message girls; females check in free and receive paid messages.

## Tech Stack

- **Frontend**: React + Tailwind CSS + Vite (deploy: Vercel)
- **Backend**: Node.js + Express (deploy: Render)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Payments**: Stripe

## Project Structure

```
catchme/
├── frontend/          # React app
├── backend/           # Express API
└── supabase/
    └── migrations/    # SQL schema
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial.sql` in the SQL editor
3. Enable Storage bucket named `avatars` (public)
4. Copy your project URL and anon key

### 2. Stripe

1. Create account at [stripe.com](https://stripe.com)
2. Copy your publishable key and secret key
3. For webhooks: add endpoint `https://your-backend.render.com/api/payments/webhook`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for required variables.

## Deploy

### Backend → Render

1. Push to GitHub
2. Create new Web Service on Render
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `.env.example`

### Frontend → Vercel

1. Import GitHub repo on Vercel
2. Set root directory to `frontend`
3. Add all environment variables from `.env.example`
4. Deploy

## Features

### Male Flow
- Register & select city
- Browse Belgrade nightclubs
- Pay $0.50 to check in
- See all checked-in girls (swipe UI)
- Pay to send message (price based on her intention)

### Female Flow
- Register & set intention (Poznanstvo/Veza/Avantura)
- Check in free
- See checked-in guys
- Receive inbox notifications when paid messages arrive
- Reply for free

## Pricing

| Action | Cost |
|--------|------|
| Male check-in | $0.50 |
| Message (Poznanstvo) | $1.00 |
| Message (Veza) | $2.00 |
| Message (Avantura) | $3.00 |
