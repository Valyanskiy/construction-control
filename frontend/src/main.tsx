import { createRoot } from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {StrictMode} from "react";
import App from './App.tsx'
import Home from './pages/Home';
import AuthForm from "./pages/AuthForm.tsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                path: "",
                element: <Home />
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

