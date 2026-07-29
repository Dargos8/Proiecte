// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importuri pentru Cetățean
import Home from './citizen/pages/Home';
import Explore from './citizen/pages/Explore'; 
import Report from './citizen/pages/Report';
import TicketView from './citizen/pages/TicketView';
import About from "./citizen/pages/About";
import Privacy from "./citizen/pages/Privacy";
import Terms from "./citizen/pages/Terms";
import Accessibility from "./citizen/pages/Accessibility";

// Importuri pentru Autentificare și Securitate
import Login from './shared/pages/Login';
import ProtectedRoute from './shared/components/ProtectedRoute';

// Import pentru Dispatcher
import DispatcherDashboard from './dispatcher/pages/DispatcherDashboard';
import DeptDashboard from './departamente/pages/DeptDashboard';
// Import pentru Admin
import AdminDashboard from './admin/pages/AdminDashboard';
// Nu mai ai nevoie de AdminLogin separat, Login.jsx se ocupă de rutarea corectă bazată pe roluri!
// import AdminLogin from './admin/pages/AdminLogin'; 



import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rute Cetățean (Publice) */}
        <Route path="/" element={<Home />} />
        <Route path="/sesizari" element={<Explore />} />
        <Route path="/raporteaza" element={<Report />} />
        <Route path="/ticket/:id" element={<TicketView />} />
<Route path="/despre" element={<About />} />
<Route path="/confidentialitate" element={<Privacy />} />
<Route path="/termeni" element={<Terms />} />
<Route path="/accesibilitate" element={<Accessibility />} />
        
        {/* Ruta universală de Login (Publică) */}
        <Route path="/login" element={<Login />} />

        {/* --- RUTE SECURIZATE (Private) --- */}
        
        {/* Rută Dispatcher: O accesează DOAR cine are role="dept_secretary" și department="dispatcher" */}
        <Route 
          path="/dispatcher/dashboard" 
          element={
            <ProtectedRoute allowedRole="dept_secretary" allowedDepartment="dispatcher">
              <DispatcherDashboard />
            </ProtectedRoute>
          } 
        />

        <Route
  path="/departament/dashboard"
  element={
    <ProtectedRoute allowedRole="dept_secretary">
      <DeptDashboard />
    </ProtectedRoute>
  }
/>

        {/* Rută Admin: O accesează DOAR cine are role="admin" */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
      </Routes>
    </Router>
  );
}

export default App;