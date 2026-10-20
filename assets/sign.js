/* Signature widget (draw with mouse / finger, or type your name) + document renderer.
   Shared by /join and /members. */
(function(){
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  var FONT = '"Amatic SC", "Segoe Script", "Brush Script MT", cursive';
  (function(){
    if (document.getElementById("tb-sign-font")) return;
    var l = document.createElement("link"); l.id = "tb-sign-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap";
    document.head.appendChild(l);
    var st = document.createElement("style");
    st.textContent = '.tbs{display:grid;gap:8px}.tbs-modes{display:flex;gap:6px}.tbs-modes button{border:1px solid #DCDCE6;background:#fff;border-radius:999px;padding:6px 14px;font:inherit;font-size:.9rem;cursor:pointer;color:#1A1C2C}.tbs-modes button[aria-pressed=true]{background:#1A1C2C;color:#fff;border-color:#1A1C2C}.tbs canvas{display:block;width:100%;height:170px;border:1.5px dashed #B9B9CC;border-radius:16px;background:#FCFCFE;touch-action:none;cursor:crosshair;-webkit-user-select:none;user-select:none}.tbs-typed{display:grid;gap:8px}.tbs-typed input{width:100%;font:inherit;border:1px solid #DCDCE6;border-radius:12px;padding:11px 13px}.tbs-prev{height:120px;border:1.5px dashed #B9B9CC;border-radius:16px;background:#FCFCFE;display:grid;place-items:center;font-family:' + FONT.replace(/"/g, "'") + ';font-weight:700;font-size:3.2rem;color:#1A1C2C;overflow:hidden;white-space:nowrap;padding:0 12px}.tbs-hint{font-size:.82rem;color:#565A70;display:flex;justify-content:space-between;gap:8px;align-items:center}.tbs-hint button{background:none;border:0;color:#4A3FB8;text-decoration:underline;cursor:pointer;font:inherit;font-size:.85rem;padding:0}';
    document.head.appendChild(st);
  })();

  function mount(host, opts){
    opts = opts || {};
    host.innerHTML = '<div class="tbs"><div class="tbs-modes" role="group" aria-label="אופן החתימה"><button type="button" data-m="draw" aria-pressed="true">ציור חתימה</button><button type="button" data-m="type" aria-pressed="false">חתימה מוקלדת</button></div>' +
      '<div class="tbs-draw"><canvas aria-label="אזור החתימה: ציירו עם העכבר או עם האצבע"></canvas><div class="tbs-hint"><span>ציירו את החתימה עם העכבר או עם האצבע</span><button type="button" class="tbs-clear">ניקוי</button></div></div>' +
      '<div class="tbs-typed" hidden><input type="text" class="tbs-name" placeholder="השם המלא שלך" autocomplete="name"><div class="tbs-prev" aria-hidden="true"></div><div class="tbs-hint"><span>החתימה נוצרת מהשם שהקלדת</span></div></div></div>';
    var mode = "draw", canvas = host.querySelector("canvas"), ctx = canvas.getContext("2d"), drawing = false, dirty = false, last = null, strokes = [];
    var nameIn = host.querySelector(".tbs-name"), prev = host.querySelector(".tbs-prev");
    function setup(){
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1A1C2C";
      strokes.forEach(function(s){ ctx.beginPath(); s.forEach(function(p, i){ i ? ctx.lineTo(p.x * r.width, p.y * r.height) : ctx.moveTo(p.x * r.width, p.y * r.height); }); ctx.stroke(); });
    }
    if (window.ResizeObserver) new ResizeObserver(setup).observe(canvas); else window.addEventListener("resize", setup);
    setup();
    function pos(e){ var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height }; }
    canvas.addEventListener("pointerdown", function(e){
      if (!canvas.width) setup();
      drawing = true; last = pos(e); strokes.push([{ x: last.x, y: last.y }]);
      try { canvas.setPointerCapture(e.pointerId); } catch(err){}
      ctx.beginPath(); ctx.arc(last.x * last.w, last.y * last.h, 1.2, 0, Math.PI * 2); ctx.fillStyle = "#1A1C2C"; ctx.fill();
      dirty = true; e.preventDefault();
    });
    canvas.addEventListener("pointermove", function(e){
      if (!drawing) return;
      var p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x * p.w, last.y * p.h); ctx.lineTo(p.x * p.w, p.y * p.h); ctx.stroke();
      strokes[strokes.length - 1].push({ x: p.x, y: p.y }); last = p; dirty = true; e.preventDefault();
    });
    ["pointerup","pointercancel"].forEach(function(t){ canvas.addEventListener(t, function(){ drawing = false; }); });
    canvas.addEventListener("touchmove", function(e){ if (drawing) e.preventDefault(); }, { passive: false });
    host.querySelector(".tbs-clear").addEventListener("click", function(){ strokes = []; dirty = false; ctx.clearRect(0, 0, canvas.width, canvas.height); });
    function updatePrev(){ prev.textContent = nameIn.value.trim(); }
    nameIn.addEventListener("input", updatePrev);
    host.querySelectorAll(".tbs-modes button").forEach(function(b){
      b.addEventListener("click", function(){
        mode = b.dataset.m;
        host.querySelectorAll(".tbs-modes button").forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        host.querySelector(".tbs-draw").hidden = mode !== "draw";
        host.querySelector(".tbs-typed").hidden = mode !== "type";
        if (mode === "type") { if (!nameIn.value && opts.nameInput) nameIn.value = opts.nameInput.value; updatePrev(); nameIn.focus(); }
        else setTimeout(setup, 0);
      });
    });
    if (opts.nameInput) opts.nameInput.addEventListener("input", function(){ if (!nameIn.dataset.touched) { nameIn.value = opts.nameInput.value; updatePrev(); } });
    nameIn.addEventListener("keydown", function(){ nameIn.dataset.touched = "1"; });
    // Default to typed signature on a computer with a mouse? Keep drawing as default everywhere; typed is one tap away.
    return {
      mode: function(){ return mode; },
      empty: function(){ return mode === "draw" ? !dirty : nameIn.value.trim().length < 2; },
      data: function(){
        var out = document.createElement("canvas"); out.width = 700; out.height = 200;
        var x = out.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 700, 200);
        if (mode === "draw") {
          x.lineWidth = 3.4; x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = "#1A1C2C";
          strokes.forEach(function(s){ x.beginPath(); s.forEach(function(p, i){ i ? x.lineTo(p.x * 700, p.y * 200) : x.moveTo(p.x * 700, p.y * 200); }); if (s.length === 1) x.lineTo(s[0].x * 700 + 1, s[0].y * 200 + 1); x.stroke(); });
          return Promise.resolve(out.toDataURL("image/png"));
        }
        var text = nameIn.value.trim();
        var ready = document.fonts && document.fonts.load ? document.fonts.load('700 80px "Amatic SC"', text).catch(function(){}) : Promise.resolve();
        return ready.then(function(){
          var size = 96; x.fillStyle = "#1A1C2C"; x.textAlign = "center"; x.textBaseline = "middle"; x.direction = "rtl";
          do { x.font = "700 " + size + "px " + FONT; size -= 4; } while (x.measureText(text).width > 640 && size > 30);
          x.fillText(text, 350, 108);
          return out.toDataURL("image/png");
        });
      },
      typedName: function(){ return nameIn.value.trim(); }
    };
  }
  function docHtml(doc){
    return '<h2 class="doc-title">' + esc(doc.title) + '</h2><p class="doc-ver">גרסה ' + esc(doc.version) + '</p>' +
      doc.sections.map(function(s, i){ return '<h3>' + (i + 1) + '. ' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p>'; }).join("");
  }
  window.TBSign = { mount: mount, docHtml: docHtml, esc: esc };
})();
