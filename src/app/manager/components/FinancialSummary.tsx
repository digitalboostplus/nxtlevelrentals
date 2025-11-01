"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface FinancialData {
  month: string;
  income: number;
  expenses: number;
}

export const FinancialSummary = ({ data }: { data: FinancialData[] }) => {
  const netProfit = data.reduce((acc, cur) => acc + (cur.income - cur.expenses), 0);
  const totalIncome = data.reduce((acc, cur) => acc + cur.income, 0);
  const totalExpenses = data.reduce((acc, cur) => acc + cur.expenses, 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
      <h2 className="text-2xl font-bold text-[#1E4E6B]">Financial Summary</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#f0f4f8] to-[#e8f2f6] p-4 rounded-xl">
          <p className="text-sm text-[#64748b] font-medium">Total Income</p>
          <p className="text-2xl font-bold text-[#1E4E6B]">${totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f4f8] to-[#e8f2f6] p-4 rounded-xl">
          <p className="text-sm text-[#64748b] font-medium">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-[#A4C639] to-[#8fb526] p-4 rounded-xl">
          <p className="text-sm text-white font-medium">Net Profit YTD</p>
          <p className="text-2xl font-bold text-white">${netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="income" fill="#A4C639" name="Income" radius={[8, 8, 0, 0]} />
            <Bar dataKey="expenses" fill="#FF5F5F" name="Expenses" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense-to-Income Ratio */}
      <div className="mt-4 p-4 bg-gradient-to-r from-[#f0f4f8] to-[#e8f2f6] rounded-xl">
        <p className="text-sm text-[#64748b]">Expense-to-Income Ratio</p>
        <p className="text-xl font-bold text-[#1E4E6B]">
          {totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%
          <span className="text-sm ml-2 text-[#64748b]">(Target: &lt; 40%)</span>
        </p>
      </div>
    </div>
  );
};

