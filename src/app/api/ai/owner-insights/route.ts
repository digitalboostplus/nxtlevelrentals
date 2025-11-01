import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function GET() {
  try {
    // Fetch recent financial data
    const expensesRef = collection(db, "expenses");
    const snapshot = await getDocs(expensesRef);
    
    const expenses = snapshot.docs.map(doc => doc.data());
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(exp => {
      const cat = exp.category || "Misc";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(exp.amount || 0);
    });
    
    const topCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    // Mock income data (replace with actual data from Firestore)
    const estimatedIncome = 23500;
    
    const data = {
      income: estimatedIncome,
      expenses: totalExpenses,
      topCategories,
      expenseCount: expenses.length,
    };

    // If OpenAI API key is available, use it for AI-generated insights
    if (process.env.OPENAI_API_KEY) {
      const prompt = `You are a financial assistant for a property management company. 
Given the following data, provide a brief (2-3 sentences) summary of the financial health:
- Monthly Income: $${data.income}
- Total Expenses: $${data.expenses}
- Top Expense Categories: ${data.topCategories.join(", ")}
- Number of Expenses: ${data.expenseCount}

Focus on actionable insights and trends.`;

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 150,
          }),
        });

        if (res.ok) {
          const reply = await res.json();
          const summary = reply.choices?.[0]?.message?.content || generateFallbackInsight(data);
          return NextResponse.json({ summary });
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        // Fall through to fallback insight
      }
    }

    // Fallback: Generate rule-based insight
    const summary = generateFallbackInsight(data);
    return NextResponse.json({ summary });

  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json({
      summary: "Your portfolio is performing within normal ranges. Continue monitoring expenses and occupancy rates for optimal performance.",
    });
  }
}

function generateFallbackInsight(data: {
  income: number;
  expenses: number;
  topCategories: string[];
  expenseCount: number;
}): string {
  const netProfit = data.income - data.expenses;
  const expenseRatio = (data.expenses / data.income) * 100;

  let insight = "";

  if (expenseRatio > 50) {
    insight = `Your expense-to-income ratio is ${expenseRatio.toFixed(1)}%, which is higher than ideal. `;
  } else if (expenseRatio < 30) {
    insight = `Excellent financial health! Your expense ratio is only ${expenseRatio.toFixed(1)}%. `;
  } else {
    insight = `Your portfolio is performing well with a ${expenseRatio.toFixed(1)}% expense ratio. `;
  }

  if (data.topCategories.length > 0) {
    insight += `Top expense areas are ${data.topCategories.join(", ")}. `;
  }

  if (netProfit > 0) {
    insight += `You're generating $${netProfit.toLocaleString()} in net profit this period.`;
  } else {
    insight += `Consider reviewing expenses to improve profitability.`;
  }

  return insight;
}

