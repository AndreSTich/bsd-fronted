import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Calendar from './pages/Calendar';
import Rating from './pages/Rating'; 
import Employees from './pages/Employees'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/rating" element={<Rating />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;