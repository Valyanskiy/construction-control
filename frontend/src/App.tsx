import './styles/App.css'
import {Outlet} from "react-router-dom";
import {motion} from "framer-motion";
import Header from './components/Header';

function App() {
    return (
        <div className="max-w-screen">
            <Header/>
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
