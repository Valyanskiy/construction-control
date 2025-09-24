import {useEffect, useState} from "react";
import axios from "axios";
import { motion } from "framer-motion";

interface Project {
    id: number;
    title: string;
}

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    `${new URL(document.URL).protocol}//${new URL(document.URL).hostname}:8000/projects`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    }
                )

                if (response.status === 200) {
                    setProjects(response.data.projects);
                }
            } catch (error) {
                console.log(error)
            }
        }

        fetchData()
        }, [])

    return (
        <div className="h-screen flex justify-center flex-col">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0 , opacity: 1}}
                transition={{ease: "easeOut", duration: 1}}
                className="w-screen justify-center flex"
            >
                {projects.map((project: Project) => (
                    <div
                        key={project.id}
                        className="rounded-lg w-[60vw] transition-all duration-200 hover:backdrop-brightness-[92.5%] justify-between">
                        <h1>{project.title}</h1>
                    </div>
                ))}
            </motion.div>
        </div>
    )
}

export default Projects;