import bcrypt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi import FastAPI
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.app.api.v1.api import api_router
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.schemas.base import UserCreate
from backend.app.db.database import get_db

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)
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

@app.get("/protected")
def protected_route(current_user: str = Depends(verify_token)):
    return {"message": f"Привет, {current_user}! Это защищенный маршрут."}
