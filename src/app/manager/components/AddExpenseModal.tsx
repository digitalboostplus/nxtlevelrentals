"use client";

import { useState } from "react";

interface ExpenseForm {
  category: string;
  description: string;
  amount: string;
  vendor: string;
  property_name: string;
}

export const AddExpenseModal = ({ onAdded }: { onAdded: () => void }) => {
  const [form, setForm] = useState<ExpenseForm>({
    category: "",
    description: "",
    amount: "",
    vendor: "",
    property_name: "",
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setOpen(false);
      setForm({
        category: "",
        description: "",
        amount: "",
        vendor: "",
        property_name: "",
      });
      onAdded();
    } catch (error) {
      console.error("Failed to add expense:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="bg-[#A4C639] hover:bg-[#8fb526] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
        onClick={() => setOpen(true)}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>Add Expense</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-[#1E4E6B]">Add New Expense</h3>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Category *
              </label>
              <select
                required
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#A4C639] focus:border-transparent outline-none"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select Category</option>
                <option>Maintenance</option>
                <option>Utilities</option>
                <option>Insurance</option>
                <option>Taxes</option>
                <option>Misc</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Property Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 123 Main St, Apt 201"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#A4C639] focus:border-transparent outline-none"
                value={form.property_name}
                onChange={(e) => setForm({ ...form, property_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., HVAC repair - replace compressor"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#A4C639] focus:border-transparent outline-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Amount ($) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#A4C639] focus:border-transparent outline-none"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d3748] mb-1">
                Vendor *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., ABC Plumbing Services"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#A4C639] focus:border-transparent outline-none"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-[#64748b] hover:text-[#2d3748] font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#1E4E6B] hover:bg-[#2a6a8d] text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

