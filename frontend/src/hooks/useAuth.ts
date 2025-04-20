import { useState, useEffect } from 'react';

interface User {
  username: string;
  role: string;
  groups?: string[];
  nameID: string;
  firstName: string;
  department?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isStaff: false,
    isAdmin: false,
    isSuperAdmin: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const userGroups = tokenPayload.groups || [];
        const user = {
          username: tokenPayload.username,
          groups: userGroups,
          nameID: tokenPayload.nameID,
          firstName: tokenPayload.firstName,
          department: tokenPayload.department,
          role: userGroups.includes('Admin') ? 'Admin' : userGroups.includes('Staffs') ? 'Staffs' : 'Students'
        };
        setState({
          user,
          isLoading: false,
          isStaff: userGroups.includes('Staffs') || userGroups.includes('Admin'),
          isAdmin: userGroups.includes('Admin'),
          isSuperAdmin: userGroups.includes('SuperAdmin'),
        });
      } catch (error) {
        console.error('Error parsing auth token:', error);
        setState({
          user: null,
          isLoading: false,
          isStaff: false,
          isAdmin: false,
          isSuperAdmin: false,
        });
      }
    } else {
      setState({
        user: null,
        isLoading: false,
        isStaff: false,
        isAdmin: false,
        isSuperAdmin: false,
      });
    }
  }, []);

  return state;
}; 