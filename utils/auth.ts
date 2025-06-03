// utils/auth.ts
import { supabase } from './supabaseClient';
import { save } from './secureStore';

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const { user } = data;
  await save('user_email', user.email ?? '');
  await save('user_id', user.id);

  return user;
};


export const signUpUser = async (email: string, password: string, fullName: string) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
    },
  });

  if (authError) throw authError;

  if (authData.user) {
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          user_id: authData.user.id,
          name: fullName,
          email,
          created_at: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error('Insert error:', insertError.message);
      throw new Error('Account created, but failed to save user info. Please contact support.');
    }
  }

  return authData.user;
};