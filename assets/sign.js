/* Small signature pad + document renderer shared by /join and /members. */
(function(){
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function pad(canvas){
    var ctx = canvas.getContext("2d"), drawing = false, dirty = false, last = null;
    function size(){
      var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      var img = dirty ? canvas.toDataURL() : null;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1A1C2C";
      if (img) { var i = new Image(); i.onload = function(){ ctx.drawImage(i, 0, 0, r.width, r.height); }; i.src = img; }
    }
    function pos(e){ var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener("pointerdown", function(e){ drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
    canvas.addEventListener("pointermove", function(e){ if (!drawing) return; var p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; dirty = true; e.preventDefault(); });
    ["pointerup","pointercancel","pointerleave"].forEach(function(t){ canvas.addEventListener(t, function(){ drawing = false; }); });
    window.addEventListener("resize", size); size();
    return {
      clear: function(){ ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
      empty: function(){ return !dirty; },
      data: function(){
        var r = canvas.getBoundingClientRect(), c = document.createElement("canvas"), s = Math.min(1, 700 / r.width);
        c.width = Math.round(r.width * s); c.height = Math.round(r.height * s);
        var x = c.getContext("2d"); x.drawImage(canvas, 0, 0, c.width, c.height);
        return c.toDataURL("image/png");
      }
    };
  }
  function docHtml(doc){
    return '<h2 class="doc-title">' + esc(doc.title) + '</h2><p class="doc-ver">גרסה ' + esc(doc.version) + '</p>' +
      doc.sections.map(function(s, i){ return '<h3>' + (i + 1) + '. ' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p>'; }).join("");
  }
  window.TBSign = { pad: pad, docHtml: docHtml, esc: esc };
})();
