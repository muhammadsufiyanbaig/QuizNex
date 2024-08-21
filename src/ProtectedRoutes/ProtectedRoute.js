
import React from 'react';
import { Navigate } from 'react-router-dom';

const TeacherprotectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('userId'); 

  return isAuthenticated ? children : <Navigate to="/auth/login" />;
};

export default TeacherprotectedRoute;
