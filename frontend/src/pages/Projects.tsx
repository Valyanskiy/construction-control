import {useEffect, useState} from "react";
import {useNavigate, useOutletContext} from "react-router-dom";
import api from "../utils/api";
import { motion } from "framer-motion";
import Dots from "../assets/Dots.svg"

interface Project {
    id: number;
    title: string;
}

function Projects() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [nowAdding, setNowAdding] = useState<boolean>(false);
    const [newTitle, setNewTitle] = useState<string>();
    const { userRole = 'OBSERVER' } = useOutletContext<{ userRole?: string }>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/projects');
                if (response.status === 200) {
                    setProjects(response.data.projects);
                }
            } catch (error) {
                console.log(error)
            }
        }

        fetchData()
        }, [])

    const handleProjectClick = (projectId: number) => {
        navigate(`/projects/${projectId}`);
    };

    const handleAddProject = () => {
        setNowAdding(true);
    }

    const handlePostNewProject = async () => {
        if (!newTitle?.trim()) return;
        
        try {
            const response = await api.post('/projects/create', { title: newTitle });

            if (response.status === 200) {
                setProjects(prev => [...prev, { id: response.data.project_id, title: newTitle }]);
                setNewTitle('');
                setNowAdding(false);
            }
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <div className="min-h-screen flex justify-center flex-col py-24">
            <motion.div
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0 , opacity: 1}}
                transition={{ease: "easeOut", duration: 1}}
                className="w-screen justify-center flex"
            >
                <div className="flex flex-col gap-2">
                {projects.length != 0 ? (
                    projects.map((project: Project) => (
                    <button
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className="rounded-lg w-[40vw] transition-all duration-200 hover:bg-[#efefef] flex justify-between p-3 text-[#402f00] font-bold bg-[#fafafa]">
                        <h1>{project.title}</h1>
                        <button onClick={(e) => e.stopPropagation()}>
                            <img src={Dots} className="h-6"/>
                        </button>
                    </button>
                    )
                )) : (
                    <h1 className="rounded-lg w-[40vw] flex justify-center p-3 text-[#402f00] font-bold bg-[#fafafa]">Вы не добавлены ни в один проект</h1>
                )
                }

                    {userRole === "MANAGER" && (
                    nowAdding ?
                        (
                            <div className="rounded-lg w-[40vw] flex justify-between p-3 text-[#402f00] font-bold bg-[#fafafa] gap-2.5">
                                <input type="text" className="px-1 w-full border-1 border-gray-400/40 rounded-lg" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                                <button onClick={handlePostNewProject} className="w-7 h-7 transition-all duration-200 hover:bg-[#efefef] rounded-lg">
                                    <h1 className="pb-0.5">+</h1>
                                </button>
                            </div>
                        )
                        : (
                            <button 
                                onClick={handleAddProject}
                                className="rounded-lg w-[40vw] transition-all duration-200 hover:bg-[#efefef] flex justify-center p-3 text-[#402f00] font-bold bg-[#fafafa]"
                            >
                                +
                            </button>
                        )
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default Projects;