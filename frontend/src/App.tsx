import './styles/App.css'
import {Outlet} from "react-router-dom";
import {motion} from "framer-motion";
import Header from './components/Header';
import {useEffect, useState} from "react";
import api from "./utils/api";
import { useTokenRefresh } from './hooks/useTokenRefresh';

function App() {
    const [isAuth, setIsAuth] = useState("")
    const [header, setHeader] = useState("");
    const [userRole, setUserRole] = useState("");
    
    useTokenRefresh();

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const [userRes, usersRes] = await Promise.all([
                        api.get('/userinfo'),
                        api.get('/api/v1/users/')
                    ]);
                    setIsAuth(userRes.data.nickname);
                    
                    const currentUser = usersRes.data.find((u: any) => u.nickname === userRes.data.nickname);
                    if (currentUser) {
                        setUserRole(currentUser.role);
                    }
                } catch (error) {
                    console.log(error);
                    setIsAuth("");
                    setUserRole("");
                }
            }
        };

        fetchData();
    }, []);

    return (
        <div className="max-w-screen">
            <Header isAuth = {isAuth} header= { header } userRole={userRole} />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ease: "easeOut", duration: 0.3}}
                className={"min-h-screen"}>
                <Outlet context={{isAuth, header, setHeader: setHeader, userRole}}/>
            </motion.div>
        </div>
    )
}

export default App
