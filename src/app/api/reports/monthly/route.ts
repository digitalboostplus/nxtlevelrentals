import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function GET() {
  try {
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Fetch expenses for current month
    const expensesRef = collection(db, "expenses");
    const q = query(
      expensesRef,
      where("date", ">=", startOfMonth.toISOString()),
      where("date", "<=", endOfMonth.toISOString())
    );
    const snapshot = await getDocs(q);
    
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp: any) => sum + Number(exp.amount || 0), 0);
    
    // Mock income data (replace with actual data)
    const estimatedIncome = 23500;
    const netProfit = estimatedIncome - totalExpenses;

    // Generate CSV
    const csvRows = [
      ["NXTLevel Rental Manager - Monthly Financial Report"],
      [`Report Period: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`],
      [""],
      ["SUMMARY"],
      ["Total Income", `$${estimatedIncome.toFixed(2)}`],
      ["Total Expenses", `$${totalExpenses.toFixed(2)}`],
      ["Net Profit", `$${netProfit.toFixed(2)}`],
      [""],
      ["EXPENSE DETAILS"],
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
        "Content-Disposition": `attachment; filename="monthly-report-${now.toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error("Error generating monthly report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

