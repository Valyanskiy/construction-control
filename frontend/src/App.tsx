import './styles/App.css'
import {Outlet} from "react-router-dom";
import {motion} from "framer-motion";
import Header from './components/Header';
import {useEffect, useState} from "react";
import axios from "axios";

function App() {
    const [isAuth, setIsAuth] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000/userinfo`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    }
                )

                if (response.status === 200) {
                    setIsAuth(true)
                }
            } catch (error) {
                console.log(error)
            }
        };

        fetchData()
    }, [])

    return (
        <div className="max-w-screen">
            <Header isAuth = {isAuth}/>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ease: "easeOut", duration: 0.3}}
                className={"min-h-screen"}>
                <Outlet/>
            </motion.div>
        </div>
    )
}

export default App
