import React, { useState, useEffect } from "react";
import axiosInstance from "../../axiosInstance";
import { Link, useNavigate } from "react-router-dom";
import { IoPerson } from "react-icons/io5";

const CrossIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TeacherPortal = () => {
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [question, setQuestion] = useState({
    question: "",
    options: [],
    correctAnswer: [],
  });
  const [allQuestions, setAllQuestions] = useState([]);
  const [option, setOption] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchKey();
    fetchTeacher();
  }, []);

  const fetchKey = async () => {
    try {
      const response = await axiosInstance.get("/key/testkey");
      setCurrentKey(response.data.currentKey);
    } catch (error) {
      console.error("Error fetching the key:", error);
    }
  };

  const logout = async () => {
    try {
      await axiosInstance.get("/teacher/logout");
      navigate("/teacher/auth/login");
      document.cookie.replace("token", "");
      localStorage.clear();
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTeacher = async () => {
    const storedTeacherId = localStorage.getItem("TeacherId");
    if (storedTeacherId) {
      try {
        const response = await axiosInstance.post(`/teacher/portal`, {
          id: parseInt(storedTeacherId),
        });
        setTeacher(response.data);
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      }
    }
  };

  const handleTeacherModalToggle = () => {
    setIsTeacherModalOpen(!isTeacherModalOpen);
  };

  const handleSuccessModalToggle = () => {
    setIsSuccessModalOpen(!isSuccessModalOpen);
  };

  const addOption = () => {
    if (option === "") {
      setErrorMessage("Please enter an option.");
      return;
    }
    setQuestion({
      ...question,
      options: [...question.options, option],
    });
    setOption("");
  };

  const handleQuestionChange = (e) => {
    setQuestion({ ...question, question: e.target.value });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    setQuestion({ ...question, options: newOptions });
  };

  const handleCorrectAnswerChange = (option) => {
    setCorrectAnswer((prevCorrectAnswer) =>
      prevCorrectAnswer.includes(option)
        ? prevCorrectAnswer.filter((ans) => ans !== option)
        : [...prevCorrectAnswer, option]
    );
  };

  const handleAddQuestion = () => {
    if (!question.question.trim()) {
      setErrorMessage("Please enter a question.");
      return;
    }

    if (question.options.length < 2) {
      setErrorMessage("Please provide at least two options.");
      return;
    }

    if (correctAnswer.length === 0) {
      setErrorMessage("Please select at least one correct answer.");
      return;
    }

    const newQuestion = {
      ...question,
      correctAnswer: correctAnswer,
    };

    setAllQuestions([...allQuestions, newQuestion]);
    setQuestion({ id: 0, question: "", options: [], correctAnswer: [] });
    setCorrectAnswer([]);
    setErrorMessage(""); // Clear errorMessage after successful addition
  };

  const handleRemoveQuestion = (index) => {
    setAllQuestions(allQuestions.filter((_, i) => i !== index));
  };

  const handleRemoveOption = (index) => {
    const newOptions = question.options.filter((_, i) => i !== index);
    setQuestion({ ...question, options: newOptions });
  };

  const handleSubmit = async () => {
    if (allQuestions.length > 0) {
      try {
        const TeacherId = localStorage.getItem("TeacherId");
        const response = await axiosInstance.post("/quiz/addQuestions", {
          TeacherId,
          data: allQuestions,
        });
        if (response.data.success === true) {
          setIsSuccessModalOpen(true);
          setSuccessMessage(response.data.message);
        }
      } catch (error) {
        console.error("Error submitting quiz data:", error);
      }
    } else {
      setErrorMessage("Please enter at least 1 question before submitting");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar */}
      <div className="bg-teal-600 text-white flex justify-between items-center p-4 shadow-md">
        <button
          className="text-white hover:text-gray-300 focus:outline-none"
          onClick={handleTeacherModalToggle}
        >
          <div className="p-2 rounded-full bg-white">
            <IoPerson className="text-xl text-teal-600" />
          </div>
        </button>
        <h1 className="font-bold text-xl">Teacher Portal</h1>
        <div></div>
      </div>

      {/* Teacher Details Modal */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-4 sm:mx-6">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={handleTeacherModalToggle}
            >
              <CrossIcon />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center text-teal-600">
              Teacher Details
            </h2>
            {teacher ? (
              <>
                <p className="text-gray-700">
                  <strong>Name:</strong> {teacher.fullname}
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong> {teacher.email}
                </p>
                <div className="flex justify-center mt-4">
                  <button
                    className="bg-teal-600 text-white font-bold px-4 py-2 rounded hover:bg-teal-700 transition duration-200"
                    onClick={logout}
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              navigate("/teacher/auth/login")
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {/* Main Content */}
        <div className="flex justify-center items-center">
          <div className="max-w-4xl mx-auto mb-8">
            <h1 className="text-2xl font-bold mb-4">
              <strong className="font-black">Current Key:</strong> {currentKey}
            </h1>
          </div>
          <Link
            to={"/teacher/portal/score"}
            className="py-2 px-3 bg-teal-600 text-white text-lg rounded-xl"
          >
            Score
          </Link>
        </div>
        {/* Question Form */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded  mb-4">
                {errorMessage}
              </div>
            )}
            {/* Question Input */}
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="question"
              >
                Question
              </label>
              <input
                id="question"
                type="text"
                value={question.question}
                onChange={handleQuestionChange}
                placeholder="Enter Question....."
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            {/* Options */}
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="options"
              >
                Options
              </label>
              {question.options.map((opt, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                  <button
                    className="py-2 px-2 ml-2 text-gray-600 hover:text-gray-900"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <CrossIcon />
                  </button>
                </div>
              ))}

              <div className="flex items-center">
                <input
                  id="option"
                  type="text"
                  placeholder="Enter Option......"
                  value={option}
                  onChange={(e) => setOption(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                <button
                  className="bg-teal-600 text-base px-4 text-white p-2 rounded ml-2 hover:bg-teal-700 transition duration-200"
                  onClick={addOption}
                >
                  +
                </button>
              </div>
            </div>
            {/* Correct Answers */}
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="correctAnswers"
              >
                Correct Answers
              </label>
              {question.options.map((opt, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    id={`correctOption${index}`}
                    type="checkbox"
                    className="mr-2"
                    value={opt}
                    onChange={() => handleCorrectAnswerChange(opt)}
                    checked={correctAnswer.includes(opt)}
                  />
                  <label
                    htmlFor={`correctOption${index}`}
                    className="text-gray-700"
                  >
                    {opt}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                className="bg-teal-600 text-white p-2 rounded hover:bg-teal-700 transition duration-200"
                onClick={handleAddQuestion}
              >
                Add Question
              </button>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="max-w-4xl mx-auto">
          <div className="max-h-80 h-64 overflow-y-auto rounded-lg shadow-md bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-200 w-full">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Options
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Correct Answer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-teal-600 uppercase tracking-wider">
                    Cancel
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 divide-y divide-gray-200">
                {allQuestions.map((q, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {q.question}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {q.options.join(", ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {q.correctAnswer.join(", ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap  text-sm font-medium">
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <CrossIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleSubmit}
            className="bg-teal-600 text-white p-3 mt-4 w-full border-2 border-teal-600 rounded-xl text-lg font-bold hover:bg-teal-700 transition duration-200"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Submitted Message Modal */}
      {isSuccessModalOpen && successMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-4 sm:mx-6">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={handleSuccessModalToggle}
            >
              <CrossIcon />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center text-teal-600">
              Submitted
            </h2>
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPortal;
