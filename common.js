import OBR, { isImage, buildImage, buildText } from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.0.0/+esm";
export { OBR, isImage, buildImage, buildText };

export const NS = "com.limbus.status";
export const META = `${NS}/data`;     // { burn: 3, bleed: 2, ... } хранится в метаданных токена (сохраняется в сцене)
export const LOCAL = `${NS}/local`;   // метка локальных значков на токене

const S = (id, ru, group, desc = "") => ({ id, ru, group, desc });
export const STATUSES = [
  S("burn", "Ожог", 0, "В конце раунда получите урон HP, равный стакам Ожога, затем стаки уменьшаются вдвое (округление вниз)."),
  S("frostbite", "Обморожение", 0, "В конце раунда получите урон ST, равный стакам, затем стаки уменьшаются вдвое (округление вниз)."),
  S("bleed", "Кровотечение", 0, "Каждое Действие или Реакция: урон HP, равный стакам, затем стаки уменьшаются вдвое (округление вниз)."),
  S("rupture", "Разрыв", 0, "При попадании атакующий может активировать: урон HP = стакам, затем снять все. В конце раунда снимается."),
  S("tremor", "Тремор", 0, "При попадании атакующий может активировать: урон ST = стакам, затем снять все. В конце раунда снимается."),
  S("sinking", "Погружение", 0, "При попадании атакующий может активировать: урон SP = стакам (при 0 SP — урон HP), затем снять все. В конце раунда снимается."),
  S("poise", "Хладнокровие", 1, "При попадании бросьте D10: если ≤ Poise, можно нанести Критический удар и потерять весь Poise ИЛИ получить 1 Critical и сбросить Poise до 1."),
  S("critical", "Критический", 1, "При Критическом ударе +1D10 урона HP за каждый Critical, затем Critical снимается. Если нет Poise — получите 1 Poise."),
  S("ruin", "Руина", 2), S("devastation", "Разрушение", 2), S("paralysis", "Паралич", 2),
  S("protection", "Защита", 2), S("stagger_protection", "Защита от шатания", 2), S("type_protection", "Защита от типа", 2),
  S("fragile", "Уязвимость", 2), S("stagger_fragile", "Уязвимость к шатанию", 2), S("type_fragile", "Уязвимость к типу", 2),
  S("strength", "Сила", 2), S("feeble", "Слабость", 2), S("endurance", "Стойкость", 2), S("disarm", "Обезоруживание", 2),
  S("haste", "Скорость", 2), S("bind", "Связывание", 2), S("smoke", "Дым", 2),
  S("charge", "Заряд", 2), S("charge_barrier", "Барьер заряда", 2), S("overcharge", "Перезаряд", 2),
  S("mark", "Метка", 2), S("staggered", "Шатание", 2), S("panic", "Паника", 2), S("defeated", "Повержен", 2),
];
export const GROUPS = ["Накопительные (урон)", "Poise и Critical", "Прочие эффекты"];
export const iconUrl = (id) => `${location.origin}/icons/${id}.png`;
export const getData = (item) => item.metadata[META] || {};
export const nameOf = (it) => it.text?.plainText || it.name || "Токен";

function write(it, d) {
  Object.keys(d).forEach((k) => !(d[k] > 0) && delete d[k]);
  if (Object.keys(d).length) it.metadata[META] = d; else delete it.metadata[META];
}

export async function setCount(itemId, key, n) {
  n = Math.max(0, Math.floor(Number(n)) || 0);
  await OBR.scene.items.updateItems([itemId], ([it]) => write(it, { ...getData(it), [key]: n }));
}

export async function clearToken(itemId) {
  await OBR.scene.items.updateItems([itemId], ([it]) => delete it.metadata[META]);
}

// Кровотечение: вызывается на каждое Действие/Реакцию
export async function bleedTick(itemId) {
  let dmg = 0, name = "";
  await OBR.scene.items.updateItems([itemId], ([it]) => {
    const d = { ...getData(it) }; dmg = d.bleed || 0; name = nameOf(it);
    d.bleed = Math.floor(dmg / 2); write(it, d);
  });
  OBR.notification.show(dmg ? `${name}: Кровотечение — ${dmg} HP урона` : `${name}: нет Кровотечения`, dmg ? "WARNING" : "DEFAULT");
}

// Конец раунда: Ожог/Обморожение — урон и деление пополам; Разрыв/Тремор/Погружение — снимаются
export async function endRound() {
  const items = await OBR.scene.items.getItems((i) => !!i.metadata[META]);
  const report = [];
  await OBR.scene.items.updateItems(items.map((i) => i.id), (drafts) => {
    for (const it of drafts) {
      const d = { ...getData(it) }; let hp = 0, st = 0;
      if (d.burn) { hp = d.burn; d.burn = Math.floor(d.burn / 2); }
      if (d.frostbite) { st = d.frostbite; d.frostbite = Math.floor(d.frostbite / 2); }
      delete d.rupture; delete d.tremor; delete d.sinking;
      write(it, d);
      if (hp || st) report.push(`${nameOf(it)}: ${hp ? hp + " HP" : ""}${hp && st ? ", " : ""}${st ? st + " ST" : ""}`);
    }
  });
  OBR.notification.show(report.length ? "Конец раунда — " + report.join(" | ") : "Конец раунда: урона от статусов нет", report.length ? "WARNING" : "DEFAULT");
}

export async function endCombat() {
  const items = await OBR.scene.items.getItems((i) => !!i.metadata[META]);
  await OBR.scene.items.updateItems(items.map((i) => i.id), (d) => d.forEach((it) => delete it.metadata[META]));
}
