"use strict";

// ===== ค่าคงที่ (แก้สมดุลเกมได้ที่นี่) =====
const SAVE_KEY = "afterzero_save_v1";
const AP_PER_DAY = 3; // จำนวนกิจกรรมต่อวัน
const RES = { food: "อาหาร", water: "น้ำ", wood: "ไม้", stone: "หิน",
  scrap: "เศษเหล็ก", medicine: "ยา", power: "พลังงาน" };
const STAT = { health: "Health พลังชีวิต", hunger: "Hunger ความหิว",
  thirst: "Thirst ความกระหาย", energy: "Energy พลังงาน", radiation: "Radiation รังสี" };
const BAD_HIGH = { hunger: true, thirst: true, radiation: true }; // ค่ายิ่งสูงยิ่งแย่

const PLACES = {
  forest: { name: "ป่าเสื่อมโทรม", risk: "ต่ำ", find: "ไม้ อาหาร น้ำ",
    zombie: 0.12, injury: 0.08, nothing: 0.15, rare: 0.08, rad: 0,
    loot: { wood: [2, 5], food: [1, 3], water: [0, 2] } },
  city: { name: "เมืองร้าง", risk: "กลาง", find: "เศษเหล็ก หิน อาหาร พลังงาน",
    zombie: 0.25, injury: 0.10, nothing: 0.15, rare: 0.12, rad: 3,
    loot: { scrap: [2, 4], stone: [1, 3], food: [0, 2], power: [0, 1] } },
  hospital: { name: "โรงพยาบาลร้าง", risk: "กลางถึงสูง", find: "ยา อาหาร น้ำ",
    zombie: 0.30, injury: 0.08, nothing: 0.12, rare: 0.15, rad: 2,
    loot: { medicine: [1, 3], food: [0, 1], water: [0, 1] } },
  zone: { name: "เขตปนเปื้อนกัมมันตรังสี", risk: "รังสีสูง", find: "พลังงาน เศษเหล็ก หิน",
    zombie: 0.20, injury: 0.10, nothing: 0.10, rare: 0.20, rad: 15,
    loot: { power: [1, 3], scrap: [2, 4], stone: [0, 2] } }
};

const BUILD = {
  base: { name: "ฐานหลัก", desc: "จุดเริ่มต้นของฐาน ต้องสร้างก่อนสิ่งอื่น", cost: { wood: 10, stone: 5 } },
  shelter: { name: "ที่พัก", desc: "พักผ่อนแล้วได้พลังงานและพลังชีวิตเพิ่ม", cost: { wood: 8, scrap: 3 } },
  storage: { name: "คลังเก็บของ", desc: "เพิ่มความจุทรัพยากรต่อชนิด 30 เป็น 60", cost: { wood: 8, stone: 6 } },
  pump: { name: "แหล่งผลิตน้ำ", desc: "ได้น้ำ +3 ทุกวัน", cost: { scrap: 6, stone: 4 } },
  generator: { name: "แหล่งพลังงาน", desc: "ได้พลังงาน +2 ทุกวัน", cost: { scrap: 8, wood: 4 } },
  defense: { name: "แนวป้องกันฐาน", desc: "ลดความเสียหายจากการบุกตอนกลางคืน", cost: { wood: 10, scrap: 6 } }
};

// เนื้อเรื่อง (ตัวอย่างที่ผมเขียนเอง แก้ข้อความได้) ปลดล็อกเมื่อถึงวันและจำนวนเบาะแสที่กำหนด
const STORY = [
  { day: 1, clues: 0, title: "บทที่ 1: ตื่น",
    text: "คุณลืมตาขึ้นกลางซากอาคาร ไม่มีกระเป๋า ไม่มีอาหาร ไม่มีน้ำ\nสิ่งเดียวที่จำได้คือแสงสีขาววาบก่อนทุกอย่างมืดลง\nต้องรอดให้ได้ก่อน แล้วค่อยหาคำตอบ" },
  { day: 3, clues: 1, title: "บทที่ 2: เอกสารเปื้อนเลือด",
    text: "คุณพบแฟ้มเอกสารเก่า มีตราหน่วยงานวิจัยและคำว่า \"โครงการ ZERO\"\nไม่มีใครในเมืองนี้เคยพูดถึงมันเลย" },
  { day: 6, clues: 2, title: "บทที่ 3: คำเตือนที่ถูกเมิน",
    text: "บันทึกชิ้นที่สองระบุว่าการทดลองถูกเร่งให้เสร็จก่อนกำหนด\nมีคำเตือนซ้ำ ๆ ที่ถูกขีดฆ่าทิ้ง" },
  { day: 10, clues: 3, title: "บทที่ 4: รายชื่อ",
    text: "รายชื่อทีมงานโครงการ ชื่อสุดท้ายในลิสต์ทำให้คุณรู้สึกคุ้นอย่างน่ากลัว" },
  { day: 14, clues: 4, title: "บทที่ 5: ความจริง",
    text: "ชิ้นส่วนสุดท้ายประกอบกัน แสงสีขาวไม่ใช่อุบัติเหตุ\nและคุณเป็นหนึ่งในคนที่อยู่ในห้องนั้น\n\nเนื้อเรื่องหลักจบแล้ว แต่การเอาชีวิตรอดยังดำเนินต่อไป" }
];

