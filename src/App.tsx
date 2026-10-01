import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/calendar" element={<h2>Календарь (в разработке)</h2>} />
        <Route path="/rating" element={<h2>Рейтинг (в разработке)</h2>} />
        {/* Перенаправляем с корня на логин */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;