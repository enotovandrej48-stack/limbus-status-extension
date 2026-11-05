import { OBR, isImage, buildImage, buildText, NS, META, LOCAL, STATUSES, iconUrl, getData } from "./common.js";

OBR.onReady(() => {
  // Кнопка «Статусы» в меню токена
  OBR.contextMenu.create({
    id: `${NS}/menu`,
    icons: [{
      icon: iconUrl("burn"),
      label: "Статусы",
      filter: { max: 1, every: [{ key: "layer", value: "CHARACTER", coordinator: "||" }, { key: "layer", value: "MOUNT", coordinator: "||" }, { key: "layer", value: "PROP" }] },
    }],
    onClick(ctx, elementId) {
      OBR.popover.open({
        id: `${NS}/popover`,
        url: `/popover.html?id=${ctx.items[0].id}`,
        width: 400, height: 580,
        anchorElementId: elementId,
      });
    },
  });

  // Блок значков под токеном (локально у каждого игрока, данные берутся из метаданных токена)
  let sig = "", timer;
  const schedule = (items) => { clearTimeout(timer); timer = setTimeout(() => render(items), 60); };

  async function render(items) {
    if (!(await OBR.scene.isReady())) return;
    const dpi = await OBR.scene.grid.getDpi();
    const tokens = items.filter((i) => isImage(i) && Object.keys(getData(i)).length);
    const next = JSON.stringify(tokens.map((t) => [t.id, getData(t), Math.round(t.image.width * t.scale.x), t.layer]));
    if (next === sig) return;
    sig = next;

    const old = await OBR.scene.local.getItems((i) => !!i.metadata[LOCAL]);
    if (old.length) await OBR.scene.local.deleteItems(old.map((i) => i.id));

    const px = dpi * 0.34, out = [];
    for (const t of tokens) {
      const list = STATUSES.filter((s) => getData(t)[s.id] > 0);
      const w = (t.image.width * t.scale.x * dpi) / t.grid.dpi;
      const h = (t.image.height * t.scale.y * dpi) / t.grid.dpi;
      const perRow = Math.max(3, Math.floor(w / px));
      list.forEach((s, i) => {
        const row = Math.floor(i / perRow), inRow = Math.min(perRow, list.length - row * perRow), col = i % perRow;
        const cx = t.position.x - (inRow * px) / 2 + px / 2 + col * px;
        const cy = t.position.y + h / 2 + px * 0.55 + row * px;
        const base = (b) => b.layer("ATTACHMENT").attachedTo(t.id).disableHit(true).locked(true).metadata({ [LOCAL]: true });
        out.push(base(buildImage({ width: 128, height: 128, url: iconUrl(s.id), mime: "image/png" }, { dpi: 128 / 0.34, offset: { x: 64, y: 64 } }).position({ x: cx, y: cy })).build());
        const tw = px * 0.55, th = px * 0.45;
        out.push(base(buildText().textType("PLAIN").plainText(String(getData(t)[s.id])).width(tw).height(th).padding(0)
          .fontSize(px * 0.4).fontWeight(800).textAlign("CENTER").textAlignVertical("MIDDLE")
          .fillColor("#ffffff").strokeColor("#000000").strokeWidth(4)
          .position({ x: cx + px / 2 - tw + px * 0.06, y: cy + px / 2 - th + px * 0.06 })).build());
      });
    }
    if (out.length) await OBR.scene.local.addItems(out);
  }

  OBR.scene.items.onChange(schedule);
  OBR.scene.onReadyChange(async (ready) => { sig = ""; if (ready) schedule(await OBR.scene.items.getItems()); });
  OBR.scene.isReady().then(async (r) => { if (r) schedule(await OBR.scene.items.getItems()); });
});
