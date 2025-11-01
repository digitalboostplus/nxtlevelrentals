import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function GET() {
  try {
    // Get year-to-date range
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    // Fetch all expenses for current year
    const expensesRef = collection(db, "expenses");
    const q = query(
      expensesRef,
      where("date", ">=", startOfYear.toISOString()),
      where("date", "<=", endOfYear.toISOString())
    );
    const snapshot = await getDocs(q);
    
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((exp: any) => {
      const cat = exp.category || "Misc";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
    });

    const totalExpenses = expenses.reduce((sum, exp: any) => sum + Number(exp.amount || 0), 0);
    
    // Mock income data (replace with actual data)
    const estimatedMonthlyIncome = 23500;
    const monthsElapsed = now.getMonth() + 1;
    const totalIncome = estimatedMonthlyIncome * monthsElapsed;
    const netProfit = totalIncome - totalExpenses;

    // Generate CSV
    const csvRows = [
      ["NXTLevel Rental Manager - Year-to-Date Financial Report"],
      [`Report Period: ${startOfYear.toLocaleDateString()} - ${now.toLocaleDateString()}`],
      [`Generated: ${now.toLocaleString()}`],
      [""],
      ["ANNUAL SUMMARY"],
      ["Total Income (YTD)", `$${totalIncome.toFixed(2)}`],
      ["Total Expenses (YTD)", `$${totalExpenses.toFixed(2)}`],
      ["Net Profit (YTD)", `$${netProfit.toFixed(2)}`],
      ["Expense-to-Income Ratio", `${((totalExpenses / totalIncome) * 100).toFixed(2)}%`],
      [""],
      ["EXPENSES BY CATEGORY"],
      ["Category", "Total Amount", "Percentage of Total"],
      ...Object.entries(categoryTotals).map(([category, amount]) => [
        category,
        `$${amount.toFixed(2)}`,
        `${((amount / totalExpenses) * 100).toFixed(2)}%`
      ]),
      [""],
      ["DETAILED EXPENSE LOG"],
      ["Date", "Property", "Category", "Vendor", "Description", "Amount"],
      ...expenses.map((exp: any) => [
        new Date(exp.date).toLocaleDateString(),
        exp.property_name || "N/A",
        exp.category || "N/A",
        exp.vendor || "N/A",
        exp.description || "N/A",
        `$${Number(exp.amount || 0).toFixed(2)}`
      ])
    ];

    const csvContent = csvRows.map(row => row.join(",")).join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ytd-report-${now.getFullYear()}.csv"`,
      },
    });

  } catch (error) {
    console.error("Error generating YTD report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

