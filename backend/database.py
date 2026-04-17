"""
Supabase client singleton.
Import `db` anywhere in the app to get the Supabase client.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY: str = os.environ["SUPABASE_SERVICE_KEY"]

# Use the service key for backend operations (bypasses RLS where needed)
db: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
