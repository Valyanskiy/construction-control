import bcrypt
from sqlalchemy.orm import Session
from backend.app.models import User
from backend.app.db.database import SessionLocal


def create_admin_if_empty():
    """Создает админа если база данных пользователей пуста"""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            hashed_password = bcrypt.hashpw("admin".encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
            admin_user = User(nickname="admin", password=hashed_password)
            db.add(admin_user)
            db.commit()
            print("Создан админ пользователь: admin/admin")
    except Exception as e:
        print(f"Ошибка при создании админа: {e}")
        db.rollback()
    finally:
        db.close()
