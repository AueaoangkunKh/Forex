import { supabase } from './supabase.js'

let trades = []
let balance = 0
let equityChart = null
let currentUser = null
let currentEditId = null
let currentFundAction = null
let tradeIdToDelete = null;

document.addEventListener("DOMContentLoaded", init)

async function init() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    window.location.href = "../index.html"
    return
  }
  currentUser = data.user
  await loadPortfolio()
  await loadTrades()
  renderAll()
}

async function loadPortfolio() {
  const { data } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', currentUser.id)
    .single()

  if (!data) {
    await supabase.from('portfolio').insert([{ user_id: currentUser.id, balance: 0 }])
    balance = 0
  } else {
    balance = Number(data.balance) || 0
  }
}

async function loadTrades() {
  const { data } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true })
  trades = data || []
}

// ================= FUND MODAL LOGIC =================
window.openFundModal = function (action) {
  currentFundAction = action;
  const title = document.getElementById("fundModalTitle");
  const submitBtn = document.getElementById("fundSubmitBtn");
  const modal = document.getElementById("fundModal");

  if (action === 'deposit') {
    title.innerText = "💰 ฝากเงิน (Deposit)";
    submitBtn.className = "success";
  } else {
    title.innerText = "💸 ถอนเงิน (Withdraw)";
    submitBtn.className = "danger";
  }
  modal.classList.add("show");
};

window.closeFundModal = function () {
  document.getElementById("fundModal").classList.remove("show");
  document.getElementById("fundAmount").value = "";
};

window.processFund = async function () {
  const amount = Number(document.getElementById("fundAmount").value);
  if (!amount || amount <= 0) return alert("กรุณาระบุจำนวนเงิน");

  // 1. คำนวณหา Equity ปัจจุบัน (Balance + กำไร/ขาดทุนสะสม)
  const totalPnL = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const currentEquity = balance + totalPnL;

  if (currentFundAction === 'deposit') {
    // การฝากเงิน: เพิ่มเข้าไปใน Balance ปกติ
    balance += amount;
  } else {
    // 2. การถอนเงิน: ตรวจสอบจาก Equity แทน Balance
    if (amount > currentEquity) {
      alert(`ยอดเงินที่ถอนได้ (Equity) ไม่เพียงพอ\nคุณมีเพียง: ${currentEquity.toFixed(2)} USD`);
      return;
    }

    // 3. หักเงินออกจาก Balance (อาจทำให้ Balance ติดลบได้ 
    // เพื่อให้สูตร Balance + PnL = Equity ออกมาถูกต้อง)
    balance -= amount;
  }

  // 4. บันทึกค่า Balance ใหม่ลงใน Supabase
  const { error } = await supabase
    .from('portfolio')
    .update({ balance: balance })
    .eq('user_id', currentUser.id);

  if (error) {
    alert("เกิดข้อผิดพลาด: " + error.message);
  } else {
    closeFundModal();
    // รีเฟรชข้อมูลและแสดงผลใหม่ทันที
    renderAll();
  }
};

async function updateBalance() {
  await supabase.from('portfolio').update({ balance }).eq('user_id', currentUser.id)
}

