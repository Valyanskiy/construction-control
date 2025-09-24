import { motion } from "framer-motion";
// import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import Logo from "../assets/Logo.png";

interface HeaderProps {
    isAuth: string;
}

function Header({isAuth} : HeaderProps) {
    const Place = () => {
        const location = useLocation();

        let headerText;
        switch (location.pathname) {
            case '/':
                headerText = 'Главная страница';
                break;
            case '/projects':
                headerText = 'Проекты';
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
        <nav className={`]px-1 pt-1 w-screen fixed top-0 left-0 z-50 justify-between grid grid-cols-3 yellow-500 ${isAuth.length == 0 ? "hidden" : ""}`}>
            <div className="max-w-full flex flex-row items-center text-[#402f00] gap-1">
                <img src={Logo} alt="logo" className="h-8" />
                <h1 className="text-2xl font-[MouseMemoirs]">Constructor control</h1>
            </div>

            <div className="flex flex-row gap-5 justify-center">
                {/*<NavLink to="/" className={linkClass}>*/}
                {/*    Главная*/}
                {/*</NavLink>*/}
                {Place()}
            </div>

            <div className="max-w-full flex flex-row justify-end text-[#402f00]">
                <button className="m-1 px-3 transition-all duration-200 rounded-lg hover:backdrop-brightness-[92.5%]">
                <p>{isAuth}</p>
                </button>
            </div>
        </nav>
        </motion.div>
    )
}

export default Header;