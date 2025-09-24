import bcrypt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.api.v1.api import api_router
from app.core.config import settings
from app.models.user import User
from app.schemas.base import UserCreate
from app.db.database import get_db

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer()

app.include_router(api_router, prefix="/api/v1")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        nickname: str = payload.get("sub")
        if nickname is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return nickname
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI"}

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.nickname == user.nickname).first() is not None:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")

    hashedPassword = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

    newUser = User(
        nickname = user.nickname,
        password = hashedPassword
    )

    db.add(newUser)
    db.commit()
    db.refresh(newUser)
    return {"message": "Пользователь зарегистрирован"}

@app.post("/auth")
def auth(user: UserCreate, db: Session = Depends(get_db)):
    foundUser = db.query(User).filter(User.nickname == user.nickname).first()

    if foundUser is None:
        raise HTTPException(status_code=400, detail="Пользователь не существует")

    if bcrypt.checkpw(user.password.encode('utf-8'), foundUser.password.encode('utf-8')):
        access_token = create_access_token(data={"sub": foundUser.nickname})
        return {"access_token": access_token, "token_type": "bearer"}
    else:
        raise HTTPException(status_code=401, detail="Неверный пароль")

@app.get("/userinfo")
def protected_route(current_user: str = Depends(verify_token)):
    return {"nickname": current_user}

@app.get("/projects")
def projects(current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    user_projects = user.projects.all()
    return {"projects": [{"id": p.id, "title": p.title} for p in user_projects]}

# Создание админа при пустой БД после инициализации всех моделей
# from app.init_admin import create_admin_if_empty
# create_admin_if_empty()
