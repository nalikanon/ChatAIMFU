import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../config/config';
import { FiEdit, FiTrash2, FiPlus, FiX, FiCheck, FiLoader, FiEye, FiEyeOff } from 'react-icons/fi';
import Select from 'react-select';

interface Admin {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  created: string;
  updated: string;
}

interface Department {
  _id: string;
  name: string;
}

const ManageAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [departments, setDepartments] = useState<{value: string, label: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    department: ''
  });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }

      const data: Department[] = await response.json();
      setDepartments(data.map(dept => ({
        value: dept.name,
        label: dept.name
      })));
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchDepartments();
  }, []);

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      department: ''
    });
    setEditingAdmin(null);
    setShowPassword(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (selected: any) => {
    setFormData(prev => ({ ...prev, department: selected ? selected.value : '' }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAdmin) {
      return;
    }

    // Validate required fields
    if (!formData.username || !formData.firstName || !formData.lastName || !formData.email || !formData.department) {
      setError('All fields except password are required');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/admin/${editingAdmin._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update admin');
      }

      await fetchAdmins();
      resetForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating admin');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete admin');
      }

      await fetchAdmins();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting admin');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      password: '', // Leave password empty for edit
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      department: admin.department
    });
  };

  const navigateToCreateAdmin = () => {
    navigate('/admin/create');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Manage Admins
        </h1>
        <button
          onClick={navigateToCreateAdmin}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <FiPlus className="mr-2" /> Add New Admin
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <FiX />
          </button>
        </div>
      )}

      {editingAdmin && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit Admin</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                              focus:outline-none focus:ring-2 focus:ring-blue-500 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 
                          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Department *
                </label>
                <Select
                  value={departments.find(dept => dept.value === formData.department)}
                  onChange={handleDepartmentChange}
                  options={departments}
                  placeholder="Select department"
                  isClearable
                  className="react-select-container"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '42px',
                      borderRadius: '0.5rem',
                      borderColor: 'rgb(209 213 219)',
                      backgroundColor: 'white',
                      color: 'rgb(17 24 39)',
                      '&:hover': {
                        borderColor: 'rgb(156 163 175)'
                      },
                      '.dark &': {
                        backgroundColor: 'rgb(55 65 81)',
                        borderColor: 'rgb(75 85 99)',
                        color: 'white',
                        '&:hover': {
                          borderColor: 'rgb(107 114 128)'
                        }
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'white',
                      '.dark &': {
                        backgroundColor: 'rgb(55 65 81)',
                        color: 'white'
                      }
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected 
                        ? 'rgb(37 99 235)' 
                        : state.isFocused 
                          ? 'rgba(37, 99, 235, 0.1)' 
                          : undefined,
                      color: state.isSelected 
                        ? 'white' 
                        : 'inherit',
                      '.dark &': {
                        backgroundColor: state.isSelected 
                          ? 'rgb(37 99 235)' 
                          : state.isFocused 
                            ? 'rgba(37, 99, 235, 0.3)' 
                            : undefined,
                        color: state.isSelected ? 'white' : 'white'
                      },
                      ':active': {
                        ...base[':active'],
                        backgroundColor: state.isSelected 
                          ? 'rgb(29 78 216)' 
                          : 'rgba(29, 78, 216, 0.2)',
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'rgb(17 24 39)',
                      '.dark &': {
                        color: 'white'
                      }
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'rgb(17 24 39)',
                      '.dark &': {
                        color: 'white'
                      }
                    })
                  }}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 
                          text-gray-800 dark:text-white px-4 py-2 rounded-lg flex items-center"
              >
                <FiX className="mr-2" /> Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                {loading ? <FiLoader className="animate-spin mr-2" /> : <FiCheck className="mr-2" />}
                Update
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !editingAdmin ? (
        <div className="flex justify-center items-center py-8">
          <FiLoader className="animate-spin text-blue-600 h-8 w-8" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Username
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No admins found
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {admin.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {admin.firstName} {admin.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {admin.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => startEdit(admin)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        <FiEdit className="inline h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(admin._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <FiTrash2 className="inline h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageAdmin; 