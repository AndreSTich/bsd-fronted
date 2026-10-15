import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';

interface ExplanatoryItem {
  id: number;
  employeeId: number;
  employeeFullName: string;
  subdivisionTitle: string;
  disturberLastName: string;
  disturberFirstName: string;
  disturberMiddleName?: string;
  disturberRoomNumber?: string;
  disturberType: string;
  dates: string;
  approverId: number;
  approverFullName: string;
  isApproved: boolean;
}

const COMMON_VIOLATIONS = [
  'нарушение тишины после 22:00',
  'курение в неположенном месте',
  'проживание постороннего лица',
  'антисанитария в комнате',
  'порча имущества общежития',
  'нарушение общественного порядка на мероприятии',
];

export default function Explanatories() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || '';
  const canApprove = role === 'командир' || role === 'штаб';

  const [notes, setNotes] = useState<ExplanatoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterApproved, setFilterApproved] = useState<'all' | 'pending' | 'approved'>('all');

  // Модальное окно подачи
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [disturberLastName, setDisturberLastName] = useState('');
  const [disturberFirstName, setDisturberFirstName] = useState('');
  const [disturberMiddleName, setDisturberMiddleName] = useState('');
  const [disturberRoomNumber, setDisturberRoomNumber] = useState('');
  const [disturberType, setDisturberType] = useState(COMMON_VIOLATIONS[0]);
  const [customType, setCustomType] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ExplanatoryItem[]>('/Explanatory');
      setNotes(res.data);
    } catch (err) {
      console.error(err);
      alert('Ошибка при загрузке объяснительных.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalType = disturberType === 'другое' ? customType.trim() : disturberType;
    if (!finalType) {
      setFormError('Укажите вид нарушения.');
      return;
    }

    try {
      await apiClient.post('/Explanatory', {
        disturberLastName,
        disturberFirstName,
        disturberMiddleName: disturberMiddleName || null,
        disturberRoomNumber: disturberRoomNumber || null,
        disturberType: finalType,
        dates: date,
      });

      alert('Объяснительная успешно подана!');
      setIsModalOpen(false);
      setDisturberLastName('');
      setDisturberFirstName('');
      setDisturberMiddleName('');
      setDisturberRoomNumber('');
      setCustomType('');
      loadNotes();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Ошибка отправки формы.');
    }
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm('Утвердить объяснительную и начислить автору +5 баллов?')) return;

    try {
      const res = await apiClient.post(`/Explanatory/${id}/approve`);
      alert(res.data.message);
      loadNotes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при утверждении.');
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (filterApproved === 'pending') return !n.isApproved;
    if (filterApproved === 'approved') return n.isApproved;
    return true;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Журнал объяснительных и рапортов</h2>
          <span style={{ fontSize: '13px', color: '#666' }}>Роль в системе: {role}</span>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a href="/calendar" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            ← Календарь
          </a>
          <a href="/rating" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            Рейтинг
          </a>
        </div>
      </div>

      {/* Панель действий */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Фильтр статуса:</label>
          <select
            value={filterApproved}
            onChange={(e: any) => setFilterApproved(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">Все записи</option>
            <option value="pending">⏳ На рассмотрении</option>
            <option value="approved">✅ Утвержденные</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '9px 18px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + Подать объяснительную / рапорт
        </button>
      </div>

      {/* Таблица */}
      {isLoading ? (
        <p>Загрузка записей...</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef', borderBottom: '2px solid #ddd' }}>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Автор рапорта</th>
                <th style={thStyle}>Подразделение</th>
                <th style={thStyle}>Нарушитель</th>
                <th style={thStyle}>Комната</th>
                <th style={thStyle}>Вид нарушения</th>
                <th style={thStyle}>Статус / Проверяющий</th>
                {canApprove && <th style={thStyle}>Действие</th>}
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{item.dates}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{item.employeeFullName}</td>
                  <td style={{ padding: '10px 12px', color: '#666' }}>{item.subdivisionTitle}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.disturberLastName} {item.disturberFirstName} {item.disturberMiddleName || ''}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{item.disturberRoomNumber || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#b02a37' }}>{item.disturberType}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {item.isApproved ? (
                      <span style={{ color: '#198754', fontWeight: 'bold' }}>
                        ✅ {item.approverFullName}
                      </span>
                    ) : (
                      <span style={{ color: '#ffc107', backgroundColor: '#fff3cd', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        ⏳ На рассмотрении
                      </span>
                    )}
                  </td>
                  {canApprove && (
                    <td style={{ padding: '10px 12px' }}>
                      {!item.isApproved && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px',
                          }}
                        >
                          Утвердить (+5 б.)
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredNotes.length === 0 && (
                <tr>
                  <td colSpan={canApprove ? 8 : 7} style={{ padding: '25px', textAlign: 'center', color: '#888' }}>
                    Записи не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно подачи объяснительной */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Подача рапорта / объяснительной</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Фамилия нарушителя *"
                  value={disturberLastName}
                  onChange={(e) => setDisturberLastName(e.target.value)}
                  required
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Имя нарушителя *"
                  value={disturberFirstName}
                  onChange={(e) => setDisturberFirstName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Отчество нарушителя"
                  value={disturberMiddleName}
                  onChange={(e) => setDisturberMiddleName(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Комната (напр. 305)"
                  value={disturberRoomNumber}
                  onChange={(e) => setDisturberRoomNumber(e.target.value)}
                  style={{ ...inputStyle, maxWidth: '140px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>
                  Вид нарушения:
                </label>
                <select
                  value={disturberType}
                  onChange={(e) => setDisturberType(e.target.value)}
                  style={inputStyle}
                >
                  {COMMON_VIOLATIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value="другое">Другое (указать вручную)</option>
                </select>
              </div>

              {disturberType === 'другое' && (
                <input
                  type="text"
                  placeholder="Опишите суть нарушения..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  required
                  style={inputStyle}
                />
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#555' }}>
                  Дата инцидента:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {formError && <div style={{ color: 'red', fontSize: '13px' }}>{formError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Подать на рассмотрение
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px',
  whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  boxSizing: 'border-box',
  borderRadius: '4px',
  border: '1px solid #ccc',
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalBoxStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  padding: '24px',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
};