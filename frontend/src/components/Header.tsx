import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Logo from "../assets/Logo.png";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface HeaderProps {
    isAuth: string;
    header: string;
    userRole?: string;
}

function Header({isAuth, header, userRole} : HeaderProps) {
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [registerForm, setRegisterForm] = useState({
        nickname: "",
        password: "",
        role: "OBSERVER"
    });
    const navigate = useNavigate();
    const baseUrl = `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000`;
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowLogoutPopup(false);
            }
        };

        if (showLogoutPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLogoutPopup]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigate('/auth');
    };

    const loadUsers = async () => {
        try {
            const response = await axios.get(`${baseUrl}/api/v1/users/`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const deleteUser = async (userId: number) => {
        if (!confirm('Удалить пользователя?')) return;
        
        try {
            await axios.delete(`${baseUrl}/api/v1/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            loadUsers();
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Ошибка удаления');
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${baseUrl}/api/v1/users/register`, registerForm, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            alert("Пользователь успешно зарегистрирован");
            setShowRegisterModal(false);
            setRegisterForm({ nickname: "", password: "", role: "OBSERVER" });
        } catch (error: any) {
            alert(error.response?.data?.detail || "Ошибка регистрации");
        }
    };

    const exportDefects = async () => {
        try {
            const response = await axios.get(`${baseUrl}/api/v1/defects/export`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `defects_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const loadStats = async () => {
        try {
            const response = await axios.get(`${baseUrl}/api/v1/defects/stats/weekly`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            setStatsData(response.data);
        } catch (error) {
            console.error('Stats error:', error);
        }
    };
    const Place = () => {
        const location = useLocation();

        let headerText;
        switch (true) {
            case location.pathname === '/':
                headerText = 'Главная страница';
                break;
            case location.pathname === '/projects':
                headerText = 'Проекты';
                break;
            case location.pathname.startsWith('/projects/') && location.pathname.includes("/defects/"):
                headerText = header;
                break;
            case location.pathname.startsWith('/projects/'):
                headerText = header;
                break;
            default:
                headerText = 'Страница не найдена';
        }

        return <h1>{headerText}</h1>;
    };

    // const linkClass = ({ isActive }: { isActive: boolean }) =>
    //     `p-2 text-center ${
    //         isActive
    //             ? "text-yellow-500 font-bold text-shadow-[0_0_40px_#f0b100] text-shadow-yellow-500 backdrop-blur-sm backdrop-brightness-[92.5%] backdrop-grayscale-10 rounded-lg"  // класс для активной
    //             : "text-gray-500 hover:text-black transition-colors"         // для неактивной
    //     }`;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ease: "easeOut", duration: 0.3}}
        >
        <div className="bg-gradient-to-b backdrop-blur-md mask-b-from-20% from-white to-transparent fixed left-0 top-0 w-screen h-24 z-10 pointer-events-none"></div>
        <nav className={`pt-1 w-screen fixed top-0 left-0 z-50 justify-between grid grid-cols-3 yellow-500 ${isAuth.length == 0 ? "hidden" : ""}`}>
            <div className="max-w-full flex flex-row items-center text-[#402f00] gap-1 mx-1">
                <img src={Logo} alt="logo" className="h-8" />
                <h1 className="text-2xl font-[MouseMemoirs]">Constructor control</h1>
            </div>

            <div className="flex flex-row gap-5 justify-center m-1 font-bold">
                {/*<NavLink to="/" className={linkClass}>*/}
                {/*    Главная*/}
                {/*</NavLink>*/}
                {Place()}
            </div>

            <div className="max-w-full flex flex-row justify-end text-[#402f00] relative" ref={popupRef}>
                <button 
                    onClick={() => setShowLogoutPopup(!showLogoutPopup)}
                    className="mx-1 px-3 transition-all duration-200 rounded-lg hover:backdrop-brightness-[92.5%]"
                >
                    <p>{isAuth}</p>
                </button>
                
                {showLogoutPopup && (
                    <div className="absolute top-full right-0 mt-1 bg-white border-1 border-gray-400/40 rounded-xl shadow-lg p-2 z-50 text-shadow-[0_0_12px_white] flex flex-col">
                        {userRole === 'MANAGER' && (
                            <>
                                <button
                                    onClick={() => setShowRegisterModal(true)}
                                    className="px-4 py-2 bg-[#fafafa] hover:bg-[#efefef] rounded-lg cursor-pointer transition-colors max-w-full text-left mb-1"
                                >
                                    Регистрация пользователя
                                </button>
                                <button
                                    onClick={() => {
                                        setShowUsersModal(true);
                                        loadUsers();
                                    }}
                                    className="px-4 py-2 bg-[#fafafa] hover:bg-[#efefef] rounded-lg cursor-pointer transition-colors max-w-full text-left mb-1"
                                >
                                    Все пользователи
                                </button>
                            </>
                        )}
                        {userRole !== 'ENGINEER' && (
                            <>
                        <button
                            onClick={() => {
                                setShowStatsModal(true);
                                loadStats();
                            }}
                            className="px-4 py-2 bg-[#fafafa] hover:bg-[#efefef] rounded-lg cursor-pointer transition-colors max-w-full text-left mb-1"
                        >
                            Статистика
                        </button>
                        <button
                            onClick={exportDefects}
                            className="px-4 py-2 bg-[#fafafa] hover:bg-[#efefef] rounded-lg cursor-pointer transition-colors max-w-full text-left mb-1"
                        >
                            Экспорт CSV
                        </button>
                        </>
                )}
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-[#fafafa] hover:bg-[#efefef] rounded-lg cursor-pointer transition-colors max-w-full text-left"
                        >
                            Выйти
                        </button>
                    </div>
                )}
            </div>
            
            {/* Модальное окно пользователей */}
            {showUsersModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
                    <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Все пользователи</h2>
                            <button
                                onClick={() => setShowUsersModal(false)}
                                className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {users.map(user => (
                                <div key={user.id} className="flex justify-between items-center p-2 bg-[#fafafa] rounded">
                                    <div>
                                        <span className="font-medium">{user.nickname}</span>
                                        <span className="text-sm text-gray-500 ml-2">({getRoleText(user.role)})</span>
                                    </div>
                                    <button
                                        onClick={() => deleteUser(user.id)}
                                        className="cursor-pointer px-4 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
                                    >
                                        Удалить
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно регистрации */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
                    <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Регистрация пользователя</h2>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center"
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="text"
                                    value={registerForm.nickname}
                                    onChange={(e) => setRegisterForm({...registerForm, nickname: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Пароль</label>
                                <input
                                    type="password"
                                    value={registerForm.password}
                                    onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Роль</label>
                                <select
                                    value={registerForm.role}
                                    onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="OBSERVER">Наблюдатель</option>
                                    <option value="ENGINEER">Инженер</option>
                                    <option value="MANAGER">Менеджер</option>
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="cursor-pointer px-4 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out flex-1 py-3"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="cursor-pointer px-4 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out flex-1 py-3"
                                >
                                    Зарегистрировать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Модальное окно статистики */}
            {showStatsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-[#402f00]">
                    <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Статистика за неделю</h2>
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="self-start transition-all duration-200 text-gray-500 hover:text-black rounded-lg cursor-pointer text-center"
                            >
                                ×
                            </button>
                        </div>
                        
                        {statsData.length > 0 && (
                            <Line
                                data={{
                                    labels: statsData.map(d => new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })),
                                    datasets: [
                                        {
                                            label: 'Создано',
                                            data: statsData.map(d => d.created),
                                            borderColor: 'rgb(239, 68, 68)',
                                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                        },
                                        {
                                            label: 'Решено',
                                            data: statsData.map(d => d.resolved),
                                            borderColor: 'rgb(34, 197, 94)',
                                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                        }
                                    ]
                                }}
                                options={{
                                    responsive: true,
                                    plugins: {
                                        legend: { position: 'top' },
                                        title: { display: true, text: 'Дефекты по дням' }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </nav>
        </motion.div>
    )
}

export default Header;