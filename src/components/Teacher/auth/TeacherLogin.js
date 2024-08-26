import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../axiosInstance";

const TeacherLogin = () => {
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShow(!show);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      alert("Please fill in all fields before submitting");
      return;
    }
    try {
      const response = await axiosInstance.post("/teacher/login",formData, {withCredentials: true});

      if (response.data.error === "Invalid credentials") {
        alert("Invalid email or password!");
        return;
      }

      console.log("Login success:", response.data);
      localStorage.setItem("TeacherId", response.data.id);

      // Set a timeout to remove TeacherId after 1 hour (3600000 ms)

  
      navigate("/teacher/portal");
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Invaild Email or Password");
    }
  };
  // setTimeout(() => {
  //   localStorage.clear();
  // }, 60* 60 * 1000);
  return (
    <>
      <div className="flex min-h-screen flex-col justify-center items-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-3xl font-bold tracking-tight text-teal-600">
            Welcome to Teacher Portal
          </h2>
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Email address
              </label>
              <div className="mt-2 rounded-md">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="block w-full px-3  rounded-md border-2 border-gray-500 py-1.5 text-gray-900 focus:ring-blue-600 sm:text-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="mt-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Password
              </label>
              <div className="mt-2 relative rounded-md">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="block w-full px-3 rounded-md border-2 border-gray-500 py-1.5 text-gray-900 sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 mt-3 mr-3"
                  onClick={togglePasswordVisibility}
                >
                  {!show ? (
                    <FiEyeOff className="text-teal-500" />
                  ) : (
                    <FiEye className="text-teal-500" />
                  )}
                </button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-teal-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Sign in
              </button>
            </div>
          </form>
          <p className="mt-10 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/teacher/auth/signup"
              className="font-semibold leading-6 text-teal-500 hover:text-teal-500"
            >
              SignUp
            </Link>{" "}
            or{" "}
            <Link
              to="/auth/login"
              className="font-semibold leading-6 text-teal-500 hover:text-teal-500"
            >
              Student
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default TeacherLogin;
