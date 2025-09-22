import { motion } from "framer-motion";
import {Form, useNavigate} from "react-router-dom";
import axios from "axios";
import {useState} from "react";

function AuthForm() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nickname: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Отправка данных:', formData);

        try {
            const responce = await axios.post(
                `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000/auth`,
            {
                nickname: formData.nickname,
                password: formData.password
            },
            {
                    headers: {
                'Content-Type': 'application/json',
                    'Accept': 'application/json'
            }
            }
            );

            if (responce.status === 200) {
                // Сохраняем токен в localStorage
                localStorage.setItem('access_token', responce.data.access_token);
                navigate("/"); // Перенаправление после успешной регистрации
            }
        } catch (err) {
            console.error('Ошибка:', err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ease: "easeOut", duration: 0.3}}
            className="absolute left-0 top-0 w-full h-full z-10">
            <div className="flex flex-row justify-around">
                <div className="flex h-screen flex-col justify-around">
                    <Form
                        onSubmit={handleSubmit}
                        className="text-[#402f00] rounded-xl p-4 border-gray-400/40 border-1 shadow-[0px_8px_30px_lightgray]">
                        <h1 className="text-6xl">Авторизация</h1>
                        <hr className="border-gray-400/40 my-4"/>
                        <div className="flex w-full">
                            <div className="w-full">
                                <label className="flex flex-row gap-4"><input 
                                    placeholder="Логин"
                                    type="text"
                                    className="p-1 w-full border-1 border-gray-400/40 rounded-lg mb-4" 
                                    value={formData.nickname}
                                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                                /></label>
                                <label className="flex flex-row gap-4"><input 
                                    placeholder="Пароль"
                                    type="password"
                                    className="p-1 w-full border-1 border-gray-400/40 rounded-lg" 
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                /></label>
                            </div>
                            <button 
                                type="submit"
                                className="ml-4 px-8 py-3 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out">
                                Войти
                            </button>
                        </div>
                    </Form>
                </div>
            </div>
        </motion.div>
    )
}

export default AuthForm;