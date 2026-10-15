import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { apiClient } from '../api/apiClient';

interface DutyParticipant {
  employeeId: number;
  fullName: string;
  statuse: boolean;
  approverFullName?: string;
}

interface DutyDay {
  dutyId: number | null;
  date: string;
  participantsCount: number;
  isFull: boolean;
  isCurrentUserRegistered: boolean;
  participants: DutyParticipant[];
}

export default function Duties() {
  const [events, setEvents] = useState<any[]>([]);
  const [subdivisionTitle, setSubdivisionTitle] = useState('');
  const [monthData, setMonthData] = useState<Record<string, DutyDay>>({});
  
  // Модальное окно
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentDayInfo, setCurrentDayInfo] = useState<DutyDay | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const role = localStorage.getItem('role') || '';
  const currentEmpId = Number(localStorage.getItem('employeeId') || '0');
  const canApprove = role === 'командир' || role === 'штаб';

  const calendarRef = useRef<FullCalendar | null>(null);

  const fetchDuties = async (year: number, month: number) => {
    try {
      const res = await apiClient.get(`/Duty/month?year=${year}&month=${month}`);
      setSubdivisionTitle(res.data.subdivisionTitle);

      const daysMap: Record<string, DutyDay> = {};
      const calendarEvents: any[] = [];

      res.data.duties.forEach((d: DutyDay) => {
        daysMap[d.date] = d;

        // Если заняты все 2 места — красим всю ячейку дня в серый цвет
        if (d.isFull) {
          calendarEvents.push({
            id: `bg-${d.date}`,
            start: d.date,
            display: 'background',
            backgroundColor: '#adb5bd', // Серый фон для занятых дней
          });

          calendarEvents.push({
            id: `title-${d.date}`,
            title: '⛔ Занято (2/2)',
            start: d.date,
            backgroundColor: '#6c757d',
            borderColor: '#6c757d',
            allDay: true,
          });
        } else if (d.participantsCount === 1) {
          // Если занято 1 место — ячейка белая, но плашка показывает 1/2
          calendarEvents.push({
            id: `title-${d.date}`,
            title: '🟢 1 место свободно (1/2)',
            start: d.date,
            backgroundColor: '#198754',
            borderColor: '#198754',
            allDay: true,
          });
        }
      });

      setMonthData(daysMap);
      setEvents(calendarEvents);
    } catch (err) {
      console.error('Ошибка загрузки дежурств:', err);
    }
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = monthData[dateStr] || {
      dutyId: null,
      date: dateStr,
      participantsCount: 0,
      isFull: false,
      isCurrentUserRegistered: false,
      participants: [],
    };
    setCurrentDayInfo(existing);
    setIsModalOpen(true);
  };

  const reloadCalendar = () => {
    if (calendarRef.current) {
      const date = calendarRef.current.getApi().getDate();
      fetchDuties(date.getFullYear(), date.getMonth() + 1);
    }
  };

  // Записаться
  const handleRegister = async () => {
    if (!selectedDate) return;
    try {
      await apiClient.post('/Duty/register', { date: selectedDate });
      alert('Вы успешно записались на дежурство!');
      setIsModalOpen(false);
      reloadCalendar();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка записи на дежурство.');
    }
  };

  // Отменить запись
  const handleCancelRegistration = async () => {
    if (!selectedDate) return;
    if (!window.confirm('Вы уверены, что хотите отменить свою запись на это дежурство?')) return;

    try {
      await apiClient.post('/Duty/cancel', { date: selectedDate });
      alert('Запись отменена.');
      setIsModalOpen(false);
      reloadCalendar();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка отмены записи.');
    }
  };

  // Переключение галочки командиром
  const handleToggleAttendance = (employeeId: number) => {
    if (!currentDayInfo) return;
    setCurrentDayInfo({
      ...currentDayInfo,
      participants: currentDayInfo.participants.map((p) =>
        p.employeeId === employeeId ? { ...p, statuse: !p.statuse } : p
      ),
    });
  };

  // Сохранить отметки командира
  const handleSaveAttendance = async () => {
    if (!currentDayInfo || !currentDayInfo.dutyId) return;

    try {
      const updates = currentDayInfo.participants.map((p) => ({
        employeeId: p.employeeId,
        statuse: p.statuse,
      }));

      await apiClient.post(`/Duty/${currentDayInfo.dutyId}/attendance`, updates);
      alert('Отметки дежурства сохранены! Рейтинг пересчитан.');
      setIsModalOpen(false);
      reloadCalendar();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при сохранении отметок.');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Календарь дежурств</h2>
          <span style={{ fontSize: '14px', color: '#0d6efd', fontWeight: 'bold' }}>
            Подразделение: {subdivisionTitle || 'Загрузка...'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a href="/calendar" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            ← Мероприятия
          </a>
          <a href="/rating" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            Рейтинг
          </a>
        </div>
      </div>

      {/* Подсказка цветов */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#f8f9fa', padding: '10px 15px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', border: '1px solid #ccc', background: '#ffffff', borderRadius: '3px' }} />
          <span><b>Белая ячейка:</b> свободно (0 или 1 место из 2)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', background: '#adb5bd', borderRadius: '3px' }} />
          <span><b>Серая ячейка:</b> все 2 места заняты</span>
        </div>
        <span style={{ color: '#666', marginLeft: 'auto' }}>* Нажмите на любой день для записи или просмотра</span>
      </div>

      {/* Календарь */}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin] as any}
        initialView="dayGridMonth"
        locale="ru"
        firstDay={1}
        events={events}
        datesSet={(arg) => {
          const cur = arg.view.currentStart;
          fetchDuties(cur.getFullYear(), cur.getMonth() + 1);
        }}
        dateClick={(info) => handleDateSelect(info.dateStr)}
        eventClick={(info) => {
          const dateStr = info.event.startStr.split('T')[0];
          handleDateSelect(dateStr);
        }}
        height="auto"
      />

      {/* Модальное окно дежурства */}
      {isModalOpen && currentDayInfo && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Дежурство на {selectedDate}</h3>
                <span style={{ fontSize: '13px', color: '#666' }}>{subdivisionTitle}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '10px 0', fontSize: '14px' }}>
              Занято мест: <b>{currentDayInfo.participantsCount} из 2</b>
            </p>

            {/* Список дежурных */}
            <div style={{ margin: '15px 0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Записанные сотрудники:</h4>
              {currentDayInfo.participants.length === 0 ? (
                <p style={{ color: '#888', fontSize: '13px' }}>На этот день пока никто не записался.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #ddd', fontSize: '13px' }}>
                      {canApprove && <th style={{ padding: '6px' }}>Был</th>}
                      <th style={{ padding: '6px' }}>ФИО</th>
                      <th style={{ padding: '6px' }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDayInfo.participants.map((p) => (
                      <tr key={p.employeeId} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                        {canApprove && (
                          <td style={{ padding: '6px' }}>
                            <input
                              type="checkbox"
                              checked={p.statuse}
                              onChange={() => handleToggleAttendance(p.employeeId)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '6px' }}>{p.fullName}</td>
                        <td style={{ padding: '6px' }}>
                          {p.statuse ? (
                            <span style={{ color: '#198754', fontWeight: 'bold' }}>✅ Подтверждено</span>
                          ) : (
                            <span style={{ color: '#856404' }}>⏳ Не подтверждено</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Кнопки действий */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              {/* Запись / Отмена для обычного сотрудника */}
              <div>
                {currentDayInfo.isCurrentUserRegistered ? (
                  <button
                    onClick={handleCancelRegistration}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '13px',
                    }}
                  >
                    Отменить мою запись
                  </button>
                ) : (
                  !currentDayInfo.isFull && (
                    <button
                      onClick={handleRegister}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#198754',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px',
                      }}
                    >
                      Записаться на дежурство
                    </button>
                  )
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', cursor: 'pointer', background: '#ccc', border: 'none', borderRadius: '4px' }}
                >
                  Закрыть
                </button>

                {/* Кнопка утверждения для командира */}
                {canApprove && currentDayInfo.participants.length > 0 && currentDayInfo.dutyId && (
                  <button
                    onClick={handleSaveAttendance}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: '#0d6efd',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    Сохранить отметки (+10 б.)
                  </button>
                )}
              </div>
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