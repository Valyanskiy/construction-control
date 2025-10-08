import { createRoot } from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {StrictMode} from "react";
import App from './App.tsx'
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import DefectDetail from './pages/DefectDetail';
import AuthForm from "./pages/AuthForm.tsx";
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                path: "",
                element: <Home />
            },
            {
                path: "projects",
                element: <ProtectedRoute><Projects /></ProtectedRoute>
            },
            {
                path: "projects/:id",
                element: <ProtectedRoute><ProjectDetail /></ProtectedRoute>
            },
            {
                path: "projects/:projectId/defects/:defectId",
                element: <ProtectedRoute><DefectDetail /></ProtectedRoute>
            }
        ]
    },
    {
        path: '/auth',
        element: <AuthForm />
    }
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
)

