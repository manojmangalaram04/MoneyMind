const $ = id => document.getElementById(id);
const CATEGORIES = {
  expense:["Food & Dining","Transport","Shopping","Bills & Utilities","Entertainment","Health","Education","Other"],
  income:["Salary","Freelance","Business","Investment","Gift","Other"]
};
const COLORS=["#7158e2","#20b486","#f3b45e","#f18491","#8b9bb4","#54a8d8","#b18bd9","#9ca3af"];
const ICONS={"Food & Dining":"☕","Transport":"↗","Shopping":"◇","Bills & Utilities":"⌂","Entertainment":"♫","Health":"♡","Education":"▤","Other":"✦","Salary":"↙","Freelance":"✎","Business":"▣","Investment":"⌁","Gift":"♧"};
const STORAGE_KEY="moneymind-v1";
const today=new Date();
const dateISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const monthKey=d=>d.slice(0,7);
const defaultData=()=>{
  const y=today.getFullYear(),m=today.getMonth(),date=day=>dateISO(new Date(y,m,day));
  return {transactions:[
    {id:1,name:"Monthly salary",category:"Salary",type:"income",amount:45000,date:date(1),note:""},
    {id:2,name:"Grocery shopping",category:"Food & Dining",type:"expense",amount:2350,date:date(3),note:"Weekly groceries"},
    {id:3,name:"Metro & cab",category:"Transport",type:"expense",amount:850,date:date(5),note:""},
    {id:4,name:"Freelance project",category:"Freelance",type:"income",amount:8500,date:date(8),note:"Website work"},
    {id:5,name:"Online purchase",category:"Shopping",type:"expense",amount:3200,date:date(10),note:""},
    {id:6,name:"Electricity bill",category:"Bills & Utilities",type:"expense",amount:1450,date:date(12),note:""},
    {id:7,name:"Movie night",category:"Entertainment",type:"expense",amount:650,date:date(15),note:""}
  ],budgets:[
    {category:"Food & Dining",limit:6000},{category:"Transport",limit:2500},
    {category:"Shopping",limit:5000},{category:"Bills & Utilities",limit:3000}
  ]};
};
let data;
try{data=JSON.parse(localStorage.getItem(STORAGE_KEY))||defaultData();}catch{data=defaultData();}
let selectedType="expense",selectedMonth=monthKey(dateISO(today)),showAll=false,editingId=null,editingBudgetCategory=null;
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2500);}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function monthTransactions(){return data.transactions.filter(t=>monthKey(t.date)===selectedMonth);}
function totals(){const tx=monthTransactions(),income=tx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),expenses=tx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);return{income,expenses,balance:income-expenses,rate:income?Math.round((income-expenses)/income*100):0};}
function setupMonth(){const select=$("monthFilter"),months=new Set([selectedMonth,...data.transactions.map(t=>monthKey(t.date))]);select.innerHTML=[...months].sort().reverse().map(k=>{const[y,m]=k.split("-").map(Number);return `<option value="${k}">${new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</option>`;}).join("");select.value=selectedMonth;}
function renderSummary(){const t=totals();$("totalBalance").textContent=money(t.balance);$("totalIncome").textContent=money(t.income);$("totalExpenses").textContent=money(t.expenses);$("savingsRate").textContent=`${t.rate}%`;$("balanceTrend").textContent=t.balance>=0?"Positive cash flow":"Expenses exceed income";}
function renderTransactions(){
  const tx=monthTransactions().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),rows=showAll?tx:tx.slice(0,5);
  $("transactionRows").innerHTML=rows.map(t=>`<tr>
    <td><div class="transaction-name"><span class="transaction-icon">${ICONS[t.category]||"✦"}</span>${escapeHTML(t.name)}</div></td>
    <td>${escapeHTML(t.category)}</td><td>${new Date(t.date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</td>
    <td class="${t.type==="income"?"amount-income":"amount-expense"}">${t.type==="income"?"+":"−"}${money(t.amount)}</td>
    <td><div class="row-actions"><button class="row-action" data-edit="${t.id}" aria-label="Edit ${escapeHTML(t.name)}">Edit</button><button class="row-action" data-delete="${t.id}" aria-label="Delete ${escapeHTML(t.name)}">Delete</button></div></td></tr>`).join("");
  $("emptyTransactions").classList.toggle("hidden",tx.length!==0);$("transactionRows").parentElement.classList.toggle("hidden",tx.length===0);
  $("viewAllBtn").textContent=showAll?"Show less ↑":"View all →";
}
function renderSpending(){
  const expenses=monthTransactions().filter(t=>t.type==="expense"),sums={};expenses.forEach(t=>sums[t.category]=(sums[t.category]||0)+t.amount);
  const sorted=Object.entries(sums).sort((a,b)=>b[1]-a[1]),total=expenses.reduce((s,t)=>s+t.amount,0);$("donutTotal").textContent=money(total);
  let cursor=0;const stops=sorted.map(([cat,val],i)=>{const start=cursor;cursor+=total?val/total*100:0;return `${COLORS[i%COLORS.length]} ${start}% ${cursor}%`;});
  $("spendingDonut").style.background=total?`conic-gradient(${stops.join(",")})`:"#e9edf3";
  $("categoryBreakdown").innerHTML=sorted.length?sorted.slice(0,5).map(([cat,val],i)=>`<div class="category-item"><i class="cat-dot" style="background:${COLORS[i%COLORS.length]}"></i><span>${escapeHTML(cat)}</span><strong>${Math.round(val/total*100)}%</strong></div>`).join(""):`<div class="category-item">No expenses yet</div>`;
}
function renderBudgets(){
  const tx=monthTransactions().filter(t=>t.type==="expense");
  $("budgetList").innerHTML=data.budgets.map(b=>{
    const spent=tx.filter(t=>t.category===b.category).reduce((s,t)=>s+t.amount,0),pct=Math.round(spent/b.limit*100);
    return `<div class="budget-item budget-row"><div class="budget-row-top"><span>${escapeHTML(b.category)}</span><div class="budget-tools"><strong>${money(spent)} <span style="font-weight:400;color:#9ca6b5">/ ${money(b.limit)}</span></strong><button data-budget-edit="${escapeHTML(b.category)}" title="Edit budget">✎</button><button data-budget-delete="${escapeHTML(b.category)}" title="Delete budget">×</button></div></div><div class="budget-track"><div class="budget-fill ${pct>100?"over":""}" style="width:${Math.min(pct,100)}%"></div></div><div class="budget-meta"><span>${pct>100?"Over budget":`${pct}% used`}</span><span>${money(Math.max(0,b.limit-spent))} left</span></div></div>`;
  }).join("")||`<p class="subheading">No budgets added yet. Create one to track your spending.</p>`;
}
function renderChart(){
  const canvas=$("cashflowChart"),ctx=canvas.getContext("2d"),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  if(!rect.width||!rect.height)return;canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=rect.height,p={l:35,r:8,t:10,b:10},cw=w-p.l-p.r,ch=h-p.t-p.b;ctx.clearRect(0,0,w,h);
  const[y,m]=selectedMonth.split("-").map(Number),daysInMonth=new Date(y,m,0).getDate(),tx=monthTransactions();
  const income=Array.from({length:daysInMonth},(_,i)=>tx.filter(t=>t.type==="income"&&Number(t.date.slice(8))===i+1).reduce((s,t)=>s+t.amount,0));
  const expense=Array.from({length:daysInMonth},(_,i)=>tx.filter(t=>t.type==="expense"&&Number(t.date.slice(8))===i+1).reduce((s,t)=>s+t.amount,0));
  const max=Math.max(1000,...income,...expense)*1.15;ctx.font="9px DM Sans";ctx.fillStyle="#aab2bf";ctx.strokeStyle="#edf0f5";ctx.lineWidth=1;
  for(let i=0;i<4;i++){const yy=p.t+ch*i/3;ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(w-p.r,yy);ctx.stroke();ctx.fillText(Math.round(max*(1-i/3)).toLocaleString("en-IN"),0,yy+3);}
  const draw=(arr,color)=>{ctx.beginPath();arr.forEach((v,i)=>{const x=p.l+cw*i/Math.max(1,daysInMonth-1),yy=p.t+ch-(v/max)*ch;i?ctx.lineTo(x,yy):ctx.moveTo(x,yy);});ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();arr.forEach((v,i)=>{if(v){const x=p.l+cw*i/Math.max(1,daysInMonth-1),yy=p.t+ch-(v/max)*ch;ctx.beginPath();ctx.arc(x,yy,3,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}});};
  draw(income,"#20b486");draw(expense,"#f08b97");
}
function render(){setupMonth();renderSummary();renderTransactions();renderSpending();renderBudgets();renderChart();}
function openModal(id){$(id).classList.remove("hidden");}
function closeModal(id){$(id).classList.add("hidden");}
function populateCategories(){const cats=CATEGORIES[selectedType];$("transactionCategory").innerHTML=cats.map(c=>`<option>${c}</option>`).join("");}
function setType(type){selectedType=type;document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("selected",b.dataset.type===type));populateCategories();}
function openTransaction(id=null){
  editingId=id;$("transactionForm").reset();setType("expense");$("transactionDate").value=dateISO(today);
  if(id!==null){const t=data.transactions.find(x=>x.id===id);if(!t)return;setType(t.type);$("transactionName").value=t.name;$("transactionAmount").value=t.amount;$("transactionDate").value=t.date;$("transactionCategory").value=t.category;$("transactionNote").value=t.note||"";$("modalTitle").textContent="Edit transaction";}
  else $("modalTitle").textContent="Add transaction";
  openModal("transactionModal");$("transactionName").focus();
}
function openBudget(category=null){
  editingBudgetCategory=category;$("budgetForm").reset();
  if(category){const b=data.budgets.find(x=>x.category===category);$("budgetModalTitle").textContent="Edit monthly budget";$("budgetCategory").value=category;$("budgetLimit").value=b?.limit||"";$("budgetCategory").disabled=true;}
  else{$("budgetModalTitle").textContent="Add a monthly budget";$("budgetCategory").disabled=false;}
  openModal("budgetModal");
}
function exportCSV(){
  const rows=[["Name","Type","Category","Amount (INR)","Date","Note"],...monthTransactions().map(t=>[t.name,t.type,t.category,t.amount,t.date,t.note||""])];
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`moneymind-${selectedMonth}.csv`;a.click();URL.revokeObjectURL(url);toast("CSV export downloaded.");
}
function init(){
  $("todayLabel").textContent=today.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  $("transactionDate").value=dateISO(today);$("budgetCategory").innerHTML=CATEGORIES.expense.map(c=>`<option>${c}</option>`).join("");render();
}
$("monthFilter").addEventListener("change",e=>{selectedMonth=e.target.value;showAll=false;render();});
$("addTransactionTop").addEventListener("click",()=>openTransaction());
$("viewAllBtn").addEventListener("click",()=>{showAll=!showAll;renderTransactions();});
$("exportBtn").addEventListener("click",exportCSV);
document.querySelectorAll(".type-btn").forEach(b=>b.addEventListener("click",()=>setType(b.dataset.type)));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(b=>b.addEventListener("click",e=>{if(e.target===b)closeModal(b.id);}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal-backdrop").forEach(m=>m.classList.add("hidden"));});
$("transactionRows").addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
  if(edit)openTransaction(Number(edit.dataset.edit));
  if(del){const id=Number(del.dataset.delete),t=data.transactions.find(x=>x.id===id);if(t&&confirm(`Delete "${t.name}"? This cannot be undone.`)){data.transactions=data.transactions.filter(x=>x.id!==id);save();render();toast("Transaction deleted.");}}
});
$("transactionForm").addEventListener("submit",e=>{
  e.preventDefault();const amount=Number($("transactionAmount").value),name=$("transactionName").value.trim(),date=$("transactionDate").value;
  if(!name||!date||!Number.isFinite(amount)||amount<=0){toast("Enter a name, date and amount greater than zero.");return;}
  const item={id:editingId??Date.now(),name,category:$("transactionCategory").value,type:selectedType,amount,date,note:$("transactionNote").value.trim()};
  if(editingId!==null)data.transactions=data.transactions.map(t=>t.id===editingId?item:t);else data.transactions.push(item);
  save();selectedMonth=monthKey(date);showAll=false;closeModal("transactionModal");render();toast(editingId!==null?"Transaction updated.":"Transaction added.");editingId=null;
});
$("addBudgetBtn").addEventListener("click",()=>openBudget());
$("manageBudgetBtn").addEventListener("click",()=>openBudget());
$("budgetList").addEventListener("click",e=>{
  const edit=e.target.closest("[data-budget-edit]"),del=e.target.closest("[data-budget-delete]");
  if(edit)openBudget(edit.dataset.budgetEdit);
  if(del){const category=del.dataset.budgetDelete;if(confirm(`Delete the ${category} budget?`)){data.budgets=data.budgets.filter(b=>b.category!==category);save();renderBudgets();toast("Budget deleted.");}}
});
$("budgetForm").addEventListener("submit",e=>{
  e.preventDefault();const category=editingBudgetCategory||$("budgetCategory").value,limit=Number($("budgetLimit").value);
  if(!Number.isFinite(limit)||limit<=0){toast("Enter a budget limit greater than zero.");return;}
  const existing=data.budgets.find(b=>b.category===category);if(existing)existing.limit=limit;else data.budgets.push({category,limit});
  save();closeModal("budgetModal");renderBudgets();$("budgetForm").reset();editingBudgetCategory=null;toast("Budget saved.");
});
$("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("moneymind-dark",document.body.classList.contains("dark"));});
if(localStorage.getItem("moneymind-dark")==="true")document.body.classList.add("dark");
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",()=>{$("sidebar").classList.remove("open");document.querySelectorAll(".nav-link").forEach(n=>n.classList.remove("active"));a.classList.add("active");}));
$("resetDataBtn").addEventListener("click",()=>{if(confirm("Reset all transactions and budgets to the original demo data?")){data=defaultData();selectedMonth=monthKey(dateISO(today));save();render();toast("Demo data restored.");}});
window.addEventListener("resize",renderChart);
init();
