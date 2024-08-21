import React, { useEffect, useState } from "react";
import axiosInstance from "../../axiosInstance";

const Score = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await axiosInstance.get("/quiz/scores");
        setScores(response.data);
      } catch (err) {
        setError("Failed to fetch scores");
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="m-5">
<div className="flex justify-end">
        <button className="px-3 py-2 bg-teal-600 text-white mb-3 rounded-2xl">Download</button>
        </div>  
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-md">
        <thead>
          <tr className="bg-gray-100 text-teal-600">
            <th className="py-2 px-4 border-b">Full Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Score</th>
            <th className="py-2 px-4 border-b">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{score.fullname}</td>
              <td className="py-2 px-4 border-b">{score.email}</td>
              <td className="py-2 px-4 border-b">{score.ts_quiz_score}</td>
              <td className="py-2 px-4 border-b">{score.ts_quiz_timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default Score;
