import os
import psycopg2

DB_SECRET_ARN = os.getenv('DB_SECRET_ARN')
DB_PROXY_ENDPOINT = os.getenv('DB_PROXY_ENDPOINT')

# NOTE: In Lambda, retrieve credentials from Secrets Manager via boto3 or env-injected.
# For local dev, you may set standard PG env vars.

def get_conn():
    conn = psycopg2.connect(
        host=os.getenv('PGHOST', DB_PROXY_ENDPOINT),
        dbname=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        port=int(os.getenv('PGPORT', '5432')),
        connect_timeout=3,
    )
    return conn

