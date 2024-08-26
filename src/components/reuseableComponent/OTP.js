import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosInstance";

const OTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [timer, setTimer] = useState(60); // 60 seconds timer for resend button
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    const storedEmail = localStorage.getItem("emailForOTP");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate("/auth/signup");
    }
  }, [navigate]);

  useEffect(() => {
    if (timer > 0) {
      const intervalId = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(intervalId);
    } else {
      setIsButtonDisabled(false);
    }
  }, [timer]);

  const handleChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return false;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleResendOtp = async () => {
    try {
      await axiosInstance.post("/otp/request", { email });
      alert("OTP has been successfully resent.");
      setTimer(60); // Reset the timer to 60 seconds
      setIsButtonDisabled(true); // Disable the button again
    } catch (error) {
      console.error("Signup error:", error.response.data);
      setError(error.response.data.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      return;
    }
    try {
      const response = await axiosInstance.post("/otp/verify", {
        otp: enteredOtp,
        email,
      });
      const isUser = localStorage.getItem("isUser");
      console.log("OTP verification success:", response.data);
      alert("Your account is verified successfully.");
      if (isUser) {
        navigate("/auth/login");
      } else {
        navigate("/teacher/auth/login");
      }
    } catch (error) {
      console.error("OTP verification error:", error.response.data);
      setError("Invalid OTP. Please try again.");
    }
  };

  return (
    <>
      <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-gray-50 py-12">
        <div className="relative bg-white px-6 pt-10 pb-9 shadow-xl mx-auto w-full max-w-lg rounded-2xl">
          <div className="mx-auto flex w-full max-w-md flex-col space-y-16">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="font-semibold text-3xl">
                <p>Email Verification</p>
              </div>
              <div className="flex flex-row text-sm font-medium text-gray-400">
                <p>We have sent a code to your email</p>
              </div>
            </div>
            <div>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col space-y-16">
                  <div className="flex flex-row items-center justify-between mx-auto w-full max-w-lg">
                    {otp.map((_, index) => (
                      <div key={index} className="w-14 h-14">
                        <input
                          className="w-full h-full flex flex-col items-center justify-center text-center px-5 outline-none rounded-xl border border-gray-200 text-lg bg-white focus:bg-gray-50 focus:ring-1 ring-teal-700"
                          type="text"
                          maxLength="1"
                          value={otp[index]}
                          onChange={(e) => handleChange(e.target, index)}
                        />
                      </div>
                    ))}
                  </div>
                  {error && <p className="text-red-500 text-center">{error}</p>}
                  <div className="flex flex-col space-y-5">
                    <div>
                      <button className="flex flex-row items-center justify-center text-center w-full border rounded-xl outline-none py-5 bg-teal-700 border-none text-white text-sm shadow-sm">
                        Verify Account
                      </button>
                    </div>
                    <div className="flex flex-row items-center justify-center text-center text-sm font-medium space-x-1 text-gray-500">
                      <p>Didn't receive the code?</p>
                      <button
                        className={`flex flex-row items-center ${
                          isButtonDisabled ? "text-gray-400" : "text-teal-600"
                        } `}
                        onClick={handleResendOtp}
                        disabled={isButtonDisabled}
                      >
                        Resend {isButtonDisabled && `(${timer}s)`}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OTP;
