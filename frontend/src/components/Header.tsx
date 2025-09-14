import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

function Header() {
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `p-2 text-center ${
            isActive
                ? "text-blue-600 border-b-2 border-blue-600"  // класс для активной
                : "text-gray-700 hover:text-blue-500"         // для неактивной
        }`;

    return (
        <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`w-screen fixed top-0 left-0 z-50 backdrop-blur-md justify-center flex shadow-xs`}
        >
            <div className="flex flex-row gap-5">
                <NavLink to="/" className={linkClass}>
                    Главная
                </NavLink>
            </div>
        </motion.nav>
    )
}

export default Header;