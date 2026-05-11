import { createClient } from "@supabase/supabase-js";

// Service role client to bypass RLS for internal auth tasks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createUser({ email, password, username }: any) {
  // 1. Insert into NextAuth users table
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .insert([{ email, name: username }])
    .select()
    .single();

  if (userError) throw userError;

  // 2. Insert into profiles table
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        id: user.id,
        username: username.toLowerCase(),
      },
    ]);

  if (profileError) throw profileError;

  // 3. We would normally store a hashed password here if we had a password field in 'users'
  // But NextAuth Supabase Adapter doesn't include a password field.
  // We'll need to add it or use a separate table for credentials.
  
  return user;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
    
  return data;
}
