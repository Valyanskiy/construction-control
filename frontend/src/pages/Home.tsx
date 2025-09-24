import '../styles/App.css'
import Logo from '../assets/Logo.png'
import {useNavigate, useOutletContext} from "react-router-dom";
import {useCallback, useEffect} from "react";

interface OutletContext {
    isAuth: string;
}

function Home() {
    const navigate = useNavigate();
    const { isAuth } = useOutletContext<OutletContext>();

    const handleClick = useCallback(() => {
        navigate("/auth");
    }, [navigate]);

    useEffect(() => {
        if (isAuth.length > 0) {
            navigate("/projects");
        }
    }, [isAuth, navigate]);

    return (
        <div className="flex flex-col justify-center min-h-screen text-[#402f00]">
            <div className="flex flex-row justify-center">
                <img src={Logo} alt="logo" className="w-80" />
            </div>
            <h1 className="font-bold text-6xl font-[MouseMemoirs]">Constructor control</h1>
            <p className="text-lg">Система контроля строительства</p>
            <button onClick={handleClick} className="mt-2 mx-auto px-8 py-3 bg-yellow-500 rounded-lg font-semiboldshadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out">
                Начать
            </button>
        </div>
    )
}

export default Home;