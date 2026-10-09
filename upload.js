/* ===== PREMIUM GLASS BLUE INSTAGRAM SYSTEM ===== */
*{margin:0;padding:0;box-sizing:border-box}
body{
  background: radial-gradient(120% 120% at 0% 0%, #0f172a 0%, #020617 50%, #000000 100%);
  color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

/* 1. TOP GLASS SYSTEM - Notification + Chat */
.top, header{
  position:sticky;top:0;z-index:100;
  display:flex;justify-content:space-between;align-items:center;
  padding:14px 16px;
  background: linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.8) 100%);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border-bottom:1px solid rgba(56,189,248,0.15);
  box-shadow: 0 8px 32px rgba(2,132,199,0.12);
}
.logo, header h1{
  font-weight:900;font-size:26px;letter-spacing:-0.5px;
  background: linear-gradient(90deg,#38bdf8,#818cf8,#c084fc,#e879f9);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter: drop-shadow(0 0 12px rgba(56,189,248,0.4));
}
.glassBtn, header button{
  width:40px;height:40px;border-radius:50%;
  border:1px solid rgba(56,189,248,0.2);
  background: linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.1));
  backdrop-filter: blur(15px);
  color:#e0f2fe;font-size:18px;
  display:flex;align-items:center;justify-content:center;
  box-shadow: 0 4px 16px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.1);
  transition: all 0.3s ease;
}
.glassBtn:active{transform:scale(0.92);background:rgba(56,189,248,0.25)}

/* 2. STORY HORIZONTAL GLASS SYSTEM */
#storyBar,.stories{
  display:flex !important;gap:16px !important;
  padding:14px 12px !important;
  overflow-x:auto !important;scrollbar-width:none;
  background: rgba(2,6,23,0.6) !important;
  backdrop-filter: blur(20px);
  border-bottom:1px solid rgba(56,189,248,0.08);
  white-space:nowrap;
}
#storyBar::-webkit-scrollbar{display:none}
.story,.sItem{
  flex:0 0 68px !important;min-width:68px !important;
  text-align:center;cursor:pointer;
  display:flex !important;flex-direction:column;align-items:center;gap:6px;
}
.ring,.sRing{
  width:68px !important;height:68px !important;border-radius:50% !important;
  padding:3px !important;
  background: linear-gradient(45deg,#38bdf8,#818cf8,#c084fc,#f472b6) !important;
  box-shadow: 0 0 20px rgba(56,189,248,0.3), 0 4px 12px rgba(0,0,0,0.4) !important;
  display:flex !important;align-items:center;justify-content:center;
  transition: transform 0.2s ease;
}
.ring:active,.sRing:active{transform:scale(0.93)}
.ring img,.sRing img{
  width:100% !important;height:100% !important;
  border-radius:50% !important;border:3px solid #020617 !important;
  object-fit:cover !important;background:#0f172a;
}
.sName{color:#bae6fd !important;font-size:11.5px !important;font-weight:500 !important;letter-spacing:0.2px}
.ring.seen,.sRing.seen{background:#1e293b !important;box-shadow:none !important;opacity:0.6}

/* 3. FEED GLASS CARD SYSTEM */
.view{display:none;min-height:100vh;padding-bottom:100px}
.view.active{display:block !important}
.postCard, .post{
  margin:16px;
  background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6));
  backdrop-filter: blur(24px) saturate(160%);
  border:1px solid rgba(56,189,248,0.12);
  border-radius:20px;
  overflow:hidden;
  box-shadow: 0 8px 32px rgba(2,8,23,0.6), 0 0 0 1px rgba(56,189,248,0.05), inset 0 1px 0 rgba(255,255,255,0.06);
}
.postHead{
  padding:14px 16px;display:flex;align-items:center;gap:12px;
  background: rgba(2,6,23,0.4);
}
.postHead img{width:34px;height:34px;border-radius:50%;border:2px solid rgba(56,189,248,0.3)}
.postHead b{font-size:14px;font-weight:600;color:#f0f9ff}
.postCard img.postMedia,.post img{width:100%;display:block;max-height:78vh;object-fit:cover}
.postActions,.actions{
  display:flex;gap:18px;padding:12px 16px;font-size:22px;
  background: rgba(2,6,23,0.3);
}
.postActions span:active{transform:scale(1.2)}

/* 4. PREMIUM BOTTOM GLASS SYSTEM - Exact Instagram */
.bottom, nav.bottom{
  position:fixed;bottom:0;left:0;right:0;z-index:100;
  display:flex;justify-content:space-around;align-items:center;
  padding:10px 0 calc(10px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(2,6,23,0.85) 0%, rgba(15,23,42,0.95) 100%);
  backdrop-filter: blur(40px) saturate(200%);
  -webkit-backdrop-filter: blur(40px) saturate(200%);
  border-top:1px solid rgba(56,189,248,0.12);
  box-shadow: 0 -8px 32px rgba(2,8,23,0.8), 0 0 0 1px rgba(56,189,248,0.05) inset;
}
.bottom button, nav.bottom button{
  width:48px;height:48px;border-radius:14px;border:none;
  background: transparent;color:#64748b;
  font-size:24px;font-weight:400;
  display:flex;align-items:center;justify-content:center;
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
  position:relative;
}
.bottom button.active, nav.bottom button.active{
  background: linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.15));
  color:#e0f2fe;
  border:1px solid rgba(56,189,248,0.25);
  box-shadow: 0 4px 16px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
  transform: translateY(-2px);
}
.bottom button.active::after{
  content:'';position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
  width:4px;height:4px;border-radius:50%;
  background:#38bdf8;box-shadow:0 0 8px #38bdf8;
}

/* 5. SEARCH & OVERLAY GLASS */
.searchBar{
  display:flex;align-items:center;gap:10px;
  margin:12px;padding:12px 16px;
  background: linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.5));
  backdrop-filter: blur(20px);
  border:1px solid rgba(56,189,248,0.1);
  border-radius:16px;
}
#searchInput{background:transparent;border:none;outline:none;color:#e0f2fe;width:100%;font-size:15px}
#searchInput::placeholder{color:#64748b}
#overlay{position:fixed;inset:0;background:rgba(2,6,23,0.6);backdrop-filter:blur(16px);z-index:90;display:none}
#overlay.show{display:block}
#createSheet{
  position:fixed;left:12px;right:12px;bottom:90px;z-index:95;
  background: linear-gradient(180deg, rgba(15,23,42,0.9), rgba(2,6,23,0.95));
  backdrop-filter: blur(40px) saturate(180%);
  border:1px solid rgba(56,189,248,0.15);border-radius:22px;
  padding:8px;display:none;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.05);
}
#createSheet.show{display:block}
.sheetItem{
  padding:18px;border-radius:14px;margin:6px;
  background: linear-gradient(135deg, rgba(56,189,248,0.08), rgba(129,140,248,0.05));
  border:1px solid rgba(56,189,248,0.08);
  color:#e0f2fe;text-align:center;font-weight:600;font-size:15px;
  backdrop-filter: blur(10px);
}
.sheetItem:active{transform:scale(0.98);background:rgba(56,189,248,0.15)}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
.grid3 img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:2px}
