import { db } from "@/lib/firebase";
import { NextResponse } from "next/server";
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

export async function GET() {
  try {
    const expensesRef = collection(db, "expenses");
    const q = query(expensesRef, orderBy("date", "desc"), limit(50));
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map((doc) => ({
      expense_id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const expense = await req.json();
    
    // Validate required fields
    if (!expense.category || !expense.description || !expense.amount || !expense.vendor) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Add expense to Firestore
    const docRef = await addDoc(collection(db, "expenses"), {
      ...expense,
      amount: parseFloat(expense.amount),
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "ok",
      expense_id: docRef.id,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    return NextResponse.json(
      { error: "Failed to add expense" },
      { status: 500 }
    );
  }
}

