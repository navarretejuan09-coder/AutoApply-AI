-- Enable pgvector for future embedding storage (M2+). Safe no-op if already enabled.
CREATE EXTENSION IF NOT EXISTS vector;
