import { useEffect, useState } from "react";
import {useParams, useNavigate, useOutletContext} from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import ProjectUsersModal from "../components/ProjectUsersModal";

interface Project {
    id: number;
    title: string;
}

interface ObjectType {
    id: number;
    name: string;
    description?: string;
    address?: string;
    project_id: number;
}

interface Defect {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    object_id: number;
    assigned_user_ids: number[];
    has_photo: boolean;
    created_at: string;
}

interface User {
    id: number;
    nickname: string;
    role: string;
}

interface OutletContext {
    setHeader: (name: string) => void;
}

function ProjectDetail() {
    const { setHeader } = useOutletContext<OutletContext>();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [objects, setObjects] = useState<ObjectType[]>([]);
    const [defects, setDefects] = useState<Defect[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const { userRole = 'OBSERVER' } = useOutletContext<{ userRole?: string }>();
    const [assignedToMeFilter, setAssignedToMeFilter] = useState(userRole == "ENGINEER");
    const [sortBy, setSortBy] = useState("created_at");
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [showCreateObject, setShowCreateObject] = useState(false);
    const [showCreateDefect, setShowCreateDefect] = useState<number | null>(null);
    const [editingObject, setEditingObject] = useState<ObjectType | null>(null);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>("");


    const baseUrl = `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000`;

    const getPriorityText = (priority: string) => {
        const priorityMap: { [key: string]: string } = {
            'LOW': 'Низкий',
            'MEDIUM': 'Средний',
            'HIGH': 'Высокий',
            'CRITICAL': 'Критический'
        };
        return priorityMap[priority] || priority;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projectRes, objectsRes, defectsRes] = await Promise.all([
                    axios.get(`${baseUrl}/projects/${id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                    }),
                    axios.get(`${baseUrl}/api/v1/objects/?project_id=${id}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                    }),
                    axios.get(`${baseUrl}/api/v1/defects/`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                    })
                ]);

                setProject(projectRes.data);
                setHeader(projectRes.data.title);
                setObjects(objectsRes.data);
                setDefects(defectsRes.data);
                
                // Получить доступных пользователей для дефектов (только инженеры из проекта)
                const availableUsersRes = await axios.get(`${baseUrl}/api/v1/projects/${id}/available-users`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
                setUsers(availableUsersRes.data);
                
                // Найти текущего пользователя
                const userInfoRes = await axios.get(`${baseUrl}/userinfo`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
                
                const allUsersRes = await axios.get(`${baseUrl}/api/v1/users/`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
                
                const currentUser = allUsersRes.data.find((u: User) => u.nickname === userInfoRes.data.nickname);
                if (currentUser) {
                    setCurrentUserId(currentUser.id);
                    setCurrentUserRole(currentUser.role);
                }
            } catch (error) {
                console.log(error);
                navigate('/projects');
            }
        };

        if (id) {
            fetchData();
        }
    }, [id, navigate]);

    const createObject = async (name: string, description: string, address: string) => {
        try {
            const response = await axios.post(`${baseUrl}/api/v1/objects/`, {
                name, description, address, project_id: parseInt(id!)
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            setObjects([...objects, response.data]);
            setShowCreateObject(false);
        } catch (error) {
            console.error(error);
        }
    };

    const createDefect = async (formData: FormData) => {
        try {
            const response = await axios.post(`${baseUrl}/api/v1/defects/`, formData, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            setDefects([...defects, response.data]);
            setShowCreateDefect(null);
        } catch (error) {
            console.error(error);
        }
    };

    const updateObject = async (id: number, name: string, description: string, address: string) => {
        try {
            const response = await axios.put(`${baseUrl}/api/v1/objects/${id}`, {
                name, description, address
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            setObjects(objects.map(obj => obj.id === id ? response.data : obj));
            setEditingObject(null);
        } catch (error) {
            console.error(error);
        }
    };

    const deleteObject = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот объект?')) return;
        try {
            await axios.delete(`${baseUrl}/api/v1/objects/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            setObjects(objects.filter(obj => obj.id !== id));
            setDefects(defects.filter(defect => defect.object_id !== id));
        } catch (error) {
            console.error(error);
        }
    };



    const filteredDefects = defects.filter(defect => {
        const matchesSearch = defect.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || defect.status === statusFilter;
        const matchesPriority = !priorityFilter || defect.priority === priorityFilter;
        const matchesAssignedToMe = !assignedToMeFilter || (currentUserId && defect.assigned_user_ids.includes(currentUserId));
        return matchesSearch && matchesStatus && matchesPriority && matchesAssignedToMe;
    }).sort((a, b) => {
        if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "priority") {
            const priorities = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            return priorities[b.priority as keyof typeof priorities] - priorities[a.priority as keyof typeof priorities];
        }
        return a.title.localeCompare(b.title);
    });

    const getDefectsByObject = (objectId: number) => {
        return filteredDefects.filter(defect => defect.object_id === objectId);
    };

    if (!project) {
        return <div>Загрузка...</div>;
    }

    return (
        <div className="min-h-screen pt-24 px-4 text-[#402f00]">
            <motion.div
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0 , opacity: 1}}
                transition={{ease: "easeOut", duration: 1}}
            >
                <div className="flex flex-row px-4 justify-between">
                <button 
                    onClick={() => navigate('/projects')}
                    className="px-4 py-2 rounded-lg transition-all duration-200 hover:bg-[#efefef] bg-[#fafafa]"
                >
                    ← Назад к проектам
                </button>
                {currentUserRole === 'MANAGER' && (
                    <button 
                        onClick={() => setShowUsersModal(true)}
                        className="px-4 py-2 rounded-lg transition-all duration-200 hover:bg-[#efefef] bg-[#fafafa]"
                    >
                        Управление пользователями
                    </button>
                )}
                </div>

                {/* Поиск и фильтры */}
                <div className="rounded-lg p-4 flex flex-row gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                        <input
                            type="text"
                            placeholder="Поиск дефектов..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-1 w-full border-1 border-gray-400/40 rounded-lg"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="p-1 w-full border-1 border-gray-400/40 rounded-lg appearance-none"
                        >
                            <option value="">Все статусы</option>
                            <option value="NEW">Новый</option>
                            <option value="OPEN">Открыт</option>
                            <option value="IN_PROGRESS">В работе</option>
                            <option value="UNDER_REVIEW">На проверке</option>
                            <option value="CLOSED">Закрыт</option>
                        </select>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="p-1 w-full border-1 border-gray-400/40 rounded-lg appearance-none"
                        >
                            <option value="">Все приоритеты</option>
                            <option value="LOW">Низкий</option>
                            <option value="MEDIUM">Средний</option>
                            <option value="HIGH">Высокий</option>
                            <option value="CRITICAL">Критический</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="p-1 w-full border-1 border-gray-400/40 rounded-lg appearance-none"
                        >
                            <option value="created_at">По дате</option>
                            <option value="priority">По приоритету</option>
                            <option value="title">По названию</option>
                        </select>
                    </div>
                    { userRole === "ENGINEER" && (
                    <label className="flex items-center gap-2 p-1 w-fit text-nowrap">
                        <input
                            type="checkbox"
                            checked={assignedToMeFilter}
                            onChange={(e) => setAssignedToMeFilter(e.target.checked)}
                        />
                        Назначены мне
                    </label>
                    )}
                </div>

                {/* Кнопка создания объекта */}
                <button
                    onClick={() => setShowCreateObject(true)}
                    className="px-4 py-2 bg-yellow-500 rounded-lg hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                >
                    Добавить объект
                </button>

                {/* Объекты и дефекты */}
                {objects.map(object => (
                    <div key={object.id} className="w-full flex flex-row justify-center">
                    <div className="bg-white/50 rounded-lg p-4 md:w-[80vw] w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{object.name}</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingObject(object)}
                                    className="px-3 py-1 bg-yellow-500 rounded-lg hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    Редактировать
                                </button>
                                <button
                                    onClick={() => deleteObject(object.id)}
                                    className="px-3 py-1 bg-yellow-500  rounded-lg hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    Удалить
                                </button>
                                <button
                                    onClick={() => setShowCreateDefect(object.id)}
                                    className="px-3 py-1 bg-yellow-500 rounded-lg hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    Добавить дефект
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {getDefectsByObject(object.id).map(defect => (
                                <div
                                    key={defect.id}
                                    onClick={() => navigate(`/projects/${id}/defects/${defect.id}`)}
                                    className="p-4 transition-all duration-200 bg-[#fafafa] hover:bg-[#efefef] rounded-lg cursor-pointer"
                                >
                                    <div className="flex flex-col justify-between h-full">
                                    <div>
                                    <h3 className="font-semibold mb-2">{defect.title}</h3>
                                    <p className="text-sm text-gray-600 mb-2">{defect.description}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`px-2 py-1 rounded text-xs text-[#402f00] ${
                                            defect.priority === 'CRITICAL' ? 'bg-red-500 text-shadow-[0_0_12px_white] font-bold' :
                                            defect.priority === 'HIGH' ? 'bg-orange-500 text-shadow-[0_0_12px_white] font-bold' :
                                            defect.priority === 'MEDIUM' ? 'bg-yellow-500 text-shadow-[0_0_12px_white] font-bold' :
                                            'bg-green-500 text-shadow-[0_0_12px_white] font-bold'
                                        }`}>
                                            {getPriorityText(defect.priority)}
                                        </span>
                                        {defect.has_photo && <span className="text-xs">📷</span>}
                                    </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                ))}

                {/* Модальные окна */}
                {showCreateObject && <CreateObjectModal onClose={() => setShowCreateObject(false)} onCreate={createObject} />}
                {showCreateDefect && <CreateDefectModal objectId={showCreateDefect} users={users} onClose={() => setShowCreateDefect(null)} onCreate={createDefect} />}
                {editingObject && <EditObjectModal object={editingObject} onClose={() => setEditingObject(null)} onUpdate={updateObject} />}
                {showUsersModal && <ProjectUsersModal projectId={parseInt(id!)} isOpen={showUsersModal} onClose={() => setShowUsersModal(false)} />}
            </motion.div>
        </div>
    );
}

function CreateObjectModal({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string, description: string, address: string) => void }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [address, setAddress] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, description, address);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Создать объект</h2>
                    <button onClick={onClose} className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center">
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Название объекта"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="p-1 w-full border-1 border-gray-400/40 rounded-lg mb-4"
                        required
                    />
                    <textarea
                        placeholder="Описание"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="p-1 w-full border-1 border-gray-400/40 rounded-lg mb-2.5"
                    />
                    <input
                        type="text"
                        placeholder="Адрес"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="p-1 w-full border-1 border-gray-400/40 rounded-lg mb-4"
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="cursor-pointer px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]">Создать</button>
                        <button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateDefectModal({ objectId, users, onClose, onCreate }: { 
    objectId: number, 
    users: User[], 
    onClose: () => void, 
    onCreate: (formData: FormData) => void 
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [assignedUsers, setAssignedUsers] = useState<number[]>([]);
    const [photo, setPhoto] = useState<File | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);

    const baseUrl = `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000`;

    const addImages = (files: FileList) => {
        setAdditionalImages([...additionalImages, ...Array.from(files)]);
    };

    const removeImage = (index: number, isMainPhoto: boolean = false) => {
        if (isMainPhoto) {
            setPhoto(null);
        } else {
            setAdditionalImages(additionalImages.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('object_id', objectId.toString());
        formData.append('description', description);
        formData.append('priority', priority);
        formData.append('assigned_user_ids', JSON.stringify(assignedUsers));
        if (photo) formData.append('photo', photo);
        
        try {
            const response = await axios.post(`${baseUrl}/api/v1/defects/`, formData, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            
            // Upload additional images
            for (const file of additionalImages) {
                const imageFormData = new FormData();
                imageFormData.append('image', file);
                await axios.post(`${baseUrl}/api/v1/defects/${response.data.id}/images`, imageFormData, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
            }
            
            onCreate(formData);
        } catch (error) {
            console.error('Error creating defect:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Создать дефект</h2>
                    <button onClick={onClose} className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center">
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Название дефекта"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                        required
                    />
                    <textarea
                        placeholder="Описание"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                    />
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                    >
                        <option value="LOW">Низкий</option>
                        <option value="MEDIUM">Средний</option>
                        <option value="HIGH">Высокий</option>
                        <option value="CRITICAL">Критический</option>
                    </select>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Изображения:</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {photo && (
                                <div className="relative w-16 h-16">
                                    <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover rounded border" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(0, true)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                            {additionalImages.map((file, index) => (
                                <div key={index} className="relative w-16 h-16">
                                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover rounded border" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400">
                                <span className="text-2xl text-gray-400">+</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            if (!photo && e.target.files[0]) {
                                                setPhoto(e.target.files[0]);
                                                if (e.target.files.length > 1) {
                                                    addImages(e.target.files);
                                                }
                                            } else {
                                                addImages(e.target.files);
                                            }
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Назначить пользователей:</label>
                        {users.map(user => (
                            <label key={user.id} className="flex items-center mb-1">
                                <input
                                    type="checkbox"
                                    checked={assignedUsers.includes(user.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setAssignedUsers([...assignedUsers, user.id]);
                                        } else {
                                            setAssignedUsers(assignedUsers.filter(id => id !== user.id));
                                        }
                                    }}
                                    className="mr-2"
                                />
                                {user.nickname}
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="cursor-pointer px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]">Создать</button>
                        <button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProjectDetail;

function EditObjectModal({ object, onClose, onUpdate }: { 
    object: ObjectType, 
    onClose: () => void, 
    onUpdate: (id: number, name: string, description: string, address: string) => void 
}) {
    const [name, setName] = useState(object.name);
    const [description, setDescription] = useState(object.description || "");
    const [address, setAddress] = useState(object.address || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(object.id, name, description, address);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Редактировать объект</h2>
                    <button onClick={onClose} className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center">
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Название объекта"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                        required
                    />
                    <textarea
                        placeholder="Описание"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-3"
                    />
                    <input
                        type="text"
                        placeholder="Адрес"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-4"
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="cursor-pointer px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]">Сохранить</button>
                        <button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
