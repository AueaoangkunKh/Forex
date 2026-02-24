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

// ในไฟล์ auth.js แก้ไขฟังก์ชัน login
window.login = async () => {
  const btn = document.querySelector('.btn-login');
  const originalText = btn.innerText;
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if(!email || !password) return alert("Please fill in all fields");

  // เริ่มอนิเมชั่นตอนโหลด
  btn.innerText = "Connecting...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if(error) {
    btn.innerText = originalText;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "all";
    return alert(error.message);
  }

  // อนิเมชั่นก่อนเปลี่ยนหน้า
  btn.innerText = "Success! Redirecting...";
  setTimeout(() => {
    location = "dashboard.html";
  }, 500);
}
