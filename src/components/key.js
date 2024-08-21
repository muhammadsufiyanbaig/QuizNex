import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { FiEye, FiEyeOff } from "react-icons/fi";
const Guidelines = () => {
  return (
    <div className="mb-4 space-y-2">
      <h3 className="text-lg font-bold text-red-500">Note:</h3>
      <ol className="list-disc pl-3 space-y-2">
      <li><b>Total Time: </b>45 minutes</li>
        <li>
        By starting this quiz, you agree not to take pictures, copy any questions, or share them publicly. Your registration may be suspended if you are found guilty of violating this agreement.
        </li>
        <li>
        The timer will start once you click the submit button, and the quiz will auto-submit after 45 minutes.
        </li>
        <li>
        Do not press any special characters, function keys, or keys such as <b>Ctrl, Alt, Shift, or Windows</b>. Pressing these keys will cause your time to lapse.
        </li>
      </ol>
    </div>
  );
};

const Key = () => {
  const [show, setShow] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userId =  localStorage.getItem('userId');
  // console.log(userId);
  
  const handleClosePopup = () => {
    setIsPopupOpen(false);
    navigate("/portal");
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
  
    try {
      const response = await axiosInstance.post("/key/testkey", {
        key: inputValue,
        userId
      });
      if (response.data.success) {
        setIsPopupOpen(false);
        document.documentElement.requestFullscreen().catch((e) => {
          console.log(e);
        });
        navigate("/quiz");
      } else {
        setError("Wrong Key");
      }
    } catch (error) {
      setError("An error occurred while validating the key. Please try again.");
      console.error(error);
    }
  };
  const togglePasswordVisibility = () => {
    setShow(!show);
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {isPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-full md:w-1/2">
            <Guidelines />
            <h2 className="text-lg font-bold mb-4">Enter Test Key:</h2>
            <form onSubmit={handleSubmit}>
              <div className="my-5 relative">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  className="block w-full px-3 border-2 border-gray-500 py-1.5 text-gray-900 sm:text-sm"
                  value={inputValue}
                  onChange={handleInputChange}
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
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClosePopup}
                  className="px-4 py-2 mr-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-teal-500 rounded hover:bg-teal-600 focus:outline-none focus:shadow-outline"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Key;
