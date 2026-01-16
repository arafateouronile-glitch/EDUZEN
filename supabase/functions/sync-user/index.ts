// Edge Function pour synchroniser auth.users vers public.users
// Déclenchée par un webhook Supabase Auth lors de l'inscription d'un utilisateur

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer un client Supabase avec le service role key (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Récupérer les données du webhook
    const { record, type } = await req.json()

    // Vérifier que c'est un événement d'insertion d'utilisateur
    if (type !== 'INSERT' || !record?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid event type or missing user ID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = record.id
    const email = record.email
    const rawUserMetaData = record.raw_user_meta_data || {}
    const createdAt = record.created_at

    // Vérifier si l'utilisateur existe déjà dans public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingUser) {
      console.log(`User ${userId} already exists in public.users`)
      return new Response(
        JSON.stringify({ message: 'User already exists', userId }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer l'utilisateur dans public.users
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: rawUserMetaData.full_name || email,
        role: rawUserMetaData.role || 'user',
        is_active: rawUserMetaData.is_active !== undefined ? rawUserMetaData.is_active : true,
        created_at: createdAt,
        updated_at: new Date().toISOString(),
      })
      .select('id, email, full_name, role')
      .single()

    if (insertError) {
      console.error('Error inserting user:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully synced user ${userId} to public.users`)
    return new Response(
      JSON.stringify({ 
        message: 'User synced successfully', 
        user: newUser 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})





