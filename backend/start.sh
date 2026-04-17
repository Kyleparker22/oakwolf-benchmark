#!/bin/bash
# ─────────────────────────────────────────────────────────
# Oakwolf Backend — Start Script
# Run this from the backend/ folder
# ─────────────────────────────────────────────────────────

echo "Starting Oakwolf API..."

# Check .env exists
if [ ! -f .env ]; then
  echo ""
  echo "ERROR: .env file not found!"
  echo "Copy .env.example to .env and fill in your Supabase keys."
  echo ""
  echo "  cp .env.example .env"
  echo "  then open .env and add your keys"
  echo ""
  exit 1
fi

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
