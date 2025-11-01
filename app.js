/* Daily Finance Pro — app.js (split file)
 - localStorage key: finance_vip
 - features: add/edit/delete, monthly filtering, charts, export CSV, clear all
*/

const STORAGE_KEY = 'finance_vip';

// DOM
const monthSelect = document.getElementById('monthSelect');
const typeIncome = document.getElementById('typeIncome');
const typeExpense = document.getElementById('typeExpense');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const dateEl = document.getElementById('date');
const noteEl = document.getElementById('note');
const saveBtn = document.getElementById('saveBtn');
const importDemo = document.getElementById('importDemo');
const historyBody = document.querySelector('#historyTbl tbody');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const txCount = document.getElementById('txCount') || null; // optional
const exportBtn = document.getElementById('exportBtn');
const exportBtnBottom = document.getElementById('exportBtnBottom');
const clearBtn = document.getElementById('clearBtn');
const clearBtnTop = document.getElementById('clearBtnTop');
const largestExpenseEl = document.getElementById('largestExpense');
const avgExpenseEl = document.getElementById('avgExpense');
const daysRecordedEl = document.getElementById('daysRecorded');

let currentType = 'income';
let data = [];
let editingId = null;
let sortState = { key: 'date', dir: 'desc' };
let barChart, pieChart;

// init
dateEl.value = new Date().toISOString().slice(0,10);
initMonths();
loadData();
renderAll();
attachEvents();

// --- months dropdown ---
function initMonths(){
  const now = new Date();
  for(let i=0;i<18;i++){
    const dt = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const val = dt.toISOString().slice(0,7);
    const label = dt.toLocaleString('default',{month:'short',year:'numeric'});
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    monthSelect.appendChild(opt);
  }
  monthSelect.value = new Date().toISOString().slice(0,7);
  monthSelect.addEventListener('change', ()=>renderAll());
}

// --- storage ---
function loadData(){ try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ data = []; } }
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// --- helpers ---
function uid(){ return 'id_'+Math.random().toString(36).slice(2,9); }
function fmt(n){ return Number(n).toLocaleString('en-US'); }
function money(n){ const v = Number(n)||0; return v>=0 ? fmt(v) : '-'+fmt(Math.abs(v)); }

// --- type toggle ---
function setType(t){
  currentType = t;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  if(t==='income') typeIncome.classList.add('active'); else typeExpense.classList.add('active');
  // accessibility
  typeIncome.setAttribute('aria-checked', t==='income');
  typeExpense.setAttribute('aria-checked', t==='expense');
}
typeIncome.onclick = ()=>setType('income');
typeExpense.onclick = ()=>setType('expense');

// --- add/update ---
saveBtn.addEventListener('click', ()=>handleSave());
function handleSave(){
  const rawAmt = amountEl.value.toString().replace(/[^0-9.-]/g,'').trim();
  const amt = Number(rawAmt);
  if(!rawAmt || isNaN(amt) || amt <= 0){ alert('ကျေးဇူးပြုပြီး ငွေပမာဏ သတ်မှတ်ပေးပါ။'); amountEl.focus(); return; }
  const tx = {
    id: editingId || uid(),
    type: currentType,
    amount: Math.round(amt),
    category: categoryEl.value || 'Other',
    note: noteEl.value || '',
    date: dateEl.value || new Date().toISOString().slice(0,10),
    createdAt: new Date().toISOString()
  };
  if(editingId){
    data = data.map(d=>d.id===editingId?tx:d);
    editingId = null;
    saveBtn.textContent = 'Save Transaction';
  } else {
    data.unshift(tx);
  }
  saveData();
  clearForm();
  renderAll();
}

// --- clear form ---
function clearForm(){
  amountEl.value = '';
  noteEl.value = '';
  categoryEl.value = 'Salary';
  dateEl.value = new Date().toISOString().slice(0,10);
  setType('income');
}

