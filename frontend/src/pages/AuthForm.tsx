import { motion } from "framer-motion";
import {Form} from "react-router-dom";

function AuthForm() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ease: "easeOut", duration: 0.3}}
            className="absolute left-0 top-0 w-full h-full z-10">
            <div className="flex flex-row justify-around">
                <div className="flex h-screen flex-col justify-around">
                    <Form
                        className="text-[#402f00] rounded-xl p-4 border-gray-400/40 border-1 shadow-[0px_8px_30px_lightgray]">
                        <h1 className="text-6xl">Авторизация</h1>
                        <hr className="border-gray-400/40 my-4"/>
                        <div className="flex w-full">
                            <div className="w-full">
                                <label className="flex flex-row gap-4"><input placeholder="Логин"
                                                                              className="p-1 w-full border-1 border-gray-400/40 rounded-lg mb-4"/></label>
                                <label className="flex flex-row gap-4"><input placeholder="Пароль"
                                                                              className="p-1 w-full border-1 border-gray-400/40 rounded-lg"/></label>
                            </div>
                            <button className="ml-4 px-8 py-3 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out">
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