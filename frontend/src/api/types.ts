export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface Address {
  id?: string;
  userId: string;
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  type?: string;
}

export interface AuthData {
  token: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}