// --- import demo ---
importDemo.addEventListener('click', ()=>{
  if(!confirm('Load demo data?')) return;
  const demo = [
    {id:uid(),type:'income',amount:300000,category:'Salary',note:'Oct salary',date:formatDateOffset(0)},
    {id:uid(),type:'expense',amount:4500,category:'Food',note:'Breakfast',date:formatDateOffset(0)},
    {id:uid(),type:'expense',amount:12000,category:'Transport',note:'Taxi',date:formatDateOffset(-1)},
    {id:uid(),type:'expense',amount:50000,category:'Rent',note:'Room rent',date:formatDateOffset(-3)},
    {id:uid(),type:'income',amount:50000,category:'Other',note:'Freelance',date:formatDateOffset(-5)},
    {id:uid(),type:'expense',amount:15000,category:'Shopping',note:'Clothes',date:formatDateOffset(-10)},
  ];
  data = demo.concat(data);
  saveData();
  renderAll();
});

function formatDateOffset(days){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }

// --- render all ---
function renderAll(){
  loadData();
  renderHistory();
  renderSummary();
  renderCharts();
}

// --- history rendering + sorting ---
function renderHistory(){
  historyBody.innerHTML = '';
  const selectedMonth = monthSelect.value;
  let filtered = data.filter(tx => tx.date.slice(0,7) === selectedMonth);
  // sorting
  filtered.sort((a,b)=>{
    let v;
    if(sortState.key==='date') v = (sortState.dir==='asc') ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    else if(sortState.key==='amount') v = (sortState.dir==='asc') ? a.amount - b.amount : b.amount - a.amount;
    return v;
  });
  filtered.forEach(tx=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tx.date}</td>
      <td class="${tx.type==='income'?'income':'expense'}">${tx.type.toUpperCase()}</td>
      <td>${tx.category}</td>
      <td>${tx.note || '-'}</td>
      <td style="text-align:right">${tx.type==='expense'?'-':''}${fmt(tx.amount)}</td>
      <td style="text-align:right">
        <button class="action-btn" data-id="${tx.id}" data-action="edit" aria-label="Edit">✏️</button>
        <button class="action-btn" data-id="${tx.id}" data-action="del" aria-label="Delete">🗑️</button>
      </td>`;
    historyBody.appendChild(tr);
  });

  // actions
  historyBody.querySelectorAll('.action-btn').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.id, action = btn.dataset.action;
      if(action==='del'){
        if(!confirm('Delete this transaction?')) return;
        data = data.filter(d=>d.id!==id);
        saveData(); renderAll();
      } else if(action==='edit'){
        const tx = data.find(d=>d.id===id);
        if(!tx) return;
        editingId = tx.id;
        setType(tx.type);
        amountEl.value = tx.amount;
        categoryEl.value = tx.category;
        dateEl.value = tx.date;
        noteEl.value = tx.note;
        saveBtn.textContent = 'Update Transaction';
        window.scrollTo({top:0,behavior:'smooth'});
      }
    }
  });
}

// --- sortable headers ---
document.querySelectorAll('.th-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const key = btn.dataset.sort;
    if(sortState.key===key) sortState.dir = sortState.dir==='asc'?'desc':'asc';
    else { sortState.key = key; sortState.dir = 'desc'; }
    renderHistory();
  });
});

// --- summary ---
function renderSummary(){
  const selectedMonth = monthSelect.value;
  const monthly = data.filter(tx=>tx.date.slice(0,7) === selectedMonth);
  const income = monthly.filter(t=>t.type==='income').reduce((s,t)=>s + t.amount,0);
  const expense = monthly.filter(t=>t.type==='expense').reduce((s,t)=>s + t.amount,0);
  const balance = income - expense;
  totalIncomeEl.textContent = fmt(income);
  totalExpenseEl.textContent = fmt(expense);
  balanceEl.textContent = money(balance);

  const pct = income>0 ? Math.min(100, Math.round((expense/income)*100)) : (expense>0?100:0);
  progressBar.style.width = pct + '%';
  progressText.textContent = pct + '% used';

  // quick stats
  const largestExpense = monthly.filter(t=>t.type==='expense').sort((a,b)=>b.amount-a.amount)[0];
  largestExpenseEl.textContent = largestExpense ? ('-'+fmt(largestExpense.amount)) : '-';
  const days = [...new Set(monthly.map(m=>m.date))].length;
  daysRecordedEl.textContent = days || 0;
  const avg = days ? Math.round(monthly.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)/days) : 0;
  avgExpenseEl.textContent = avg ? fmt(avg) : '-';
}

// --- charts ---
function renderCharts(){
  const selectedMonth = monthSelect.value;
  const monthly = data.filter(tx=>tx.date.slice(0,7) === selectedMonth);
  const [labels, incData, expData] = buildDaySeries(selectedMonth, monthly);

  if(barChart) barChart.destroy();
  const ctx = document.getElementById('barChart');
  barChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: labels,
      datasets:[
        { label:'Income', data: incData, backgroundColor:'#22c55e', stack:'s1' },
        { label:'Expense', data: expData, backgroundColor:'#ef4444', stack:'s1' }
      ]
    },
    options:{
      interaction:{mode:'index',axis:'x'},
      plugins:{legend:{labels:{color:'#e6eef8'}}},
      scales:{ x:{ ticks:{color:'#e6eef8'}}, y:{ ticks:{color:'#e6eef8'}, beginAtZero:true } }
    }
  });

  // pie chart
  const catMap = {};
  monthly.forEach(t => {
    if(!catMap[t.category]) catMap[t.category] = 0;
    if(t.type === 'expense') catMap[t.category] += t.amount;
  });
  const labels2 = Object.keys(catMap);
  const vals2 = labels2.map(k => catMap[k]);
  if(pieChart) pieChart.destroy();
  const ctx2 = document.getElementById('pieChart');
  pieChart = new Chart(ctx2, {
    type:'doughnut',
    data:{ labels: labels2, datasets:[{ data: vals2, backgroundColor: generatePalette(labels2.length) }]},
    options:{ plugins:{legend:{position:'bottom',labels:{color:'#e6eef8'}}} }
  });
}

function buildDaySeries(monthKey, arr){
  const [y,m] = monthKey.split('-').map(Number);
  const days = new Date(y,m,0).getDate();
  const labels = [], inc = [], exp = [];
  for(let d=1;d<=days;d++){ labels.push(String(d)); inc.push(0); exp.push(0); }
  arr.forEach(t=>{
    const day = Number(t.date.slice(8,10));
    if(t.type==='income') inc[day-1] += t.amount;
    else exp[day-1] += t.amount;
  });
  return [labels, inc, exp];
}
function generatePalette(n){ const base = ['#ff7a18','#f97316','#f59e0b','#facc15','#22c55e','#06b6d4','#60a5fa','#7c3aed','#ef4444','#fb7185']; return base.slice(0,n).concat(base).slice(0,n); }

// --- export CSV ---
exportBtn.addEventListener('click', exportCSV);
exportBtnBottom.addEventListener('click', exportCSV);
function exportCSV(){
  const selectedMonth = monthSelect.value;
  const rows = data.filter(tx => tx.date.slice(0,7) === selectedMonth);
  if(rows.length===0){ alert('No data this month'); return; }
  let csv = 'date,type,category,note,amount\n';
  rows.forEach(r => csv += `${r.date},${r.type},${r.category},"${(r.note||'').replace(/"/g,'""')}",${r.amount}\n`);
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `finance_${monthSelect.value}.csv`; a.click();
}

