import React, { useEffect, useState } from "react";
import axiosInstance from "../../axiosInstance";
import * as XLSX from "xlsx";

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

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(scores);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");
    XLSX.writeFile(workbook, "QuizScores.xlsx");
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="m-5">
      <div className="flex justify-end">
        <button 
          onClick={downloadExcel}
          className="px-4 py-2 bg-teal-600 text-white mb-3 rounded-2xl hover:bg-teal-700 transition"
        >
          Download
        </button>
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
