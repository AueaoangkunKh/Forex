import { supabase } from './supabase.js'

window.register = async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { data, error } = await supabase.auth.signUp({ email, password })

  if(error) return alert(error.message)

  await supabase.from('portfolio').insert([
    { user_id: data.user.id, balance: 0 }
  ])

  alert("Registered! Now login.")
}

window.login = async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if(error) return alert(error.message)

  location = "dashboard.html"
}