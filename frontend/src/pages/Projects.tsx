import {useEffect, useState} from "react";
import {useNavigate, useOutletContext} from "react-router-dom";
import api from "../utils/api";
import { motion } from "framer-motion";

interface Project {
    id: number;
    title: string;
}

function Projects() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [nowAdding, setNowAdding] = useState<boolean>(false);
    const [newTitle, setNewTitle] = useState<string>();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState<string>("");
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

    const handleEditProject = (project: Project) => {
        setEditingId(project.id);
        setEditTitle(project.title);
    }

    const handleUpdateProject = async (projectId: number) => {
        if (!editTitle.trim()) return;
        
        try {
            const response = await api.put(`/projects/${projectId}`, { title: editTitle });
            
            if (response.status === 200) {
                setProjects(prev => prev.map(p => 
                    p.id === projectId ? { ...p, title: editTitle } : p
                ));
                setEditingId(null);
                setEditTitle("");
            }
        } catch (error) {
            console.log(error)
        }
    }

    const handleDeleteProject = async (projectId: number) => {
        if (!confirm("Вы уверены, что хотите удалить этот проект?")) return;
        
        try {
            const response = await api.delete(`/projects/${projectId}`);
            
            if (response.status === 200) {
                setProjects(prev => prev.filter(p => p.id !== projectId));
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
                    <div
                        key={project.id}
                        className="rounded-lg w-[40vw] transition-all duration-200 hover:bg-[#efefef] flex justify-between p-3 text-[#402f00] font-bold bg-[#fafafa]">
                        {editingId === project.id && userRole === "MANAGER" ? (
                            <div className="flex gap-2 w-full">
                                <input 
                                    type="text" 
                                    className="px-1 flex-1 border-1 border-gray-400/40 rounded-lg" 
                                    value={editTitle} 
                                    onChange={(e) => setEditTitle(e.target.value)} 
                                />
                                <button 
                                    onClick={() => handleUpdateProject(project.id)}
                                    className="cursor-pointer px-2  bg-yellow-500 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    ✓
                                </button>
                                <button 
                                    onClick={() => setEditingId(null)}
                                    className="cursor-pointer px-2  bg-yellow-500 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleProjectClick(project.id)}
                                    className="flex-1 text-left"
                                >
                                    <h1>{project.title}</h1>
                                </button>
                                {userRole === "MANAGER" && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditProject(project);
                                            }}
                                            className="cursor-pointer px-2  bg-yellow-500 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                        >
                                            Изменить
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProject(project.id);
                                            }}
                                            className="cursor-pointer px-2  bg-yellow-500 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 ease-in-out text-shadow-[0_0_12px_white]"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
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