// ===== ตัวแปรหลัก =====
let S = null;          // สถานะเกมทั้งหมด
let current = null;    // หน้าต่าง popup ที่เปิดอยู่
const queue = [];      // คิว popup
let saveWarned = false;
const $ = id => document.getElementById(id);
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function newState() {
  return { v: 1, day: 1, ap: AP_PER_DAY,
    stats: { health: 100, hunger: 10, thirst: 10, energy: 100, radiation: 0 },
    res: { food: 0, water: 0, wood: 0, stone: 0, scrap: 0, medicine: 0, power: 0 },
    b: { base: false, shelter: false, storage: false, pump: false, generator: false, defense: false },
    story: 0, clues: 0, kills: 0, dead: false, log: [] };
}

// ===== ฟังก์ชันช่วย =====
function cap() { return S.b.storage ? 60 : 30; }
function addRes(k, n) { const before = S.res[k]; S.res[k] = clamp(before + n, 0, cap()); return S.res[k] - before; }
function addStat(k, n) { S.stats[k] = clamp(S.stats[k] + n, 0, 100); }
function log(msg) { S.log.unshift("วันที่ " + S.day + ": " + msg); if (S.log.length > 40) S.log.length = 40; }
function costStr(c) { return Object.keys(c).map(k => RES[k] + " " + c[k]).join(", "); }
function canAfford(c) { return Object.keys(c).every(k => S.res[k] >= c[k]); }
function spend(c) { Object.keys(c).forEach(k => { S.res[k] = Math.max(0, S.res[k] - c[k]); }); }
function locked() { return current !== null || !S || S.dead; }

// สุ่มของจาก loot แล้วใส่เข้ากระเป๋า คืนข้อความสรุป
function gather(loot) {
  const parts = [];
  Object.keys(loot).forEach(k => {
    const n = rnd(loot[k][0], loot[k][1]);
    if (n > 0) { const got = addRes(k, n); if (got > 0) parts.push(RES[k] + " +" + got); }
  });
  return parts.length ? parts.join(", ") : "";
}

// ===== บันทึก / โหลด =====
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function save() {
  if (!S || S.dead) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
  catch (e) { if (!saveWarned) { saveWarned = true; log("เตือน: บันทึกเกมไม่สำเร็จ (เบราว์เซอร์อาจปิดการเก็บข้อมูล)"); } }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || typeof d.day !== "number") return false;
    const base = newState();
    S = Object.assign(base, d, {
      stats: Object.assign(base.stats, d.stats),
      res: Object.assign(base.res, d.res),
      b: Object.assign(base.b, d.b) });
    Object.keys(S.stats).forEach(k => { S.stats[k] = clamp(Number(S.stats[k]) || 0, 0, 100); });
    Object.keys(S.res).forEach(k => { S.res[k] = clamp(Number(S.res[k]) || 0, 0, 60); });
    S.ap = clamp(Number(S.ap) || 0, 0, AP_PER_DAY);
    if (!Array.isArray(S.log)) S.log = [];
    S.dead = false;
    return true;
  } catch (e) { return false; }
}

