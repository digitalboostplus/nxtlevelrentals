"use client";

import { useState, useEffect } from "react";

interface Expense {
  expense_id: string;
  date: string;
  property_name: string;
  category: string;
  vendor: string;
  amount: number;
  description: string;
}

export const ExpenseTable = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data) => {
        setExpenses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Maintenance: "bg-orange-100 text-orange-800",
      Utilities: "bg-blue-100 text-blue-800",
      Insurance: "bg-purple-100 text-purple-800",
      Taxes: "bg-red-100 text-red-800",
      Misc: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-xl font-bold text-[#1E4E6B] mb-4">Recent Expenses</h3>
        <p className="text-[#64748b]">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <h3 className="text-xl font-bold text-[#1E4E6B] mb-4">Recent Expenses</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-[#1E4E6B]">
            <tr>
              <th className="text-left py-3 px-2 text-[#1E4E6B] font-semibold">Date</th>
              <th className="text-left py-3 px-2 text-[#1E4E6B] font-semibold">Property</th>
              <th className="text-left py-3 px-2 text-[#1E4E6B] font-semibold">Category</th>
              <th className="text-left py-3 px-2 text-[#1E4E6B] font-semibold">Vendor</th>
              <th className="text-left py-3 px-2 text-[#1E4E6B] font-semibold">Description</th>
              <th className="text-right py-3 px-2 text-[#1E4E6B] font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[#64748b]">
                  No expenses recorded yet. Add your first expense above.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.expense_id} className="border-b border-gray-100 hover:bg-[#f0f4f8] transition-colors">
                  <td className="py-3 px-2 text-[#2d3748]">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-[#2d3748]">{e.property_name}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(e.category)}`}>
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[#2d3748]">{e.vendor}</td>
                  <td className="py-3 px-2 text-[#64748b] text-xs">{e.description}</td>
                  <td className="py-3 px-2 text-right font-semibold text-[#1E4E6B]">${Number(e.amount || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

