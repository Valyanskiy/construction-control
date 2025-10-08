import bcrypt
from datetime import datetime, timedelta, date
from fastapi import HTTPException, Depends, status, File, UploadFile, Form
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response, StreamingResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func, Date, cast
from typing import List, Optional
import json
import csv
import io

from app.core.config import settings
from app.db.database import get_db, SessionLocal
from app.models.user import User, RoleEnum
from app.models.project import Project
from app.models import Defect, Object, DefectComment, DefectHistory, DefectImage, Project
from app.models.defect import DefectStatus, DefectPriority
from app.schemas.base import UserCreate, ProjectCreate
from app.schemas.defect import DefectUpdate, DefectResponse, DefectCommentCreate, DefectCommentResponse
from app.schemas.object import ObjectCreate, ObjectUpdate, ObjectResponse
from app.db.database import get_db

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer()

def create_admin_if_empty():
    """Создает менеджера если база данных пользователей пуста"""
    db = None
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        if user_count == 0:
            hashed_password = bcrypt.hashpw("12345678".encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
            admin_user = User(nickname="admin", password=hashed_password, role=RoleEnum.MANAGER)
            db.add(admin_user)
            db.commit()
            print("Создан менеджер: admin/admin")
    except Exception as e:
        print(f"Ошибка при создании менеджера: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()

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

@app.post("/refresh")
def refresh_token(current_user: str = Depends(verify_token)):
    access_token = create_access_token(data={"sub": current_user})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/logout")
def logout():
    return {"message": "Logged out successfully"}

@app.get("/userinfo")
def protected_route(current_user: str = Depends(verify_token)):
    return {"nickname": current_user}

@app.get("/projects")
def projects(current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.role == RoleEnum.OBSERVER:
        # Наблюдатели видят все проекты
        all_projects = db.query(Project).all()
        return {"projects": [{"id": p.id, "title": p.title} for p in all_projects]}
    else:
        user_projects = user.projects.all()
        return {"projects": [{"id": p.id, "title": p.title} for p in user_projects]}

@app.get("/projects/{project_id}")
def get_project(project_id: int, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    if user.role != RoleEnum.OBSERVER and user not in project.users:
        raise HTTPException(status_code=403, detail="Нет доступа к проекту")
    
    return {"id": project.id, "title": project.title}

# User management functions
def get_current_user(current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role.value not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

@app.post("/projects/create")
def create_project(project: ProjectCreate, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    new_project = Project(title=project.title)
    db.add(new_project)
    db.flush()
    
    new_project.users.append(user)
    db.commit()
    
    return {"message": "Проект создан", "project_id": new_project.id}

@app.put("/projects/{project_id}")
def update_project(project_id: int, project: ProjectCreate, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.role != RoleEnum.MANAGER:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    existing_project = db.query(Project).filter(Project.id == project_id).first()
    if not existing_project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    existing_project.title = project.title
    db.commit()
    
    return {"message": "Проект обновлен"}

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user.role != RoleEnum.MANAGER:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    
    existing_project = db.query(Project).filter(Project.id == project_id).first()
    if not existing_project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    db.delete(existing_project)
    db.commit()
    
    return {"message": "Проект удален"}

# Objects routes
@app.post("/api/v1/objects/", response_model=ObjectResponse)
def create_object(object_data: ObjectCreate, user: User = Depends(require_role(["MANAGER", "ENGINEER"])), db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == object_data.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_object = Object(**object_data.dict())
    db.add(db_object)
    db.commit()
    db.refresh(db_object)
    return db_object

@app.get("/api/v1/objects/", response_model=List[ObjectResponse])
def get_objects(project_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Object)
    if project_id:
        query = query.filter(Object.project_id == project_id)
    return query.all()

@app.get("/api/v1/objects/{object_id}", response_model=ObjectResponse)
def get_object(object_id: int, db: Session = Depends(get_db)):
    db_object = db.query(Object).filter(Object.id == object_id).first()
    if not db_object:
        raise HTTPException(status_code=404, detail="Object not found")
    return db_object

@app.put("/api/v1/objects/{object_id}", response_model=ObjectResponse)
def update_object(object_id: int, object_data: ObjectUpdate, user: User = Depends(require_role(["MANAGER", "ENGINEER"])), db: Session = Depends(get_db)):
    db_object = db.query(Object).filter(Object.id == object_id).first()
    if not db_object:
        raise HTTPException(status_code=404, detail="Object not found")
    
    for field, value in object_data.dict(exclude_unset=True).items():
        setattr(db_object, field, value)
    
    db.commit()
    db.refresh(db_object)
    return db_object

@app.delete("/api/v1/objects/{object_id}")
def delete_object(object_id: int, user: User = Depends(require_role(["MANAGER"])), db: Session = Depends(get_db)):
    db_object = db.query(Object).filter(Object.id == object_id).first()
    if not db_object:
        raise HTTPException(status_code=404, detail="Object not found")
    
    db.delete(db_object)
    db.commit()
    return {"message": "Object deleted"}

def translate_value(field_name: str, value: str) -> str:
    if not value:
        return value
    
    translations = {
        'status': {
            'NEW': 'Новый',
            'OPEN': 'Открыт',
            'IN_PROGRESS': 'В работе', 
            'UNDER_REVIEW': 'На проверке',
            'CLOSED': 'Закрыт'
        },
        'priority': {
            'LOW': 'Низкий',
            'MEDIUM': 'Средний',
            'HIGH': 'Высокий', 
            'CRITICAL': 'Критический'
        }
    }
    
    if field_name in translations and value in translations[field_name]:
        return translations[field_name][value]
    
    return value

def build_defect_response(defect):
    response_data = {
        "id": defect.id,
        "title": defect.title,
        "description": defect.description,
        "status": defect.status,
        "priority": defect.priority,
        "due_date": defect.due_date,
        "object_id": defect.object_id,
        "created_at": defect.created_at,
        "updated_at": defect.updated_at,
        "assigned_user_ids": [user.id for user in defect.assigned_users],
        "has_photo": defect.photo is not None,
        "image_count": len(defect.images),
        "comments": [
            {
                "id": c.id,
                "content": c.content,
                "user_id": c.user_id,
                "user_nickname": c.user.nickname,
                "created_at": c.created_at
            } for c in defect.comments
        ],
        "history": [
            {
                "id": h.id,
                "field_name": h.field_name,
                "old_value": translate_value(h.field_name, h.old_value) if h.old_value else h.old_value,
                "new_value": translate_value(h.field_name, h.new_value) if h.new_value else h.new_value,
                "user_id": h.user_id,
                "user_nickname": h.user.nickname,
                "created_at": h.created_at
            } for h in defect.history
        ]
    }
    return DefectResponse(**response_data)

@app.post("/api/v1/defects/", response_model=DefectResponse)
async def create_defect(
    title: str = Form(...),
    object_id: int = Form(...),
    description: Optional[str] = Form(None),
    priority: str = Form("MEDIUM"),
    due_date: Optional[str] = Form(None),
    assigned_user_ids: str = Form("[]"),
    photo: Optional[UploadFile] = File(None),
    user: User = Depends(require_role(["MANAGER", "ENGINEER"])),
    db: Session = Depends(get_db)
):
    obj = db.query(Object).filter(Object.id == object_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    photo_data = None
    if photo:
        print(f"Photo received: {photo.filename}, size: {photo.size}")
        photo_data = await photo.read()
        print(f"Photo data length: {len(photo_data) if photo_data else 0}")
    else:
        print("No photo received")
    
    user_ids = json.loads(assigned_user_ids)
    priority_enum = DefectPriority(priority.upper())
    
    parsed_due_date = None
    if due_date and user.role.value == "MANAGER":
        from datetime import datetime
        parsed_due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
    
    db_defect = Defect(
        title=title,
        description=description,
        priority=priority_enum,
        due_date=parsed_due_date,
        object_id=object_id,
        photo=photo_data
    )
    print(f"Creating defect with photo: {photo_data is not None}")
    db.add(db_defect)
    db.flush()
    
    if user_ids and user.role.value == "MANAGER":
        # Проверяем, что назначаемые пользователи - инженеры из проекта
        project = obj.project
        project_engineers = [u.id for u in project.users if u.role == RoleEnum.ENGINEER]
        valid_user_ids = [uid for uid in user_ids if uid in project_engineers]
        
        if valid_user_ids:
            users = db.query(User).filter(User.id.in_(valid_user_ids)).all()
            db_defect.assigned_users = users
    
    history = DefectHistory(
        field_name="created",
        new_value="Дефект создан",
        defect_id=db_defect.id,
        user_id=user.id
    )
    db.add(history)
    
    db.commit()
    db.refresh(db_defect)
    
    return build_defect_response(db_defect)

@app.get("/api/v1/defects/export")
def export_defects_csv(db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    defects = db.query(Defect).options(
        joinedload(Defect.object).joinedload(Object.project)
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Название', 'Описание', 'Статус', 'Приоритет', 'Создан', 'Обновлен', 'Объект', 'Проект'])
    
    for defect in defects:
        writer.writerow([
            defect.id,
            defect.title,
            defect.description or '',
            defect.status.value,
            defect.priority.value,
            defect.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            defect.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
            defect.object.name,
            defect.object.project.title
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=defects_export_{date.today()}.csv"}
    )

@app.get("/api/v1/defects/stats/weekly")
def get_weekly_stats(db: Session = Depends(get_db)):
    end_date = date.today()
    start_date = end_date - timedelta(days=6)
    
    # Created defects by day
    created_stats = db.query(
        cast(Defect.created_at, Date).label('date'),
        func.count(Defect.id).label('count')
    ).filter(
        cast(Defect.created_at, Date) >= start_date,
        cast(Defect.created_at, Date) <= end_date
    ).group_by(cast(Defect.created_at, Date)).all()
    
    # Resolved defects by day (status CLOSED)
    resolved_stats = db.query(
        cast(Defect.updated_at, Date).label('date'),
        func.count(Defect.id).label('count')
    ).filter(
        cast(Defect.updated_at, Date) >= start_date,
        cast(Defect.updated_at, Date) <= end_date,
        Defect.status == DefectStatus.CLOSED
    ).group_by(cast(Defect.updated_at, Date)).all()
    
    # Fill missing dates with 0
    result = []
    for i in range(7):
        current_date = start_date + timedelta(days=i)
        created_count = next((s.count for s in created_stats if s.date == current_date), 0)
        resolved_count = next((s.count for s in resolved_stats if s.date == current_date), 0)
        result.append({
            'date': current_date.isoformat(),
            'created': created_count,
            'resolved': resolved_count
        })
    
    return result

@app.get("/api/v1/defects/", response_model=List[DefectResponse])
def get_defects(object_id: int = None, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    query = db.query(Defect).options(
        joinedload(Defect.assigned_users),
        joinedload(Defect.comments).joinedload(DefectComment.user),
        joinedload(Defect.history).joinedload(DefectHistory.user),
        joinedload(Defect.images)
    )
    
    if object_id:
        query = query.filter(Defect.object_id == object_id)
    
    # Наблюдатели видят все дефекты
    if user.role != RoleEnum.OBSERVER:
        # Для других ролей показываем только дефекты из проектов, где они участвуют
        user_project_ids = [p.id for p in user.projects.all()]
        query = query.join(Object).filter(Object.project_id.in_(user_project_ids))
    
    defects = query.all()
    return [build_defect_response(defect) for defect in defects]

@app.get("/api/v1/defects/{defect_id}", response_model=DefectResponse)
def get_defect(defect_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    
    db_defect = db.query(Defect).options(
        joinedload(Defect.assigned_users),
        joinedload(Defect.comments).joinedload(DefectComment.user),
        joinedload(Defect.history).joinedload(DefectHistory.user),
        joinedload(Defect.images)
    ).filter(Defect.id == defect_id).first()
    
    if not db_defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    return build_defect_response(db_defect)

@app.put("/api/v1/defects/{defect_id}", response_model=DefectResponse)
def update_defect(defect_id: int, defect_data: DefectUpdate, user: User = Depends(require_role(["MANAGER", "ENGINEER"])), db: Session = Depends(get_db)):
    db_defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not db_defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    # Проверка прав на изменение полей
    update_data = defect_data.dict(exclude_unset=True, exclude={"assigned_user_ids"})
    
    if user.role.value == "ENGINEER":
        # Инженер может менять только title, description и некоторые статусы
        allowed_fields = ["title", "description"]
        if db_defect.status != DefectStatus.NEW:
            allowed_fields.append("status")
            # Проверяем разрешенные статусы для инженера
            if "status" in update_data:
                allowed_statuses = [DefectStatus.OPEN, DefectStatus.IN_PROGRESS, DefectStatus.UNDER_REVIEW]
                if update_data["status"] not in allowed_statuses:
                    raise HTTPException(status_code=403, detail="Engineer cannot set this status")
        
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    # Создаем записи в истории для изменений
    for field, new_value in update_data.items():
        old_value = getattr(db_defect, field)
        if old_value != new_value:
            history = DefectHistory(
                field_name=field,
                old_value=str(old_value) if old_value else None,
                new_value=str(new_value) if new_value else None,
                defect_id=defect_id,
                user_id=user.id
            )
            db.add(history)
            setattr(db_defect, field, new_value)
    
    if defect_data.assigned_user_ids is not None and user.role.value == "MANAGER":
        old_users = [u.id for u in db_defect.assigned_users]
        new_users = defect_data.assigned_user_ids
        if old_users != new_users:
            # Проверяем, что назначаемые пользователи - инженеры из проекта
            obj = db_defect.object
            project = obj.project
            project_engineers = [u.id for u in project.users if u.role == RoleEnum.ENGINEER]
            valid_user_ids = [uid for uid in new_users if uid in project_engineers]
            
            history = DefectHistory(
                field_name="assigned_users",
                old_value=str(old_users),
                new_value=str(valid_user_ids),
                defect_id=defect_id,
                user_id=user.id
            )
            db.add(history)
            users = db.query(User).filter(User.id.in_(valid_user_ids)).all()
            db_defect.assigned_users = users
    
    db.commit()
    db.refresh(db_defect)
    
    return build_defect_response(db_defect)

@app.post("/api/v1/defects/{defect_id}/comments", response_model=DefectCommentResponse)
def add_comment(defect_id: int, comment_data: DefectCommentCreate, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    user = db.query(User).filter(User.nickname == current_user).first()
    
    comment = DefectComment(
        content=comment_data.content,
        defect_id=defect_id,
        user_id=user.id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return DefectCommentResponse(
        id=comment.id,
        content=comment.content,
        user_id=comment.user_id,
        user_nickname=user.nickname,
        created_at=comment.created_at
    )

@app.post("/api/v1/defects/{defect_id}/images")
async def add_image(defect_id: int, image: UploadFile = File(...), db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    image_data = await image.read()
    
    defect_image = DefectImage(
        filename=image.filename,
        image_data=image_data,
        defect_id=defect_id
    )
    db.add(defect_image)
    db.commit()
    
    return {"message": "Image added successfully"}

@app.delete("/api/v1/defects/{defect_id}/photo")
def delete_defect_photo(defect_id: int, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    defect.photo = None
    db.commit()
    return {"message": "Photo deleted"}

@app.delete("/api/v1/defects/{defect_id}/images/{image_id}")
def delete_defect_image(defect_id: int, image_id: int, db: Session = Depends(get_db)):
    image = db.query(DefectImage).filter(DefectImage.id == image_id, DefectImage.defect_id == defect_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    db.delete(image)
    db.commit()
    return {"message": "Image deleted"}

@app.get("/api/v1/defects/{defect_id}/images")
def get_defect_images(defect_id: int, db: Session = Depends(get_db)):
    images = db.query(DefectImage).filter(DefectImage.defect_id == defect_id).all()
    return [{"id": img.id, "filename": img.filename} for img in images]

@app.get("/api/v1/defects/{defect_id}/photo")
def get_defect_photo(defect_id: int, db: Session = Depends(get_db)):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not defect or not defect.photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return Response(content=defect.photo, media_type="image/jpeg")

@app.get("/api/v1/defects/{defect_id}/images/{image_id}")
def get_image(defect_id: int, image_id: int, db: Session = Depends(get_db)):
    image = db.query(DefectImage).filter(DefectImage.id == image_id, DefectImage.defect_id == defect_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return Response(content=image.image_data, media_type="image/jpeg")

@app.delete("/api/v1/defects/{defect_id}")
def delete_defect(defect_id: int, db: Session = Depends(get_db)):
    db_defect = db.query(Defect).filter(Defect.id == defect_id).first()
    if not db_defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    
    db.delete(db_defect)
    db.commit()
    return {"message": "Defect deleted"}

# Users routes
@app.get("/api/v1/users/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": user.id, "nickname": user.nickname, "role": user.role} for user in users]

@app.post("/api/v1/users/register")
def register_user(user_data: dict, user_manager: User = Depends(require_role(["MANAGER"])), db: Session = Depends(get_db)):
    if db.query(User).filter(User.nickname == user_data["nickname"]).first():
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = bcrypt.hashpw(user_data["password"].encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
    
    new_user = User(
        nickname=user_data["nickname"],
        password=hashed_password,
        role=RoleEnum(user_data["role"])
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully"}

@app.delete("/api/v1/users/{user_id}")
def delete_user(user_id: int, user_manager: User = Depends(require_role(["MANAGER"])), db: Session = Depends(get_db)):
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_delete.id == user_manager.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user_to_delete)
    db.commit()
    return {"message": "User deleted successfully"}

# Project users management
@app.get("/api/v1/projects/{project_id}/users")
def get_project_users(project_id: int, user: User = Depends(require_role(["MANAGER"])), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return [{"id": u.id, "nickname": u.nickname, "role": u.role} for u in project.users]

@app.post("/api/v1/projects/{project_id}/users/{user_id}")
def add_user_to_project(project_id: int, user_id: int, user: User = Depends(require_role(["MANAGER"])), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    user_to_add = db.query(User).filter(User.id == user_id).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_add.role == RoleEnum.OBSERVER:
        raise HTTPException(status_code=400, detail="Cannot add observers to projects")
    
    if user_to_add not in project.users:
        project.users.append(user_to_add)
        db.commit()
    
    return {"message": "User added to project"}

@app.delete("/api/v1/projects/{project_id}/users/{user_id}")
def remove_user_from_project(project_id: int, user_id: int, user: User = Depends(require_role(["MANAGER"])), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    user_to_remove = db.query(User).filter(User.id == user_id).first()
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_remove in project.users:
        project.users.remove(user_to_remove)
        db.commit()
    
    return {"message": "User removed from project"}

@app.get("/api/v1/projects/{project_id}/available-users")
def get_available_users_for_defects(project_id: int, current_user: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.nickname == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Возвращаем только инженеров из проекта
    engineers = [u for u in project.users if u.role == RoleEnum.ENGINEER]
    return [{"id": u.id, "nickname": u.nickname, "role": u.role} for u in engineers]

create_admin_if_empty()