// ===== Popup =====
function openModal(cfg) { if (current) { queue.push(cfg); return; } setModal(cfg); }
function setModal(cfg) {
  current = cfg;
  $("modalTitle").textContent = cfg.title;
  $("modalBody").textContent = cfg.text || "";
  const box = $("modalBtns");
  box.innerHTML = "";
  cfg.buttons.forEach(b => {
    const el = document.createElement("button");
    el.textContent = b.label;
    el.addEventListener("click", () => {
      if (current !== cfg) return;          // กันกดซ้ำ
      if (b.keep) { if (b.fn) b.fn(); return; }
      closeModal();
      if (b.fn) b.fn();
    });
    box.appendChild(el);
  });
  $("modal").classList.remove("hidden");
}
function closeModal() {
  current = null;
  $("modal").classList.add("hidden");
  if (queue.length) setModal(queue.shift());
}

// ===== แสดงผล / ตรวจสอบสถานะ =====
function render() {
  $("dayInfo").textContent = "วันที่ " + S.day + " | เวลา " + S.ap + "/" + AP_PER_DAY + " | เบาะแส " + S.clues;
  let h = "";
  Object.keys(STAT).forEach(k => {
    const v = Math.round(S.stats[k]);
    const bad = BAD_HIGH[k] ? v >= 70 : v <= 30;
    h += '<div class="stat"><span>' + STAT[k] + '</span><div class="bar"><div class="fill' +
      (bad ? " danger" : "") + '" style="width:' + v + '%"></div></div><b>' + v + "</b></div>";
  });
  $("stats").innerHTML = h;
  let r = "";
  Object.keys(RES).forEach(k => {
    r += '<div class="res">' + RES[k] + "<b>" + S.res[k] + "</b></div>";
  });
  $("resources").innerHTML = r;
  const lg = $("log");
  lg.innerHTML = "";
  S.log.forEach(t => { const d = document.createElement("div"); d.textContent = t; lg.appendChild(d); });
}
function checkStory() {
  while (S.story < STORY.length) {
    const c = STORY[S.story];
    if (S.day >= c.day && S.clues >= c.clues) {
      S.story++;
      log("ปลดล็อกเนื้อเรื่อง: " + c.title);
      openModal({ title: c.title, text: c.text, buttons: [{ label: "ดำเนินต่อ" }] });
    } else break;
  }
}
function commit() {
  if (S.stats.health <= 0 && !S.dead) {
    S.dead = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    log("คุณเสียชีวิต");
    openModal({ title: "จบเกม", text: "คุณรอดชีวิตมาได้ " + S.day + " วัน\nกำจัดซอมบี้ " + S.kills + " ตัว",
      buttons: [{ label: "กลับเมนูหลัก", fn: showMenu }] });
  } else { checkStory(); }
  render();
  save();
}

// ===== การสำรวจ =====
function exploreMenu() {
  if (locked()) return;
  let t = "พลังงานที่ใช้ต่อการสำรวจ 15 และใช้เวลา 1 หน่วย\n";
  const btns = Object.keys(PLACES).map(k => {
    const p = PLACES[k];
    t += "\n" + p.name + "\nความเสี่ยง: " + p.risk + " | พบได้: " + p.find + "\n";
    return { label: p.name, fn: () => doExplore(k) };
  });
  btns.push({ label: "ยกเลิก" });
  openModal({ title: "เลือกพื้นที่สำรวจ", text: t, buttons: btns });
}
function doExplore(key) {
  if (locked()) return;
  const p = PLACES[key];
  if (S.ap < 1) { log("หมดเวลาของวันนี้แล้ว กดพักผ่อนเพื่อจบวัน"); commit(); return; }
  if (S.stats.energy < 15) { log("พลังงานไม่พอที่จะออกสำรวจ ลองพักผ่อน"); commit(); return; }
  S.ap--;
  addStat("energy", -15); addStat("hunger", 3); addStat("thirst", 4);
  if (p.rad) addStat("radiation", p.rad);
  log("ออกสำรวจ" + p.name);
  let t = p.zombie, r = Math.random();
  if (r < t) { encounter(p); }
  else if (r < (t += p.injury)) {
    const d = rnd(5, 12); addStat("health", -d); log("ได้รับบาดเจ็บระหว่างสำรวจ เสียพลังชีวิต " + d);
  } else if (r < (t += p.nothing)) { log("ไม่พบอะไรเลย"); }
  else if (r < (t += p.rare)) { rareFind(); }
  else {
    const txt = gather(p.loot);
    log(txt ? "พบทรัพยากร: " + txt : "พบของแต่กระเป๋าเต็มหรือไม่มีอะไรใช้ได้");
  }
  commit();
}
function rareFind() {
  const r = Math.random();
  if (r < 0.7) { S.clues++; log("พบสิ่งของหายาก: เอกสารปริศนา (เบาะแส +1)"); }
  else if (r < 0.85) { const n = addRes("medicine", 2); log("พบสิ่งของหายาก: ยา +" + n); }
  else { const n = addRes("power", 2); log("พบสิ่งของหายาก: พลังงาน +" + n); }
}
function encounter(p) {
  openModal({ title: "ซอมบี้!", text: "ซอมบี้โผล่ออกมาที่" + p.name + " คุณจะทำอย่างไร",
    buttons: [
      { label: "สู้ (ชนะ 60%)", fn: () => {
        if (Math.random() < 0.6) {
          S.kills++; const n = addRes("scrap", rnd(1, 2));
          log("คุณสู้ชนะ ได้เศษเหล็ก +" + n);
        } else {
          const d = rnd(10, 20); addStat("health", -d); log("คุณสู้แพ้ เสียพลังชีวิต " + d);
        }
        commit(); } },
      { label: "หนี (สำเร็จ 75%)", fn: () => {
        addStat("energy", -5);
        if (Math.random() < 0.75) { log("คุณหนีรอดมาได้"); }
        else { const d = rnd(5, 10); addStat("health", -d); log("หนีไม่พ้น ถูกข่วน เสียพลังชีวิต " + d); }
        commit(); } }
    ] });
}

