// Auth utility functions

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  provider: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp < currentTime;



    return isExpired;
  } catch (error) {
    return true; // If can't parse, consider expired
  }
};

// Get token from localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Get user from localStorage
export const getUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Save auth data to localStorage
export const saveAuthData = (user: User, token: string): void => {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
};

// Clear auth data from localStorage
export const clearAuthData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberedEmail');
  localStorage.removeItem('rememberedPassword');
  localStorage.removeItem('rememberMe');
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const token = getToken();
  const user = getUser();


  if (!token || !user) {
    return false;
  }

  // Check if token is expired locally first
  if (isTokenExpired(token)) {
    clearAuthData();
    return false;
  }

  // Verify with backend
  try {
    const response = await fetch('http://localhost:3000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      clearAuthData();
      return false;
    }

    return true;
  } catch (error) {
    clearAuthData();
    return false;
  }
};

// Auto-refresh token if needed
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  const token = getToken();

  if (!token) {
    return false;
  }

  // Check if token expires in next 2 minutes
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const timeUntilExpiry = payload.exp - currentTime;

    // If expires in less than 2 minutes, try to refresh
    if (timeUntilExpiry < 2 * 60) {
      const user = getUser();
      if (user) {
        // Try to get new token by calling login with remembered credentials
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const rememberedPassword = localStorage.getItem('rememberedPassword');

        if (rememberedEmail && rememberedPassword) {
          try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: rememberedEmail,
                password: rememberedPassword
              })
            });

            const data: AuthResponse = await response.json();

            if (data.success) {
              saveAuthData(data.data.user, data.data.token);
              return true;
            }
          } catch (error) {
          }
        }
      }
    }

    return true; // Token is still valid
  } catch (error) {
    clearAuthData();
    return false;
  }
};
