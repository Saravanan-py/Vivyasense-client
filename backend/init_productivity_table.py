"""
Initialize ProductivitySession table in the database
Run this script once to create the new table for storing productivity reports
"""

from database import engine, Base
import models

def init_productivity_table():
    """Create ProductivitySession table if it doesn't exist"""
    try:
        # Import all models to ensure they're registered with Base
        from models import ProductivitySession
        
        # Create only the ProductivitySession table
        Base.metadata.create_all(bind=engine, tables=[ProductivitySession.__table__])
        
        print("✅ ProductivitySession table created successfully!")
        print("📊 Productivity reports will now be saved to the database and persist after reload.")
    except Exception as e:
        print(f"❌ Error creating table: {e}")

if __name__ == "__main__":
    init_productivity_table()