// ===== ฐาน =====
function baseMenu() {
  if (locked()) return;
  let t = "ความจุทรัพยากรต่อชนิด: " + cap() + "\nการสร้างใช้เวลา 1 หน่วย\n";
  const btns = [];
  if (!S.b.base) {
    t += "\nคุณยังไม่มีฐาน ต้องสร้างฐานหลักก่อน";
    btns.push({ label: "สร้างฐานหลัก (" + costStr(BUILD.base.cost) + ")", fn: () => build("base") });
  } else {
    Object.keys(BUILD).forEach(k => {
      if (k === "base") return;
      const b = BUILD[k];
      if (S.b[k]) { t += "\n[สร้างแล้ว] " + b.name + ": " + b.desc; }
      else {
        t += "\n" + b.name + ": " + b.desc;
        btns.push({ label: "สร้าง" + b.name + " (" + costStr(b.cost) + ")", fn: () => build(k) });
      }
    });
  }
  btns.push({ label: "ปิด" });
  openModal({ title: "จัดการฐาน", text: t, buttons: btns });
}
function build(k) {
  if (locked()) return;
  const b = BUILD[k];
  if (S.b[k]) { log(b.name + " ถูกสร้างไว้แล้ว"); commit(); return; }
  if (k !== "base" && !S.b.base) { log("ต้องสร้างฐานหลักก่อน"); commit(); return; }
  if (S.ap < 1) { log("หมดเวลาของวันนี้แล้ว กดพักผ่อนเพื่อจบวัน"); commit(); return; }
  if (!canAfford(b.cost)) { log("ทรัพยากรไม่พอสร้าง" + b.name + " ต้องใช้ " + costStr(b.cost)); commit(); return; }
  spend(b.cost);
  S.b[k] = true; S.ap--;
  log("สร้าง" + b.name + "สำเร็จ");
  commit();
}

