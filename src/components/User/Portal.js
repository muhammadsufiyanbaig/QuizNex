import React, { useEffect, useState } from 'react';
import  axiosInstance from '../../axiosInstance'
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";

const Portal = () => {
  const [user, setUser] = useState({ fullname: '', email: '' });
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUserData = async () => {
      const id = localStorage.getItem('userId');
      try {
        const response = await axiosInstance.post('/user/portal', { id }, {withCredentials: true});
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const logout = async () => {
    try {
      await axiosInstance.get("/user/logout");
      navigate("/");
      document.cookie.replace("token", "");
      localStorage.clear();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-80">
        <h1 className="text-2xl font-bold mb-4 text-center text-teal-600">User Portal</h1>
        <p className="mb-2"><strong>Full Name:</strong> {user.fullname}</p>
        <p className="mb-4"><strong>Email:</strong> {user.email}</p>
        <div className="mt-5 flex justify-between items-center">
          <Link to={'/'} className="px-4 py-2 border-2 border-teal-600 font-bold text-teal-600 rounded">Home</Link>
          <Link to={'/testkey'} className="px-4 py-2 border-2 border-teal-600 font-bold text-teal-600 rounded">Quiz</Link>
        </div>
        <button onClick={logout} className="mt-5 border-2 font-bold text-teal-600 border-teal-600 w-full py-2">Logout</button>
      </div>
    </div>
  );
};

export default Portal;
