import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

interface HeaderProps {
    isAuth: boolean;
}

function Header({isAuth} : HeaderProps) {
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `p-2 text-center ${
            isActive
                ? "text-yellow-500 border-b-2 border-yellow-500 font-bold text-shadow-[0_0_40px_#f0b100] text-shadow-yellow-500"  // класс для активной
                : "text-gray-500 hover:text-black transition-colors"         // для неактивной
        }`;

    return (
        <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ease: "easeOut", duration: 0.3}}
            className={`w-screen fixed top-0 left-0 z-50 backdrop-blur-md justify-center flex border-b-1 border-gray-300/40 backdrop-brightness-95 yellow-500 ${isAuth ? "" : "hidden"}`}
        >
            <div className="max-w-full">

            </div>

            <div className="flex flex-row gap-5">
                <NavLink to="/" className={linkClass}>
                    Главная
                </NavLink>
            </div>

            <div className="max-w-full">

            </div>
        </motion.nav>
    )
}

export default Header;