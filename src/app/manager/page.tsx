"use client";

import { useState } from "react";
import { FinancialSummary } from "./components/FinancialSummary";
import { ExpenseTable } from "./components/ExpenseTable";
import { MaintenanceOverview } from "./components/MaintenanceOverview";
import { PropertyPerformance } from "./components/PropertyPerformance";
import { AIInsightsCard } from "./components/AIInsightsCard";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { ReportsCard } from "./components/ReportsCard";

export default function ManagerDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Mock financial data - replace with actual API call
  const financialData = [
    { month: "Jan", income: 23500, expenses: 7200 },
    { month: "Feb", income: 23500, expenses: 5800 },
    { month: "Mar", income: 23500, expenses: 8400 },
    { month: "Apr", income: 23500, expenses: 6200 },
    { month: "May", income: 23500, expenses: 7600 },
    { month: "Jun", income: 23500, expenses: 9100 },
  ];

  const handleExpenseAdded = () => {
    // Trigger refresh of expense table
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] via-[#e8f2f6] to-[#f0f4f8]">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-[#1E4E6B]">Owner Dashboard</h1>
              <p className="text-[#64748b] mt-1">Property Performance & Financial Insights</p>
            </div>
            <AddExpenseModal onAdded={handleExpenseAdded} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Insights Banner */}
        <div className="mb-6">
          <AIInsightsCard />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Financial Summary - Takes 2 columns */}
          <div className="lg:col-span-2">
            <FinancialSummary data={financialData} />
          </div>

          {/* Reports Card */}
          <div className="lg:col-span-1">
            <ReportsCard />
          </div>
        </div>

        {/* Property Performance */}
        <div className="mb-6">
          <PropertyPerformance />
        </div>

        {/* Maintenance Overview */}
        <div className="mb-6">
          <MaintenanceOverview />
        </div>

        {/* Expense Table */}
        <div key={refreshKey}>
          <ExpenseTable />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#64748b]">
          <p>NXTLevel Rental Manager • Owner Dashboard v1.0</p>
          <p className="mt-1">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

