"use client";

import { createUser } from "@/lib/db";
import { signIn } from "next-auth/react";

export async function signUpAction(formData: any) {
  const { email, password, username } = formData;
  
  try {
    // In a real app, you'd use a server action (use server)
    // But since we are using client components for the forms, 
    // I'll suggest a fetch to an API route or a direct DB call if possible.
    // For now, I'll create an API route /api/auth/register
    
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Registration failed");
    }

    // Automatically sign in after registration
    return await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
  } catch (error: any) {
    throw error;
  }
}
