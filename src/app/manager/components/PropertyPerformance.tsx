"use client";

import { useEffect, useState } from "react";

interface Property {
  id: string;
  address: string;
  units: number;
  occupancyRate: number;
  monthlyRent: number;
  activeLeases: number;
  upcomingVacancies: number;
}

export const PropertyPerformance = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    setProperties([
      {
        id: "1",
        address: "123 Main St, Apt 201",
        units: 4,
        occupancyRate: 100,
        monthlyRent: 4800,
        activeLeases: 4,
        upcomingVacancies: 0,
      },
      {
        id: "2",
        address: "456 Oak Ave, Unit B",
        units: 8,
        occupancyRate: 87.5,
        monthlyRent: 9600,
        activeLeases: 7,
        upcomingVacancies: 1,
      },
      {
        id: "3",
        address: "789 Pine Blvd",
        units: 6,
        occupancyRate: 83.3,
        monthlyRent: 7200,
        activeLeases: 5,
        upcomingVacancies: 1,
      },
    ]);
    setLoading(false);
  }, []);

  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0);
  const occupiedUnits = properties.reduce((sum, p) => sum + p.activeLeases, 0);
  const overallOccupancy = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const totalMonthlyRent = properties.reduce((sum, p) => sum + p.monthlyRent, 0);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-[#1E4E6B]">Property Performance</h2>
        <p className="text-[#64748b] mt-4">Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-[#1E4E6B]">Property Performance</h2>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1E4E6B] to-[#2a6a8d] p-4 rounded-xl text-white">
          <p className="text-sm opacity-90 font-medium">Total Properties</p>
          <p className="text-3xl font-bold">{properties.length}</p>
        </div>
        <div className="bg-gradient-to-br from-[#A4C639] to-[#8fb526] p-4 rounded-xl text-white">
          <p className="text-sm opacity-90 font-medium">Total Units</p>
          <p className="text-3xl font-bold">{totalUnits}</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f4f8] to-[#e8f2f6] p-4 rounded-xl">
          <p className="text-sm text-[#64748b] font-medium">Overall Occupancy</p>
          <p className="text-3xl font-bold text-[#1E4E6B]">{overallOccupancy.toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-[#f0f4f8] to-[#e8f2f6] p-4 rounded-xl">
          <p className="text-sm text-[#64748b] font-medium">Monthly Revenue</p>
          <p className="text-3xl font-bold text-[#1E4E6B]">${totalMonthlyRent.toLocaleString()}</p>
        </div>
      </div>

      {/* Property List */}
      <div className="space-y-3">
        {properties.map((property) => (
          <div
            key={property.id}
            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-[#1E4E6B] text-lg">{property.address}</h3>
                <p className="text-sm text-[#64748b] mt-1">
                  {property.units} units • {property.activeLeases} active leases
                  {property.upcomingVacancies > 0 && (
                    <span className="ml-2 text-orange-600 font-medium">
                      • {property.upcomingVacancies} upcoming vacancy
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#64748b]">Monthly Rent</p>
                <p className="text-xl font-bold text-[#1E4E6B]">${property.monthlyRent.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Occupancy Bar */}
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#64748b]">Occupancy Rate</span>
                <span className="text-sm font-semibold text-[#1E4E6B]">{property.occupancyRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    property.occupancyRate >= 95 ? "bg-[#A4C639]" : property.occupancyRate >= 85 ? "bg-yellow-500" : "bg-orange-500"
                  }`}
                  style={{ width: `${property.occupancyRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

