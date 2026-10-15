import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { apiClient } from '../api/apiClient';

interface EventDto {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  isRegistered: boolean;
}

interface AttendanceDto {
  employeeId: number;
  fullName: string;
  subdivisionTitle?: string;
  statuse: boolean;
}

export default function Calendar() {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar | null>(null);

  const role = localStorage.getItem('role') || '';
  const isHQ = role === 'штаб';
  const canManageAttendance = isHQ || role === 'командир';

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null);
  const [participants, setParticipants] = useState<AttendanceDto[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Состояния формы создания мероприятия
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('мероприятие');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [createError, setCreateError] = useState('');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const fetchEvents = async (year: number, month: number) => {
    try {
      const response = await apiClient.get(`/Event/month?year=${year}&month=${month}`);

      const formattedEvents = response.data.map((e: EventDto) => ({
        id: String(e.id),
        title: `${e.time.substring(0, 5)} - ${e.title}`,
        start: `${e.date}T${e.time}`,
        backgroundColor: e.isRegistered ? '#28a745' : '#3788d8',
        borderColor: e.isRegistered ? '#28a745' : '#3788d8',
        extendedProps: { ...e },
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Ошибка загрузки мероприятий', error);
    }
  };

  const reloadCurrentMonth = () => {
    if (calendarRef.current) {
      const date = calendarRef.current.getApi().getDate();
      fetchEvents(date.getFullYear(), date.getMonth() + 1);
    }
  };

  const handleEventClick = async (clickInfo: any) => {
    const event: EventDto = clickInfo.event.extendedProps;
    setSelectedEvent(event);

    if (canManageAttendance) {
      await loadParticipants(event.id);
      setIsAttendanceModalOpen(true);
    } else {
      if (event.isRegistered) {
        alert('Вы уже записаны на это мероприятие!');
        return;
      }
      if (window.confirm(`Записаться на "${clickInfo.event.title}"?\nМесто: ${event.location}`)) {
        await registerForEvent(event.id);
      }
    }
  };

  const registerForEvent = async (eventId: number) => {
    try {
      await apiClient.post(`/Event/${eventId}/register`);
      alert('Вы успешно записались!');
      reloadCurrentMonth();
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent({ ...selectedEvent, isRegistered: true });
        await loadParticipants(eventId);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Произошла ошибка при записи');
    }
  };

  const loadParticipants = async (eventId: number) => {
    setLoadingParticipants(true);
    try {
      const response = await apiClient.get(`/Event/${eventId}/participants`);
      setParticipants(response.data);
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить участников.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleToggleAttendance = (employeeId: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.employeeId === employeeId ? { ...p, statuse: !p.statuse } : p))
    );
  };

  const handleSaveAttendance = async () => {
    if (!selectedEvent) return;
    try {
      await apiClient.post(`/Event/${selectedEvent.id}/attendance`, participants);
      alert('Отметки сохранены, рейтинг обновлен!');
      setIsAttendanceModalOpen(false);
      reloadCurrentMonth();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка сохранения отметок.');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    try {
      // Приводим время к формату "ЧЧ:ММ:СС"
      const formattedTime = newTime.length === 5 ? `${newTime}:00` : newTime;

      await apiClient.post('/Event', {
        title: newTitle,
        type: newType,
        date: newDate,
        time: formattedTime,
        location: newLocation,
      });

      alert('Мероприятие успешно создано!');
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewLocation('');
      setNewDate('');
      setNewTime('');
      reloadCurrentMonth();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Ошибка создания мероприятия.');
    }
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '20px auto',
        padding: '0 20px',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Панель управления */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          borderBottom: '1px solid #eee',
          paddingBottom: '15px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>
            Календарь мероприятий {role && <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({role})</span>}
          </h2>

          {isHQ && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                padding: '7px 14px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              + Создать мероприятие
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isHQ && ( 
            <a href="/employees" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}> 
            Управление составом → 
            </a> 
          )}

          <a href="/rating" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            Перейти к рейтингу →
          </a>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Календарь */}
      <div style={{ width: '100%' }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin] as any}
          initialView="dayGridMonth"
          events={events}
          locale="ru"
          firstDay={1}
          datesSet={(arg) => {
            const current = arg.view.currentStart;
            fetchEvents(current.getFullYear(), current.getMonth() + 1);
          }}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>

      {/* Модальное окно создания мероприятия (только Штаб) */}
      {isCreateModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Создание нового мероприятия</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Название:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Тип события:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                >
                  <option value="мероприятие">мероприятие</option>
                  <option value="рейд">рейд</option>
                  <option value="собрание">собрание</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Дата:</label>
                  <input
                    type="date"
                    lang="ru-RU"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Время:</label>
                  <input
                    type="time"
                    lang="ru-RU"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>Место проведения:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>

              {createError && <div style={{ color: 'red', fontSize: '13px' }}>{createError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно журнала посещаемости */}
      {isAttendanceModalOpen && selectedEvent && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{selectedEvent.title}</h3>
                <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>
                  {selectedEvent.date} в {selectedEvent.time.substring(0, 5)} | {selectedEvent.location}
                </p>
              </div>
              <button
                onClick={() => setIsAttendanceModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <hr style={{ margin: '15px 0', borderColor: '#eee' }} />

            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>
                Ваш статус: <b>{selectedEvent.isRegistered ? 'Вы записаны' : 'Вы не записаны'}</b>
              </span>
              {!selectedEvent.isRegistered && (
                <button
                  onClick={() => registerForEvent(selectedEvent.id)}
                  style={{ padding: '6px 12px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
                >
                  Записаться самому
                </button>
              )}
            </div>

            <h4 style={{ margin: '15px 0 10px 0' }}>Список записавшихся:</h4>

            {loadingParticipants ? (
              <p style={{ color: '#666' }}>Загрузка списка...</p>
            ) : participants.length === 0 ? (
              <p style={{ color: '#888' }}>На это мероприятие пока никто не записался.</p>
            ) : (
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
                      <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>Был</th>
                      <th style={{ padding: '8px' }}>ФИО</th>
                      <th style={{ padding: '8px' }}>Подразделение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.employeeId} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={p.statuse}
                            onChange={() => handleToggleAttendance(p.employeeId)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>{p.fullName}</td>
                        <td style={{ padding: '8px', color: '#666', fontSize: '13px' }}>{p.subdivisionTitle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setIsAttendanceModalOpen(false)}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#e0e0e0', border: 'none', borderRadius: '4px' }}
              >
                Отмена
              </button>
              {participants.length > 0 && (
                <button
                  onClick={handleSaveAttendance}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  Сохранить отметки (+10 баллов)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalBoxStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  padding: '20px',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};