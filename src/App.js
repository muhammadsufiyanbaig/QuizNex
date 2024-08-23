import React from "react";
import { Routes, Route } from "react-router-dom";
import Quiz from "./components/Quiz";
import Login from "./components/User/auth/Login";
import SignUp from "./components/User/auth/Signup";
import Key from "./components/key";
import ProtectedRoute from "./ProtectedRoutes/ProtectedRoute";
import TeacherPortal from "./components/Teacher/TeacherPortal";
import TeacherLogin from "./components/Teacher/auth/TeacherLogin";
import TeacherSignup from "./components/Teacher/auth/TeacherSignup";
import TeacherprotectedRoute from "./ProtectedRoutes/TeacherProtectedRoute";
import NoPage from "./components/NoPage";
import LandingPage from "./components/LandingPage";
import Portal from "./components/User/Portal";
import Score from "./components/Teacher/Score";
import OTP from "./components/reuseableComponent/OTP";
// import Navbar from "./components/Navbar";

const App = () => {
  return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="auth" element={<Login />} />
        <Route path="auth/login" element={<Login />} />
        <Route path="auth/otp" element={<OTP />} />
        <Route path="auth/signup" element={<SignUp />} />
        <Route
          path="testkey"
          element={
            <ProtectedRoute>
              <Key />
            </ProtectedRoute>
          }
        />
        <Route
          path="portal"
          element={
            <ProtectedRoute>
              <Portal />
            </ProtectedRoute>
          }
        />
        <Route
          path="quiz"
          element={
            <ProtectedRoute>
              <Quiz />
            </ProtectedRoute>
          }
        />
        <Route
          path="teacher/portal"
          element={
            <TeacherprotectedRoute>
              <TeacherPortal />
            </TeacherprotectedRoute>
          }
        />
        <Route
          path="teacher/portal/score"
          element={
            <TeacherprotectedRoute>
              <Score />
            </TeacherprotectedRoute>
          }
        />
        <Route path="*" element={<NoPage />} />
        <Route path="teacher" element={<TeacherLogin />} />
        <Route path="teacher/auth" element={<TeacherLogin />} />
        <Route path="teacher/auth/login" element={<TeacherLogin />} />
        <Route path="teacher/auth/signup" element={<TeacherSignup />} />
      </Routes>

  );
};

export default App;
