/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier for each user
      - `language` (text) - Selected language (e.g., 'es', 'en')
      - `name` (text) - User's name
      - `gender` (text) - User's gender
      - `created_at` (timestamp) - Record creation timestamp
  
  2. Security
    - Enable RLS on `users` table
    - Add policy for anyone to insert their data
    - Add policy for users to read all data (public access for this demo)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL,
  name text NOT NULL,
  gender text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert user data"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read user data"
  ON users
  FOR SELECT
  TO anon
  USING (true);