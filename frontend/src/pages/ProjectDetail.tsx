import { useEffect, useState } from "react";
import {useParams, useNavigate, useOutletContext} from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import ProjectUsersModal from "../components/ProjectUsersModal";
import CreateObjectModal from "../components/CreateObjectModal";
import CreateDefectModal from "../components/CreateDefectModal";
import EditObjectModal from "../components/EditObjectModal";

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

export default ProjectDetail;
