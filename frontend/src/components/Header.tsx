import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

function Header() {
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
            transition={{ duration: 0.2 }}
            className={`w-screen fixed top-0 left-0 z-50 backdrop-blur-md justify-center flex border-b-1 border-gray-400/40 backdrop-brightness-[97.5%] yellow-500`}
        >
            <div className="flex flex-row gap-5">
                <NavLink to="/" className={linkClass}>
                    Главная
                </NavLink>
                <NavLink to="/w" className={linkClass}>
                    Главная
                </NavLink>
            </div>
        </motion.nav>
    )
}

export default Header;