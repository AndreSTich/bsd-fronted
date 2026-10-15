import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';

interface EmployeeItem {
  id: number;
  lastName: string;
  firstName: string;
  middleName?: string;
  badgeNumber: string;
  logine: string;
  roleId: number;
  roleTitle: string;
  subdivisionId: number;
  subdivisionTitle: string;
  rating: number;
}

interface MetaItem {
  id: number;
  title: string;
}

type SortField = 'fullName' | 'badgeNumber' | 'subdivisionTitle' | 'roleTitle' | 'rating';

export default function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [roles, setRoles] = useState<MetaItem[]>([]);
  const [subdivisions, setSubdivisions] = useState<MetaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubdivision, setFilterSubdivision] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortAsc, setSortAsc] = useState(true);

  // Модальное окно (создание / редактирование)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    badgeNumber: '',
    logine: '',
    password: '',
    roleId: 2, // по умолчанию 'сотрудник'
    subdivisionId: 1,
  });
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empRes, metaRes] = await Promise.all([
        apiClient.get<EmployeeItem[]>('/Employee'),
        apiClient.get<{ roles: MetaItem[]; subdivisions: MetaItem[] }>('/Employee/meta'),
      ]);
      setEmployees(empRes.data);
      setRoles(metaRes.data.roles);
      setSubdivisions(metaRes.data.subdivisions);
      if (metaRes.data.subdivisions.length > 0) {
        setFormData((prev) => ({ ...prev, subdivisionId: metaRes.data.subdivisions[0].id }));
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert('Доступ запрещен: панель доступна только штабу.');
        navigate('/calendar');
      } else {
        alert('Ошибка при загрузке сотрудников.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSortedEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        const fullName = `${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`.toLowerCase();
        const matchesSearch =
          fullName.includes(searchQuery.toLowerCase()) ||
          emp.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.logine.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSubdivision =
          filterSubdivision === 'all' || String(emp.subdivisionId) === filterSubdivision;

        const matchesRole = filterRole === 'all' || String(emp.roleId) === filterRole;

        return matchesSearch && matchesSubdivision && matchesRole;
      })
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        if (sortField === 'fullName') {
          valA = `${a.lastName} ${a.firstName}`;
          valB = `${b.lastName} ${b.firstName}`;
        } else if (sortField === 'rating') {
          valA = a.rating;
          valB = b.rating;
        } else {
          valA = a[sortField];
          valB = b[sortField];
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [employees, searchQuery, filterSubdivision, filterRole, sortField, sortAsc]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      lastName: '',
      firstName: '',
      middleName: '',
      badgeNumber: '',
      logine: '',
      password: '',
      roleId: roles[0]?.id || 2,
      subdivisionId: subdivisions[0]?.id || 1,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: EmployeeItem) => {
    setEditingId(emp.id);
    setFormData({
      lastName: emp.lastName,
      firstName: emp.firstName,
      middleName: emp.middleName || '',
      badgeNumber: emp.badgeNumber,
      logine: emp.logine,
      password: '',
      roleId: emp.roleId,
      subdivisionId: emp.subdivisionId,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      if (editingId) {
        await apiClient.put(`/Employee/${editingId}`, {
          lastName: formData.lastName,
          firstName: formData.firstName,
          middleName: formData.middleName,
          badgeNumber: formData.badgeNumber,
          password: formData.password || undefined,
          roleId: Number(formData.roleId),
          subdivisionId: Number(formData.subdivisionId),
        });
        alert('Данные сотрудника обновлены!');
      } else {
        await apiClient.post('/Employee', {
          ...formData,
          roleId: Number(formData.roleId),
          subdivisionId: Number(formData.subdivisionId),
        });
        alert('Сотрудник успешно добавлен!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Ошибка сохранения данных');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Вы действительно хотите удалить сотрудника ${name}?`)) return;

    try {
      await apiClient.delete(`/Employee/${id}`);
      alert('Сотрудник удален.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Не удалось удалить сотрудника.');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Управление составом БСД (Штаб)</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <a href="/calendar" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            ← Календарь
          </a>
          <a href="/rating" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            Рейтинг
          </a>
        </div>
      </div>

      {/* Панель фильтров и добавления */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            placeholder="Поиск по ФИО, жетону, логину..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '220px' }}
          />

          <select
            value={filterSubdivision}
            onChange={(e) => setFilterSubdivision(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">Все подразделения</option>
            {subdivisions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">Все роли</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            padding: '9px 18px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + Добавить сотрудника
        </button>
      </div>

      {/* Таблица */}
      {isLoading ? (
        <p>Загрузка сотрудников...</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef', borderBottom: '2px solid #ddd' }}>
                <th onClick={() => handleSort('badgeNumber')} style={thStyle}>
                  Жетон {sortField === 'badgeNumber' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('fullName')} style={thStyle}>
                  ФИО {sortField === 'fullName' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('roleTitle')} style={thStyle}>
                  Должность {sortField === 'roleTitle' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('subdivisionTitle')} style={thStyle}>
                  Подразделение {sortField === 'subdivisionTitle' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('rating')} style={thStyle}>
                  Баллы {sortField === 'rating' && (sortAsc ? '▲' : '▼')}
                </th>
                <th style={{ padding: '12px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{emp.badgeNumber}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {emp.lastName} {emp.firstName} {emp.middleName || ''}
                    <div style={{ fontSize: '11px', color: '#888' }}>@{emp.logine}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{emp.roleTitle}</td>
                  <td style={{ padding: '10px 12px', color: '#555' }}>{emp.subdivisionTitle}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{emp.rating}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => openEditModal(emp)}
                      style={{ marginRight: '8px', padding: '5px 10px', cursor: 'pointer' }}
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id, `${emp.lastName} ${emp.firstName}`)}
                      style={{ padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAndSortedEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                    Сотрудники не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно формы */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>
                {editingId ? 'Редактирование сотрудника' : 'Новый сотрудник'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Фамилия"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Имя"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <input
                type="text"
                placeholder="Отчество (при наличии)"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Жетон (напр. BSD-0060)"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  required
                  style={inputStyle}
                />
                {!editingId && (
                  <input
                    type="text"
                    placeholder="Логин"
                    value={formData.logine}
                    onChange={(e) => setFormData({ ...formData, logine: e.target.value })}
                    required
                    style={inputStyle}
                  />
                )}
              </div>

              <input
                type="password"
                placeholder={editingId ? 'Новый пароль (оставьте пустым, если не меняется)' : 'Пароль'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingId}
                style={inputStyle}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#666' }}>Роль:</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                    style={inputStyle}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#666' }}>Подразделение:</label>
                  <select
                    value={formData.subdivisionId}
                    onChange={(e) => setFormData({ ...formData, subdivisionId: Number(e.target.value) })}
                    style={inputStyle}
                  >
                    {subdivisions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && <div style={{ color: 'red', fontSize: '13px' }}>{formError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {editingId ? 'Сохранить изменения' : 'Создать'}
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
  cursor: 'pointer',
  userSelect: 'none',
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
  maxWidth: '500px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
};