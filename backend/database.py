import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "ctf.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create Users table (Vulnerable Mock)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS mock_users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        flag TEXT
    )
    ''')
    
    # Create Rate Limit store table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rate_limits (
        ip TEXT PRIMARY KEY,
        attempts INTEGER DEFAULT 0,
        last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Seed initial mock data if empty
    cursor.execute("SELECT COUNT(*) FROM mock_users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO mock_users (id, username, role, flag) VALUES (?, ?, ?, ?)", 
                       (1, "admin", "admin", "bxf{1d0r_m4st3r_4dm1n}"))
        cursor.execute("INSERT INTO mock_users (id, username, role, flag) VALUES (?, ?, ?, ?)", 
                       (10, "guest_user", "guest", "Nothing here"))

    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

if __name__ == "__main__":
    init_db()
