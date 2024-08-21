import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const Quiz = () => {
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState([]);
  const [currQuesIndx, setCurrQuesIndx] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [quizEnded, setQuizEnded] = useState(false);
  const [userExist, setUserExist] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [userResponses, setUserResponses] = useState([]);

  useEffect(() => {
    fetchQuizData();
    // eslint-disable-next-line
  }, []);
  const fetchQuizData = async () => {
    try {
      const user = localStorage.getItem("userId");
      console.log(user);
      const response = await axiosInstance.post("/quiz/quizData",{ user });
      if (response.data.success === false) {
        setUserExist(true);
        setQuizEnded(true);
      } else {
        const data = response.data.questions;
        setQuizData(data);
      }
      const startTime = new Date(response.data.timestamp).getTime();
      const localStoredTime = localStorage.getItem("startingTime");

      if (!localStoredTime) {
        localStorage.setItem("startingTime", startTime);
        startTimer(startTime);
      } else {
        startTimer(parseInt(localStoredTime, 10));
      }
    } catch (error) {
      console.error("Error fetching quiz data:", error);
    }
  };

  const startTimer = (startTime) => {
    const duration = 15 * 60 * 1000;
    const endTime = startTime + duration;

    const timerInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime - now;

      if (distance <= 0) {
        clearInterval(timerInterval);
        setQuizEnded(true);
      } else {
        setRemainingTime(distance);
      }
    }, 1000);
  };

  const nextQuestion = () => {
    setErrorMessage("");
    const userAns = Array.from(
      document.querySelectorAll("input[name=option]:checked")
    ).map((input) => input.value);

    if (userAns.length === 0) {
      setErrorMessage("Please select an option.");
      return;
    }

    setUserResponses((prevResponses) => [
      ...prevResponses,
      { questionId: quizData[currQuesIndx].id, userAnswer: userAns },
    ]);

    const inputFields = document.querySelectorAll("input[name=option]:checked");
    inputFields.forEach((inputField) => {
      inputField.checked = false;
    });

    if (currQuesIndx < quizData.length - 1) {
      setCurrQuesIndx(currQuesIndx + 1);
    } else {
      setQuizEnded(true);
    }
  };

  const endQuiz = async () => {
    try {
      await axiosInstance.get("/user/logout");
      navigate("/auth/login");
      document.cookie.replace("token", "");
      localStorage.clear();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const storedAnswers = localStorage.getItem(`answers_${currQuesIndx}`);
    if (storedAnswers) {
      const parsedAnswers = JSON.parse(storedAnswers);
      parsedAnswers.forEach((answer) => {
        const input = document.getElementById(answer);
        if (input) {
          input.checked = true;
        }
      });
    }
  }, [currQuesIndx]);

  useEffect(() => {
    if (quizEnded) {
      submitAllAnswers();
    }
    // eslint-disable-next-line
  }, [quizEnded]);

  const submitAllAnswers = async () => {
    const user = localStorage.getItem("userId");
    if (userExist === false) {
      try {
        const response = await axiosInstance.post("/quiz/quiz",{ userResponses, user });
        if (response.data.success) {
          setQuizEnded(true);
        } else {
          console.error("Error submitting all answers:", response.data.error);
        }
      } catch (error) {
        console.error("Error submitting all answers:", error);
      }
    }
  };

  const formatTime = (ms) => {
    let minutes = Math.floor(ms / (1000 * 60));
    let seconds = Math.floor((ms % (1000 * 60)) / 1000);
    seconds = seconds > 9 ? seconds : `0${seconds}`;
    minutes = minutes > 9 ? minutes : `0${minutes}`;
    return `${minutes}:${seconds}`;
  };

  const getFullScreenElement = () => {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullscreenElement ||
      document.msFullscreenElement
    );
  };

  const checkFullscreen = () => {
    if (!getFullScreenElement()) {
      navigate("/testkey");
    }
  };
  const handleKeyDown = (event) => {
    const { key, shiftKey, ctrlKey, altKey, metaKey } = event;

    if (
      key === "Escape" ||
      shiftKey ||
      ctrlKey ||
      altKey ||
      metaKey ||
      key === "Esc"
    ) {
      navigate("/testkey");
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", checkFullscreen);
    document.addEventListener("webkitfullscreenchange", checkFullscreen);
    document.addEventListener("mozfullscreenchange", checkFullscreen);
    document.addEventListener("msfullscreenchange", checkFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreen);
      document.removeEventListener("webkitfullscreenchange", checkFullscreen);
      document.removeEventListener("mozfullscreenchange", checkFullscreen);
      document.removeEventListener("msfullscreenchange", checkFullscreen);
    };
    // eslint-disable-next-line
  }, []);
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="mb-4 text-center">
        {!quizEnded && (
          <p className="text-teal-500 font-bold text-4xl text-end pr-5">
            {formatTime(remainingTime)}
          </p>
        )}
      </div>
      <div className="flex justify-center items-center pt-16 lg:pt-28">
        {!quizEnded && (
          <div className="bg-white px-3 py-4 w-full md:w-1/2 lg:w-1/3 shadow-lg rounded-lg">
            <h1 className="text-teal-500 text-center font-bold text-3xl mb-6">
              Question #{currQuesIndx + 1}
            </h1>
            {quizData.length > currQuesIndx && quizData[currQuesIndx] && (
              <div>
                <div id="question" className="text-center mb-6">
                  <h3 className="font-bold text-2xl ">
                    <b>{quizData[currQuesIndx].question}</b>
                  </h3>
                  {quizData[currQuesIndx].answersQuantity === "multiple" ? (
                    <p className="font-medium text-base text-teal-500 mt-2">
                      You can choose more then 1 answer
                    </p>
                  ) : (
                    ""
                  )}
                </div>
                <div id="box" className="flex flex-col mb-6">
                  <div id="options">
                    {quizData[currQuesIndx].options.map((option, index) => (
                      <div key={index} className="space-x-2 mb-2">
                        <input
                          type={
                            quizData[currQuesIndx].answersQuantity ===
                            "multiple"
                              ? "checkbox"
                              : "radio"
                          }
                          name="option"
                          value={option}
                          id={option}
                        />
                        <label className="cursor-pointer" htmlFor={option}>
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-red-600 font-bold text-xl text-center">
                    {errorMessage}
                  </p>
                </div>
                <div className={`flex items-center justify-end`}>
                  <button
                    className="bg-teal-500 hover:bg-teal-600 font-bold text-white px-4 text-left py-2 rounded"
                    onClick={nextQuestion}
                  >
                    {currQuesIndx === quizData.length - 1 ? "Finish" : "Next"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {quizEnded && (
          <div className="bg-white items-center px-3 py-4 w-full md:w-1/2 lg:w-1/3 shadow-lg rounded-lg">
            {userExist && (
              <p className="text-center text-2xl font-bold text-teal-500 mt-4">
                You have already performed quiz
              </p>
            )}
            <p className="text-center text-xl font-bold text-gray-500 mt-4">
              You will be notified by the the email for next quarter
            </p>
            <div className="flex justify-center">
              <button
                className="bg-teal-500 mt-10 font-bold text-white px-4 text-left py-2 rounded"
                onClick={endQuiz}
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
