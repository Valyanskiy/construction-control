import {useEffect, useState} from "react";
import {useNavigate, useOutletContext, useParams} from "react-router-dom";
import api from "../utils/api";
import {motion} from "framer-motion";
import axios from "axios";
import Carousel from 'react-multi-carousel';
import 'react-multi-carousel/lib/styles.css';
import EditDefectModal from "../components/EditDefectModal";

interface Defect {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    due_date?: string;
    object_id: number;
    assigned_user_ids: number[];
    has_photo: boolean;
    image_count: number;
    created_at: string;
    updated_at: string;
    comments: Comment[];
    history: HistoryEntry[];
}

interface Comment {
    id: number;
    content: string;
    user_id: number;
    user_nickname: string;
    created_at: string;
}

interface HistoryEntry {
    id: number;
    field_name: string;
    old_value?: string;
    new_value?: string;
    user_nickname: string;
    created_at: string;
}

interface User {
    id: number;
    nickname: string;
    role: string;
}

interface ObjectType {
    id: number;
    name: string;
}

interface OutletContext {
    setHeader: (name: string | "Пиздец") => void;
}

function DefectDetail() {
    const { setHeader } = useOutletContext<OutletContext>();
    const {projectId, defectId} = useParams<{ projectId: string; defectId: string }>();
    const navigate = useNavigate();
    const {userRole = 'OBSERVER'} = useOutletContext<{ userRole?: string }>();
    const [defect, setDefect] = useState<Defect | null>(null);
    const [object, setObject] = useState<ObjectType | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [images, setImages] = useState<{id: number, filename: string}[]>([]);

    const baseUrl = `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000`;

    useEffect(() => {
        const fetchData = async () => {
            // Найти текущего пользователя
            const userInfoRes = await axios.get(`${baseUrl}/userinfo`, {
                headers: {'Authorization': `Bearer ${localStorage.getItem('access_token')}`}
            });

            const allUsersRes = await axios.get(`${baseUrl}/api/v1/users/`, {
                headers: {'Authorization': `Bearer ${localStorage.getItem('access_token')}`}
            });

            const currentUser = allUsersRes.data.find((u: User) => u.nickname === userInfoRes.data.nickname);
            if (currentUser) {
                setCurrentUserId(currentUser.id);
            }
        }

        fetchData()
    }, []);

    const getStatusText = (status: string) => {
        const statusMap: { [key: string]: string } = {
            'NEW': 'Новый',
            'OPEN': 'Открыт',
            'IN_PROGRESS': 'В работе',
            'UNDER_REVIEW': 'На проверке',
            'CLOSED': 'Закрыт'
        };
        return statusMap[status] || status;
    };

    const getPriorityText = (priority: string) => {
        const priorityMap: { [key: string]: string } = {
            'LOW': 'Низкий',
            'MEDIUM': 'Средний',
            'HIGH': 'Высокий',
            'CRITICAL': 'Критический'
        };
        return priorityMap[priority] || priority;
    };

    const getFieldText = (fieldName: string) => {
        const fieldMap: { [key: string]: string } = {
            'title': 'название',
            'description': 'описание',
            'status': 'статус',
            'priority': 'приоритет',
            'due_date': 'срок исправления',
            'assigned_users': 'назначенные пользователи',
            'created': 'создание'
        };
        return fieldMap[fieldName] || fieldName;
    };

    const getHistoryText = (history: string) => {
        const separatedHistory = history.split(".")
        switch (separatedHistory[0]) {
            case "DefectStatus":
                return getStatusText(separatedHistory[1]);
            case "DefectPriority":
                return getPriorityText(separatedHistory[1]);
            default:
                return separatedHistory;
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [defectRes, usersRes, imagesRes] = await Promise.all([
                    api.get(`/api/v1/defects/${defectId}`),
                    api.get('/api/v1/users/'),
                    api.get(`/api/v1/defects/${defectId}/images`)
                ]);

                setDefect(defectRes.data);
                setHeader(defectRes.data.title)
                setUsers(usersRes.data);
                setImages(imagesRes.data);
                setAssignedUsers(usersRes.data.filter((user: User) => defectRes.data.assigned_user_ids.includes(user.id)));

                const objectRes = await api.get(`/api/v1/objects/${defectRes.data.object_id}`);
                setObject(objectRes.data);
            } catch (error) {
                console.error(error);
                navigate(`/projects/${projectId}`);
            }
        };

        if (defectId) {
            fetchData();
        }
    }, [defectId, projectId, navigate]);

    const updateDefectStatus = async (status: string) => {
        try {
            const response = await api.put(`/api/v1/defects/${defectId}`, {status});
            setDefect(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const updateDefect = async (data: any) => {
        try {
            const response = await api.put(`/api/v1/defects/${defectId}`, data);
            setDefect(response.data);
            setHeader(response.data.title)
            setAssignedUsers(users.filter(user => response.data.assigned_user_ids.includes(user.id)));
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        }
    };

    const deleteDefect = async () => {
        if (!confirm('Вы уверены, что хотите удалить этот дефект?')) return;
        try {
            await api.delete(`/api/v1/defects/${defectId}`);
            navigate(`/projects/${projectId}`);
        } catch (error) {
            console.error(error);
        }
    };

    const availableStatusChanges = assignedUsers.some((user: User) => (user.id === currentUserId && ["IN_PROGRESS", "OPEN"].includes(defect!.status)) || userRole === "MANAGER")

    const addComment = async () => {
        if (!newComment.trim()) return;
        try {
            const response = await api.post(`/api/v1/defects/${defectId}/comments`, {
                content: newComment
            });
            setDefect(prev => prev ? {...prev, comments: [...prev.comments, response.data]} : null);
            setNewComment("");
        } catch (error) {
            console.error(error);
        }
    };

    if (!defect || !object) {
        return <div>Загрузка...</div>;
    }

    const statusColors = {
        NEW: 'bg-gray-500 text-shadow-[0_0_12px_white] font-bold',
        OPEN: 'bg-red-500 text-shadow-[0_0_12px_white] font-bold',
        IN_PROGRESS: 'bg-yellow-500 text-shadow-[0_0_12px_white] font-bold',
        UNDER_REVIEW: 'bg-purple-500 text-shadow-[0_0_12px_white] font-bold',
        CLOSED: 'bg-green-500 text-shadow-[0_0_12px_white] font-bold'
    };

    const priorityColors = {
        LOW: 'bg-green-500 text-shadow-[0_0_12px_white] font-bold',
        MEDIUM: 'bg-yellow-500 text-shadow-[0_0_12px_white] font-bold',
        HIGH: 'bg-orange-500 text-shadow-[0_0_12px_white] font-bold',
        CRITICAL: 'bg-red-500 text-shadow-[0_0_12px_white] font-bold'
    };

    return (
        <div className="min-h-screen pt-24 px-4 text-[#402f00]">
            <motion.div
                initial={{y: 5, opacity: 0}}
                animate={{y: 0, opacity: 1}}
                transition={{ease: "easeOut", duration: 1}}
            >
                <div className="px-4 flex flex-row justify-between">
                    <div className="flex flex-col justify-center">
                        <button
                            onClick={() => navigate(`/projects/${projectId}`)}
                            className="px-4 py-2 rounded-lg transition-all duration-200 hover:bg-[#efefef] bg-[#fafafa] text-shadow-[0_0_12px_white]"
                        >
                            ← Назад к проекту
                        </button>
                    </div>
                    {/*<div>*/}
                    {/*    <h1 className="text-3xl font-bold text-[#402f00] mb-2">{defect.title}</h1>*/}
                    {/*    <p className="text-gray-600">Объект: {object.name}</p>*/}
                    {/*</div>*/}
                    <div className="flex gap-2 items-center">
                            <span
                                className={`px-2 py-1 rounded text-xs text-[#402f00] ${statusColors[defect.status as keyof typeof statusColors]}`}>
                                {getStatusText(defect.status)}
                            </span>
                        <span
                            className={`px-2 py-1 rounded text-xs text-[#402f00] ${priorityColors[defect.priority as keyof typeof priorityColors]}`}>
                                {getPriorityText(defect.priority)}
                            </span>
                        {userRole !== 'OBSERVER' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1 bg-yellow-500 rounded-lg hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                            >
                                Редактировать
                            </button>
                        )}
                        {userRole === 'MANAGER' && (
                            <button
                                onClick={deleteDefect}
                                className="px-3 py-1 bg-yellow-500 rounded-lg hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                            >
                                Удалить
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-lg p-6">
                    {defect.description && (
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-2">Описание</h2>
                            <p className="text-gray-700">{defect.description}</p>
                        </div>
                    )}

                    {(defect.has_photo || images.length > 0) && (
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-2 text-center">Фото</h2>
                            <Carousel
                                responsive={{
                                    desktop: { breakpoint: { max: 3000, min: 1024 }, items: 1 },
                                    tablet: { breakpoint: { max: 1024, min: 464 }, items: 1 },
                                    mobile: { breakpoint: { max: 464, min: 0 }, items: 1 }
                                }}
                                infinite
                                showDots
                                arrows
                                className="w-full"
                            >
                                {defect.has_photo && (
                                    <div className="flex justify-center">
                                        <img
                                            src={`${baseUrl}/api/v1/defects/${defect.id}/photo`}
                                            alt="Фото дефекта"
                                            className="max-h-96 object-contain"
                                        />
                                    </div>
                                )}
                                {images.map((image) => (
                                    <div key={image.id} className="flex justify-center">
                                        <img
                                            src={`${baseUrl}/api/v1/defects/${defect.id}/images/${image.id}`}
                                            alt={image.filename}
                                            className="max-h-96 object-contain"
                                        />
                                    </div>
                                ))}
                            </Carousel>
                        </div>
                    )}

                    <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">Назначенные пользователи</h2>
                        {assignedUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {assignedUsers.map(user => (
                                    <span key={user.id}
                                          className="px-3 py-1 bg-yellow-500 text-shadow-[0_0_12px_white] rounded-lg text-sm">
                                        {user.nickname}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Никто не назначен</p>
                        )}
                    </div>

                    {availableStatusChanges ? (
                        <div className="mb-6 text-[#402f00]">
                            <h2 className="text-xl font-semibold mb-2">Изменить статус</h2>
                            <div className="flex gap-2 justify-center">
                                {userRole === 'MANAGER' && (
                                    <button
                                        onClick={() => updateDefectStatus('OPEN')}
                                        className="px-4 py-2 bg-red-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                    >
                                        Открыт
                                    </button>
                                )}
                                <button
                                    onClick={() => updateDefectStatus('IN_PROGRESS')}
                                    className="px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    В работе
                                </button>
                                <button
                                    onClick={() => updateDefectStatus('UNDER_REVIEW')}
                                    className="px-4 py-2 bg-purple-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    На проверке
                                </button>
                                {userRole === 'MANAGER' && (
                                    <button
                                        onClick={() => updateDefectStatus('CLOSED')}
                                        className="px-4 py-2 bg-green-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                    >
                                        Закрыт
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (<></>)
                    }

                    <div className="text-sm text-gray-500">
                        <p>Создан: {new Date(defect.created_at).toLocaleString()}</p>
                        <p>Обновлён: {new Date(defect.updated_at).toLocaleString()}</p>
                        {defect.due_date && <p>Срок исправления: {new Date(defect.due_date).toLocaleDateString()}</p>}
                    </div>

                    {/* Комментарии */}
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">Комментарии</h2>
                        <div className="space-y-4 mb-4">
                            {defect.comments?.map(comment => (
                                <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium">{comment.user_nickname}</span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(comment.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p>{comment.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Добавить комментарий..."
                                className="p-1 w-full border-1 border-gray-400/40 rounded-lg"
                                onKeyPress={(e) => e.key === 'Enter' && addComment()}
                            />
                            <button
                                onClick={addComment}
                                className="px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                            >
                                Отправить
                            </button>
                        </div>
                    </div>

                    {/* История изменений */}
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">История изменений</h2>
                        <div className="space-y-2">
                            {defect.history?.sort((a, b) => b.id - a.id).map(entry => (
                                <div key={entry.id} className="text-sm bg-gray-50 p-3 rounded">
                                    <span className="font-medium">{entry.user_nickname}</span>
                                    <span className="text-gray-600"> изменил {getFieldText(entry.field_name)}</span>
                                    {entry.old_value &&
                                        <span className="text-gray-600"> с "{getHistoryText(entry.old_value)}"</span>}
                                    {entry.new_value &&
                                        <span className="text-gray-600"> на "{getHistoryText(entry.new_value)}"</span>}
                                    <span className="text-gray-500 ml-2">
                                        {new Date(entry.created_at).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Модальное окно редактирования */}
                {isEditing && <EditDefectModal defect={defect} users={users} onClose={() => setIsEditing(false)}
                                               onUpdate={updateDefect} userRole={userRole}/>}
            </motion.div>
        </div>
    );
}

export default DefectDetail;
