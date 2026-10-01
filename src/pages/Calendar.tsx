import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { apiClient } from '../api/apiClient';

// Описываем структуру данных, которую ждем от нашего C# бэкенда
interface EventDto {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  isRegistered: boolean;
}

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);

  // Функция для загрузки мероприятий за выбранный месяц
  const fetchEvents = async (year: number, month: number) => {
    try {
      const response = await apiClient.get(`/Event/month?year=${year}&month=${month}`);
      
      // Преобразуем данные из базы в формат, понятный FullCalendar
      const formattedEvents = response.data.map((e: EventDto) => ({
        id: String(e.id),
        title: `${e.time.substring(0, 5)} - ${e.title}`, // Показываем время и название
        start: `${e.date}T${e.time}`, // Склеиваем дату и время
        // Если уже записаны — красим в зеленый, иначе стандартный синий
        backgroundColor: e.isRegistered ? '#28a745' : '#3788d8',
        borderColor: e.isRegistered ? '#28a745' : '#3788d8',
        extendedProps: { ...e }
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Ошибка при загрузке мероприятий", error);
    }
  };

  // Обработчик клика по мероприятию
  const handleEventClick = async (clickInfo: any) => {
    const event = clickInfo.event.extendedProps;
    
    if (event.isRegistered) {
      alert('Вы уже записаны на это мероприятие!');
      return;
    }

    const confirmMsg = `Записаться на "${clickInfo.event.title}"?\nМесто: ${event.location}`;
    if (window.confirm(confirmMsg)) {
      try {
        await apiClient.post(`/Event/${clickInfo.event.id}/register`);
        alert('Вы успешно записались!');
        
        // Перезагружаем мероприятия текущего месяца, чтобы обновить цвет
        const date = clickInfo.view.currentStart;
        fetchEvents(date.getFullYear(), date.getMonth() + 1);
      } catch (error: any) {
        alert(error.response?.data?.message || 'Произошла ошибка при записи');
      }
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Календарь мероприятий</h2>
        <a href="/rating" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
          Перейти к рейтингу →
        </a>
      </div>
      
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin] as any}
        initialView="dayGridMonth"
        events={events}
        locale="ru" // Русская локализация
        firstDay={1} // Неделя начинается с понедельника
        // Этот метод сработает при первой загрузке и при каждом переключении месяца
        datesSet={(arg) => {
          const currentMonthDate = arg.view.currentStart;
          fetchEvents(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1);
        }}
        eventClick={handleEventClick}
        height="auto"
      />
    </div>
  );
}