"use client";

import { useEffect, useState } from "react";

export const AIInsightsCard = () => {
  const [insight, setInsight] = useState("Loading insights...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/owner-insights")
      .then((r) => r.json())
      .then((data) => {
        setInsight(data.summary);
        setLoading(false);
      })
      .catch(() => {
        setInsight("Unable to generate insights at this time. Please try again later.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 bg-gradient-to-r from-[#1E4E6B] to-[#2a6a8d] text-white rounded-2xl shadow-lg">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-8 h-8 text-[#A4C639]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 flex items-center">
            AI Portfolio Insights
            <span className="ml-2 text-xs bg-[#A4C639] text-white px-2 py-1 rounded-full">POWERED BY AI</span>
          </h3>
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-pulse flex space-x-2">
                <div className="h-2 w-2 bg-white rounded-full"></div>
                <div className="h-2 w-2 bg-white rounded-full"></div>
                <div className="h-2 w-2 bg-white rounded-full"></div>
              </div>
              <span className="text-sm opacity-75">Analyzing your portfolio...</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed opacity-95">{insight}</p>
          )}
        </div>
      </div>
    </div>
  );
};

