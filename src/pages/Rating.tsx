import { useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient';

// Описываем структуру ответа от бэкенда на основе вашего Swagger
interface RatingDto {
  place: number;
  fullName: string;
  subdivisionTitle: string;
  rating: number;
}

export default function Rating() {
  const [leaders, setLeaders] = useState<RatingDto[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRating = async () => {
      try {
        // Делаем GET запрос к нашему защищенному методу
        const response = await apiClient.get('/Rating/top');
        setLeaders(response.data);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить рейтинг. Проверьте подключение.');
      }
    };

    fetchRating();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Топ сотрудников</h2>
        <a href="/calendar" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
          ← Вернуться в календарь
        </a>
      </div>

      {error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px' }}>Место</th>
              <th style={{ padding: '12px' }}>ФИО</th>
              <th style={{ padding: '12px' }}>Подразделение</th>
              <th style={{ padding: '12px' }}>Баллы</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((leader) => (
              <tr key={leader.place} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: leader.place <= 3 ? '#ff9800' : '#333' }}>
                  #{leader.place}
                </td>
                <td style={{ padding: '12px' }}>{leader.fullName}</td>
                <td style={{ padding: '12px', color: '#666' }}>{leader.subdivisionTitle}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{leader.rating}</td>
              </tr>
            ))}
            {leaders.length === 0 && !error && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  Загрузка данных...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}