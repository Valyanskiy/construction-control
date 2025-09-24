import { Navigate, useOutletContext } from "react-router-dom";

interface OutletContext {
    isAuth: string;
}

interface ProtectedRouteProps {
    children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuth } = useOutletContext<OutletContext>();
    
    return isAuth.length > 0 ? children : <Navigate to="/" />;
}

export default ProtectedRoute;