// ===== กระเป๋า =====
function bagModal() {
  const t = "อาหาร " + S.res.food + " | น้ำ " + S.res.water + " | ยา " + S.res.medicine +
    "\n\nกินอาหาร: ความหิว -30\nดื่มน้ำ: ความกระหาย -35\nใช้ยา: พลังชีวิต +30 รังสี -20\n(ไม่เสียเวลา)";
  return { title: "กระเป๋า", text: t, buttons: [
    { label: "กินอาหาร", keep: true, fn: () => useItem("food") },
    { label: "ดื่มน้ำ", keep: true, fn: () => useItem("water") },
    { label: "ใช้ยา", keep: true, fn: () => useItem("medicine") },
    { label: "ปิด" } ] };
}
function bagMenu() { if (locked()) return; openModal(bagModal()); }
function useItem(k) {
  if (S.res[k] < 1) { log("ไม่มี" + RES[k] + "ในกระเป๋า"); }
  else if (k === "food") {
    if (S.stats.hunger <= 0) log("ยังไม่หิว");
    else { S.res.food--; addStat("hunger", -30); log("กินอาหาร"); }
  } else if (k === "water") {
    if (S.stats.thirst <= 0) log("ยังไม่กระหาย");
    else { S.res.water--; addStat("thirst", -35); log("ดื่มน้ำ"); }
  } else if (k === "medicine") {
    if (S.stats.health >= 100 && S.stats.radiation <= 0) log("ตอนนี้ไม่จำเป็นต้องใช้ยา");
    else { S.res.medicine--; addStat("health", 30); addStat("radiation", -20); log("ใช้ยา"); }
  }
  commit();
  if (current) setModal(bagModal());
}

// ===== จบวัน =====
function rest() {
  if (locked()) return;
  const sh = S.b.shelter;
  addStat("energy", sh ? 60 : 40);
  addStat("health", sh ? 10 : 4);
  addStat("hunger", 15); addStat("thirst", 20); addStat("radiation", -2);
  S.day++; S.ap = AP_PER_DAY;
  log("คุณพักผ่อนจนถึงเช้า เข้าสู่วันที่ " + S.day);
  if (S.b.pump) { const n = addRes("water", 3); if (n > 0) log("แหล่งผลิตน้ำให้น้ำ +" + n); }
  if (S.b.generator) { const n = addRes("power", 2); if (n > 0) log("แหล่งพลังงานให้พลังงาน +" + n); }
  if (S.stats.hunger >= 100) { addStat("health", -15); log("หิวจัด! เสียพลังชีวิต 15"); }
  if (S.stats.thirst >= 100) { addStat("health", -20); log("กระหายจัด! เสียพลังชีวิต 20"); }
  if (S.stats.radiation >= 100) { addStat("health", -15); log("รังสีสะสมสูงมาก! เสียพลังชีวิต 15"); }
  else if (S.stats.radiation >= 70) { addStat("health", -5); log("รังสีสะสมสูง เสียพลังชีวิต 5"); }
  if (S.day >= 3 && Math.random() < (S.b.base ? 0.35 : 0.25)) {
    let d;
    if (!S.b.base) d = rnd(10, 20);
    else d = Math.round(rnd(10, 25) * (S.b.defense ? 0.3 : 0.7));
    addStat("health", -d);
    log("ซอมบี้บุกตอนกลางคืน! เสียพลังชีวิต " + d + (S.b.defense ? " (แนวป้องกันช่วยลดความเสียหาย)" : ""));
  }
  if (S.stats.hunger >= 70) log("คุณหิวมาก ควรกินอาหาร");
  if (S.stats.thirst >= 70) log("คุณกระหายมาก ควรดื่มน้ำ");
  if (S.stats.radiation >= 70) log("รังสีสูงอันตราย ควรใช้ยาหรือเลี่ยงเขตปนเปื้อน");
  commit();
}

// ===== เมนู / เริ่มเกม =====
function showMenu() {
  $("game").classList.add("hidden");
  $("menu").classList.remove("hidden");
  $("btnContinue").disabled = !hasSave();
  $("menuMsg").textContent = "";
}
function startGame() {
  $("menu").classList.add("hidden");
  $("game").classList.remove("hidden");
  commit();
}
$("btnNew").addEventListener("click", () => {
  if (hasSave() && !confirm("มีเซฟเดิมอยู่ จะถูกเขียนทับ ต้องการเริ่มใหม่หรือไม่?")) return;
  S = newState();
  log("เกมใหม่เริ่มต้นขึ้น");
  startGame();
});
$("btnContinue").addEventListener("click", () => {
  if (load()) { startGame(); }
  else { $("menuMsg").textContent = "ไม่พบหรืออ่านเซฟไม่ได้ กรุณาเริ่ม New Game"; }
});
$("btnExplore").addEventListener("click", exploreMenu);
$("btnBase").addEventListener("click", baseMenu);
$("btnBag").addEventListener("click", bagMenu);
$("btnRest").addEventListener("click", rest);
$("btnMenu").addEventListener("click", () => { if (current) return; save(); showMenu(); });

showMenu();