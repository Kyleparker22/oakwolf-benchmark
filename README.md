# Oakwolf Epic Security Benchmark Tool — Phase 1

## What's in this folder

```
oakwolf/
├── supabase_migration.sql     ← Run this in Supabase to create all tables
├── backend/
│   ├── scoring_engine.py      ← Core scoring logic (deterministic)
│   ├── answer_map.json        ← All 112 Q/answer/score/domain mappings
│   ├── domain_weights.json    ← Domain weight configuration
│   └── rules.json             ← All 25 rule engine rules
└── README.md                  ← This file
```

---

## Step 1 — Run the database migration in Supabase

1. Go to your Supabase project at https://fexouczrzlkpabdbsvpk.supabase.co
2. In the left sidebar, click **SQL Editor**
3. Click **New query**
4. Open the file `supabase_migration.sql` from this folder
5. Copy the entire contents and paste it into the SQL editor
6. Click **Run**

You should see "Success" and all tables will be created.

---

## Step 2 — Test the scoring engine

In Terminal, navigate to the backend folder and run:

```bash
cd ~/oakwolf/backend
python3 scoring_engine.py
```

You should see output like:
```
Overall Score:   70.5 / 100
Maturity Level:  Level 4 – Governed
```

If you see that, the scoring engine is working correctly.

---

## What's coming in Phase 2

- FastAPI backend with all API endpoints
- Assessment creation, context form, questionnaire submission
- Score calculation endpoint
- Results storage in Supabase

## What's coming in Phase 3+

- Rule engine findings display
- Next.js frontend
- Lead gate
- AI narrative generation
- PDF report generation