// --- clear all ---
clearBtn.addEventListener('click', clearAll);
clearBtnTop.addEventListener('click', clearAll);
function clearAll(){ if(!confirm('Clear ALL local data? This cannot be undone.')) return; data=[]; saveData(); renderAll(); }

// --- keyboard & amount helpers ---
// allow only digits in amount, arrow up/down to increment, Enter to save
amountEl.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ e.preventDefault(); handleSave(); return; }
  // allow navigation keys and digits
  if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){
    e.preventDefault();
    let cur = Number((amountEl.value.toString().replace(/[^0-9]/g,''))||0);
    const step = e.shiftKey ? 1000 : 100; // shift for larger step
    if(e.key === 'ArrowUp') cur += step; else cur = Math.max(0, cur - step);
    amountEl.value = cur;
  }
  // block letters except control keys
  if(e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey){
    e.preventDefault();
  }
});

// also sanitize on paste
amountEl.addEventListener('paste', (e)=>{
  e.preventDefault();
  const txt = (e.clipboardData||window.clipboardData).getData('text');
  const num = txt.replace(/[^0-9]/g,'');
  amountEl.value = num;
});

// --- event attachments ---
function attachEvents(){
  monthSelect.addEventListener('change', renderAll);
  window.addEventListener('resize', ()=>{ if(barChart) barChart.resize(); if(pieChart) pieChart.resize(); });
}

// --- initial data load and render done earlier ---

// on load ensure charts exist
window.addEventListener('load', ()=>{ renderAll(); });
