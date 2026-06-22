-- CatchMe Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  photo_url TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'sr')),
  city TEXT NOT NULL DEFAULT 'Belgrade',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Belgrade',
  address TEXT,
  photo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '8 hours'),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Intentions table (one per user, upsertable)
CREATE TABLE IF NOT EXISTS public.intentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('poznanstvo', 'avantura', 'veza')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  intention_type TEXT NOT NULL CHECK (intention_type IN ('poznanstvo', 'avantura', 'veza')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkin', 'message')),
  amount INTEGER NOT NULL, -- in cents
  stripe_payment_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_club_id ON public.checkins(club_id);
CREATE INDEX IF NOT EXISTS idx_checkins_active ON public.checkins(active, expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON public.payments(stripe_payment_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can read all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Clubs policies
DROP POLICY IF EXISTS "Anyone can read clubs" ON public.clubs;
CREATE POLICY "Anyone can read clubs" ON public.clubs FOR SELECT USING (true);

-- Checkins policies
DROP POLICY IF EXISTS "Anyone can read active checkins" ON public.checkins;
DROP POLICY IF EXISTS "Users can create own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Users can update own checkins" ON public.checkins;
CREATE POLICY "Anyone can read active checkins" ON public.checkins FOR SELECT USING (active = true AND expires_at > NOW());
CREATE POLICY "Users can create own checkins" ON public.checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.checkins FOR UPDATE USING (auth.uid() = user_id);

-- Intentions policies
DROP POLICY IF EXISTS "Anyone can read intentions" ON public.intentions;
DROP POLICY IF EXISTS "Users can manage own intention" ON public.intentions;
CREATE POLICY "Anyone can read intentions" ON public.intentions FOR SELECT USING (true);
CREATE POLICY "Users can manage own intention" ON public.intentions FOR ALL USING (auth.uid() = user_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can update messages" ON public.messages;
CREATE POLICY "Users can read own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can update messages" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Payments policies
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
DROP POLICY IF EXISTS "Backend can insert payments" ON public.payments;
CREATE POLICY "Users can read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Backend can insert payments" ON public.payments FOR INSERT WITH CHECK (true);

-- Seed Belgrade clubs
INSERT INTO public.clubs (name, city, address, photo_url, description) VALUES
  ('Loft', 'Belgrade', 'Studentski trg 5, Beograd', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800', 'The most famous club in Belgrade'),
  ('Drugstore', 'Belgrade', 'Kej Oslobodjenja bb, Beograd', 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800', 'Underground techno club'),
  ('Plastic', 'Belgrade', 'Cetinjska 15, Beograd', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 'Upscale club in Savamala'),
  ('Mr Stefan Braun', 'Belgrade', 'Nemanjina 4, Beograd', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800', 'Rooftop lounge & club'),
  ('Splavovi Ada', 'Belgrade', 'Ada Ciganlija, Beograd', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800', 'River floating clubs'),
  ('Freestyler', 'Belgrade', 'Bulevar Nikole Tesle bb', 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800', 'Popular Sava river club')
ON CONFLICT DO NOTHING;
