import { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: number;
    nickname: string;
    role: string;
}

interface ProjectUsersModalProps {
    projectId: number;
    isOpen: boolean;
    onClose: () => void;
}

function ProjectUsersModal({ projectId, isOpen, onClose }: ProjectUsersModalProps) {
    const [projectUsers, setProjectUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const baseUrl = `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000`;

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, projectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projectUsersRes, allUsersRes] = await Promise.all([
                axios.get(`${baseUrl}/api/v1/projects/${projectId}/users`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                }),
                axios.get(`${baseUrl}/api/v1/users/`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                })
            ]);
            
            setProjectUsers(projectUsersRes.data);
            // Фильтруем только менеджеров и инженеров
            setAllUsers(allUsersRes.data.filter((u: User) => u.role !== 'OBSERVER'));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const addUserToProject = async (userId: number) => {
        try {
            await axios.post(`${baseUrl}/api/v1/projects/${projectId}/users/${userId}`, {}, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const removeUserFromProject = async (userId: number) => {
        try {
            await axios.delete(`${baseUrl}/api/v1/projects/${projectId}/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const getRoleText = (role: string) => {
        const roleMap: { [key: string]: string } = {
            'MANAGER': 'Менеджер',
            'ENGINEER': 'Инженер',
            'OBSERVER': 'Наблюдатель'
        };
        return roleMap[role] || role;
    };

    if (!isOpen) return null;

    const availableUsers = allUsers.filter(user => 
        !projectUsers.some(pu => pu.id === user.id)
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
            <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Управление пользователями проекта</h2>
                    <button onClick={onClose} className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center">
                        ×
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-4">Загрузка...</div>
                ) : (
                    <>
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">Участники проекта:</h3>
                            {projectUsers.length === 0 ? (
                                <p className="text-gray-500">Нет участников</p>
                            ) : (
                                <div className="space-y-2">
                                    {projectUsers.map(user => (
                                        <div key={user.id} className="flex justify-between items-center p-2 bg-[#fafafa] rounded">
                                            <div>
                                                <span className="font-medium">{user.nickname}</span>
                                                <span className="text-sm text-gray-500 ml-2">({getRoleText(user.role)})</span>
                                            </div>
                                            <button
                                                onClick={() => removeUserFromProject(user.id)}
                                                className="cursor-pointer px-4 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Доступные пользователи:</h3>
                            {availableUsers.length === 0 ? (
                                <p className="text-gray-500">Все пользователи уже добавлены</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableUsers.map(user => (
                                        <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <div>
                                                <span className="font-medium">{user.nickname}</span>
                                                <span className="text-sm text-gray-500 ml-2">({getRoleText(user.role)})</span>
                                            </div>
                                            <button
                                                onClick={() => addUserToProject(user.id)}
                                                className="cursor-pointer px-4 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                            >
                                                Добавить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ProjectUsersModal;