// ================= TRADE LOGIC =================
window.addTrade = async function () {
  const pair = document.getElementById("pair").value.trim();
  const type = document.getElementById("type").value;
  const result = document.getElementById("result").value;
  const amount = Number(document.getElementById("risk").value);
  const lot = Number(document.getElementById("lot").value); // ดึงค่า Lot

  if (!amount || amount <= 0 || !lot) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  try {
    const pnl = result === "Win" ? amount : -amount;

    const { error } = await supabase.from('trades').insert([{
      user_id: currentUser.id,
      pair: pair,
      type,
      lot: lot,   // บันทึกค่า Lot ลง Database
      risk: amount,
      reward: amount,
      result,
      pnl
    }]);

    if (error) throw error;

    document.getElementById("risk").value = "";
    document.getElementById("lot").value = ""; // ล้างช่อง Lot หลังบันทึก
    await loadTrades();
    renderAll();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

window.deleteTrade = async function (id) {
  if (!confirm("Delete this trade?")) return
  await supabase.from('trades').delete().eq('id', id).eq('user_id', currentUser.id)
  await loadTrades(); renderAll();
}

window.editTrade = function (id) {
  const trade = trades.find(t => t.id === id)
  if (!trade) return
  currentEditId = id
  
  document.getElementById("editPair").value = trade.pair
  document.getElementById("editType").value = trade.type
  document.getElementById("editLot").value = trade.lot || "" // ดึงค่า Lot เดิมมาแสดง
  document.getElementById("editRisk").value = trade.risk
  document.getElementById("editResult").value = trade.result
  
  document.getElementById("editModal").classList.add("show")
}

window.saveEdit = async function() {
    const newType = document.getElementById("editType").value;
    const newLot = Number(document.getElementById("editLot").value); // รับค่า Lot ใหม่
    const newRisk = Number(document.getElementById("editRisk").value);
    const newResult = document.getElementById("editResult").value;
    const newPnl = newResult === "Win" ? newRisk : -newRisk;

    if (!newLot || !newRisk) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    const { error } = await supabase.from('trades')
        .update({
            type: newType,
            lot: newLot,   // อัปเดตค่า Lot ลง Database
            risk: newRisk,
            result: newResult,
            pnl: newPnl
        })
        .eq('id', currentEditId);

    if (error) {
        alert("Error: " + error.message);
    } else {
        closeModal();
        await loadTrades(); 
        renderAll();
    }
};

window.closeModal = () => document.getElementById("editModal").classList.remove("show")

// ================= RENDER =================
function renderAll() {
  renderKPIs(); renderChart(); renderHistory();
}

function renderKPIs() {
  // 1. คำนวณกำไร/ขาดทุนรวม (Total PnL) จากรายการเทรดทั้งหมด
  const totalPnL = trades.reduce((sum, t) => sum + Number(t.pnl), 0);

  // 2. คำนวณ Equity (เงินทุนตั้งต้น + กำไร/ขาดทุนสะสม)
  const equity = balance + totalPnL;

  // 3. คำนวณ Winrate
  const wins = trades.filter(t => t.result === "Win").length;
  const winrate = trades.length ? ((wins / trades.length) * 100).toFixed(1) : 0;

  // 4. แสดงผล Balance: ถ้าติดลบ (จากการถอนกำไร) ให้แสดงเป็น 0.00 เพื่อความสวยงาม
  const balanceElement = document.getElementById("balance");
  balanceElement.innerText = balance < 0 ? "0.00" : balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 5. แสดงผล Equity: ยอดเงินจริงๆ ที่ถอนได้
  const equityElement = document.getElementById("equity");
  equityElement.innerText = equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 6. แสดงผล Total PnL และเปลี่ยนสีตามสถานะ (เขียว = กำไร / แดง = ขาดทุน)
  const pnlElement = document.getElementById("totalPnL");
  pnlElement.innerText = (totalPnL >= 0 ? "+" : "") + totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (totalPnL > 0) {
    pnlElement.style.color = "var(--green)";
  } else if (totalPnL < 0) {
    pnlElement.style.color = "var(--red)";
  } else {
    pnlElement.style.color = "var(--text)";
  }

  // 7. แสดงผล Winrate
  document.getElementById("winrate").innerText = winrate + "%";
}

function renderChart() {
  const ctx = document.getElementById("equityChart")
  let running = balance
  const equityData = trades.map(t => { running += Number(t.pnl); return running })
  if (equityChart) equityChart.destroy()
  equityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: equityData.map((_, i) => i + 1),
      datasets: [{ data: equityData, tension: 0.3, borderColor: '#3b82f6', fill: false }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  })
}

function renderHistory() {
  const tbody = document.querySelector("#historyTable tbody")
  tbody.innerHTML = trades.length ? "" : `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No trades yet</td></tr>`

  // เรียงจากใหม่ไปเก่า
  trades.slice().reverse().forEach(t => {
    const row = document.createElement("tr")
    const pnlClass = t.result === "Win" ? "text-win" : "text-loss"
    const pnlSymbol = t.result === "Win" ? "+" : ""

    row.innerHTML = `
      <td>${t.type}</td>
      <td>${t.lot ? t.lot.toFixed(2) : '-'}</td> <td>${Number(t.risk).toFixed(2)}</td>
      <td><span class="status-badge ${t.result.toLowerCase()}">${t.result}</span></td>
      <td class="${pnlClass}">${pnlSymbol}${Number(t.pnl).toFixed(2)}</td>
      <td>
        <div style="display:flex; gap:5px;">
            <button class="action-btn edit-btn" onclick="editTrade('${t.id}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteTrade('${t.id}')">Delete</button>
        </div>
      </td>`
    tbody.appendChild(row)
  })
}

// เปลี่ยนฟังก์ชัน deleteTrade เดิมเป็นอันนี้
window.deleteTrade = function (id) {
  tradeIdToDelete = id;
  const modal = document.getElementById("deleteModal");
  modal.classList.add("show");

  // ตั้งค่า Event ให้ปุ่มยืนยัน
  document.getElementById("confirmDeleteBtn").onclick = async () => {
    await executeDelete();
  };
}

async function executeDelete() {
  if (!tradeIdToDelete) return;

  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeIdToDelete);

    if (error) throw error;

    closeDeleteModal();
    await loadTrades();
    renderAll();
  } catch (err) {
    alert("Error deleting trade: " + err.message);
  }
}

window.closeDeleteModal = function () {
  document.getElementById("deleteModal").classList.remove("show");
  tradeIdToDelete = null;
}

// ฟังก์ชันเรียก Modal ยืนยันการลบทิ้งทั้งหมด
window.confirmClearAll = function () {
  if (trades.length === 0) return alert("ไม่มีข้อมูลให้ลบ");

  // เราจะใช้โครงสร้าง Modal ลบอันเดิมมาประยุกต์ใช้
  const modal = document.getElementById("deleteModal");
  const modalTitle = modal.querySelector("h3");
  const modalDesc = modal.querySelector("p");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  modalTitle.innerText = "Clear All Trades?";
  modalDesc.innerHTML = "คุณแน่ใจหรือไม่ที่จะลบประวัติการเทรดทั้งหมด?<br><b style='color:var(--red)'>ข้อมูลนี้ไม่สามารถกู้คืนได้</b>";
  modal.classList.add("show");

  confirmBtn.onclick = async () => {
    await executeClearAll();
  };
}

// ฟังก์ชันสั่งลบจริงใน Supabase
async function executeClearAll() {
  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', currentUser.id); // ลบเฉพาะของตัวเอง

    if (error) throw error;

    closeDeleteModal();
    await loadTrades(); // โหลดข้อมูลใหม่ (ซึ่งจะว่างเปล่า)
    renderAll(); // อัปเดตหน้าจอและกราฟ
    alert("ล้างประวัติการเทรดเรียบร้อยแล้ว");
  } catch (err) {
    alert("เกิดข้อผิดพลาด: " + err.message);
  }
}

window.logout = async () => { await supabase.auth.signOut(); window.location.href = "../index.html" }