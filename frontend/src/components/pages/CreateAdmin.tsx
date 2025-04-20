import React, { useState, useEffect } from 'react';
import { config } from '../../config/config';
import Select from 'react-select';

interface Department {
  _id: string;
  name: string;
}

const CreateAdmin: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    department: ''
  });
  const [departments, setDepartments] = useState<{value: string, label: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
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
        // Fallback to empty array if fetch fails
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${config.apiUrl}/api/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Error creating admin');
      }

      setSuccess(true);
      setFormData({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        department: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Create New Admin
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">Admin created successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Department
          </label>
          <Select
            value={departments.find(dept => dept.value === formData.department)}
            onChange={(selected) => setFormData({...formData, department: selected?.value || ''})}
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

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAdmin; 