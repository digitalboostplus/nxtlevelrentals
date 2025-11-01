"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface MaintenanceStats {
  pending: number;
  inProgress: number;
  completed: number;
  avgResolutionTime: number;
  totalSpendYTD: number;
  topCategories: { name: string; value: number }[];
}

export const MaintenanceOverview = () => {
  const [stats, setStats] = useState<MaintenanceStats>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    avgResolutionTime: 0,
    totalSpendYTD: 0,
    topCategories: [],
  });

  useEffect(() => {
    // Mock data - replace with actual API call
    setStats({
      pending: 5,
      inProgress: 3,
      completed: 42,
      avgResolutionTime: 3.5,
      totalSpendYTD: 12450,
      topCategories: [
        { name: "HVAC", value: 4200 },
        { name: "Plumbing", value: 3800 },
        { name: "Electrical", value: 2450 },
        { name: "Appliances", value: 2000 },
      ],
    });
  }, []);

  const statusData = [
    { name: "Pending", value: stats.pending, color: "#FF5F5F" },
    { name: "In Progress", value: stats.inProgress, color: "#FFA500" },
    { name: "Completed", value: stats.completed, color: "#A4C639" },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-[#1E4E6B]">Maintenance Overview</h2>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-l-4 border-red-500">
          <p className="text-sm text-[#64748b] font-medium">Pending</p>
          <p className="text-3xl font-bold text-red-600">{stats.pending}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-l-4 border-orange-500">
          <p className="text-sm text-[#64748b] font-medium">In Progress</p>
          <p className="text-3xl font-bold text-orange-600">{stats.inProgress}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-l-4 border-[#A4C639]">
          <p className="text-sm text-[#64748b] font-medium">Completed</p>
          <p className="text-3xl font-bold text-[#A4C639]">{stats.completed}</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f4f8] to-[#e8f2f6] p-4 rounded-xl border-l-4 border-[#1E4E6B]">
          <p className="text-sm text-[#64748b] font-medium">Avg. Resolution</p>
          <p className="text-3xl font-bold text-[#1E4E6B]">{stats.avgResolutionTime}d</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div>
          <h3 className="text-lg font-semibold text-[#1E4E6B] mb-3">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories by Spend */}
        <div>
          <h3 className="text-lg font-semibold text-[#1E4E6B] mb-3">Top Categories (YTD)</h3>
          <div className="space-y-2">
            {stats.topCategories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-[#2d3748] font-medium">{cat.name}</span>
                <span className="text-[#1E4E6B] font-bold">${cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-[#64748b] font-medium">Total Maintenance Spend YTD</span>
              <span className="text-xl font-bold text-[#1E4E6B]">${stats.totalSpendYTD.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

