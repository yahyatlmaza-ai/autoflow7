import { Navigate } from 'react-router-dom';

// Admin page is intentionally minimal in the FastAPI rewrite.  Admin analytics
// live inside the Dashboard ("Overview" tab).  Anyone hitting /admin is sent
// there.
export default function Admin() {
  return <Navigate to="/dashboard" replace />;
}
