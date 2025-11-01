"use client";

import { useState } from "react";

export const ReportsCard = () => {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerateReport = async (type: "monthly" | "ytd") => {
    setGenerating(type);
    
    try {
      const response = await fetch(`/api/reports/${type}`, {
        method: "GET",
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
      <h3 className="text-xl font-bold text-[#1E4E6B] flex items-center">
        <svg
          className="w-6 h-6 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Reports & Export
      </h3>

      <p className="text-sm text-[#64748b]">
        Generate comprehensive financial reports for your records or tax purposes.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => handleGenerateReport("monthly")}
          disabled={generating === "monthly"}
          className="w-full flex items-center justify-between p-4 border-2 border-[#1E4E6B] rounded-xl hover:bg-[#f0f4f8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1E4E6B] rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#1E4E6B]">Monthly Report</p>
              <p className="text-xs text-[#64748b]">Current month income & expenses</p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-[#64748b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>

        <button
          onClick={() => handleGenerateReport("ytd")}
          disabled={generating === "ytd"}
          className="w-full flex items-center justify-between p-4 border-2 border-[#A4C639] rounded-xl hover:bg-[#f0f4f8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#A4C639] rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#1E4E6B]">Year-to-Date Report</p>
              <p className="text-xs text-[#64748b]">Annual overview for tax purposes</p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-[#64748b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>
      </div>

      {generating && (
        <div className="text-center text-sm text-[#64748b] animate-pulse">
          Generating {generating} report...
        </div>
      )}
    </div>
  );
};

