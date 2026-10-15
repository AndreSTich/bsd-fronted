import { useState, useRef } from 'react';
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
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventDto | null>(null);
  const [participants, setParticipants] = useState<AttendanceDto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const calendarRef = useRef<FullCalendar | null>(null);

  // Получаем текущую роль пользователя
  const role = localStorage.getItem('role') || '';
  const canManageAttendance = role === 'штаб' || role === 'командир';

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
      console.error('Ошибка при загрузке мероприятий', error);
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
      // Штаб и командир открывают журнал посещаемости
      await loadParticipants(event.id);
      setIsModalOpen(true);
    } else {
      // Обычный сотрудник записывается
      if (event.isRegistered) {
        alert('Вы уже записаны на это мероприятие!');
        return;
      }

      const confirmMsg = `Записаться на "${clickInfo.event.title}"?\nМесто: ${event.location}`;
      if (window.confirm(confirmMsg)) {
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
      console.error('Ошибка при загрузке участников', error);
      alert('Не удалось загрузить список участников.');
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
      alert('Отметки сохранены, рейтинг пересчитан!');
      setIsModalOpen(false);
      reloadCurrentMonth();
    } catch (error: any) {
      console.error('Ошибка при сохранении отметок', error);
      alert(error.response?.data?.message || 'Ошибка сохранения отметок.');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Календарь мероприятий {canManageAttendance && <span style={{ fontSize: '14px', color: '#666' }}>({role})</span>}</h2>
        <a href="/rating" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
          Перейти к рейтингу →
        </a>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin] as any}
        initialView="dayGridMonth"
        events={events}
        locale="ru"
        firstDay={1}
        datesSet={(arg) => {
          const currentMonthDate = arg.view.currentStart;
          fetchEvents(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1);
        }}
        eventClick={handleEventClick}
        height="auto"
      />

      {/* Модальное окно для штаба и командиров */}
      {isModalOpen && selectedEvent && (
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
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <hr style={{ margin: '15px 0', borderColor: '#eee' }} />

            {/* Блок для самозаписи проверяющего */}
            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px' }}>
                Ваш статус участия: <b>{selectedEvent.isRegistered ? 'Вы записаны' : 'Вы не записаны'}</b>
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

            <h4 style={{ margin: '15px 0 10px 0' }}>Список записавшихся сотрудников:</h4>

            {loadingParticipants ? (
              <p style={{ color: '#666' }}>Загрузка списка участников...</p>
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
                onClick={() => setIsModalOpen(false)}
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