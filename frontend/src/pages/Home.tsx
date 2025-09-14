import '../styles/App.css'
import Logo from '../assets/Logo.png'

function Home() {
    return (
        <div className="flex flex-col justify-center min-h-screen">
            <div className="flex flex-row justify-center">
                <img src={Logo} alt="logo" className="w-80" />
            </div>
            <h1 className="font-bold text-6xl font-[MouseMemoirs]">Constructor control</h1>
            <p className="text-lg">Система контроля строительства</p>
        </div>
    )
}

export default Home;