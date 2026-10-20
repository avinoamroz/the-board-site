/* En / He switch for the member area and the agreement page.
   Hebrew is the source; English is applied by swapping text in the page (including content rendered later). */
(function(){
  var EN = {
    "אזור החברים · The Board": "Members · The Board", "הסכם הצטרפות · The Board": "Membership agreement · The Board",
    "דילוג לתוכן": "Skip to content", "The Board, לעמוד הבית": "The Board, home page",
    "יציאה": "Sign out", "הבורד שלי": "My board", "הפרופיל שלי": "My profile", "תבניות ופרומפטים": "Templates & prompts", "סודיות": "Confidentiality", "הקהילה": "Community", "בקרוב.": "Coming soon.",
    "אזור החברים": "Members area", "הבורד שלך, האנשים שיושבים איתך ליד השולחן, מועדי המפגשים והתבניות להכנה לכל מפגש.": "Your board, the people at your table, the session dates and the prep templates for every session.",
    "הכניסה עם חשבון Google. אנחנו משתמשים רק בשם, באימייל ובתמונה כדי לזהות אותך.": "Sign in with your Google account. We only use your name, email and photo to identify you.",
    "מדיניות הפרטיות": "Privacy policy", "מדיניות פרטיות": "Privacy policy", "הצהרת נגישות": "Accessibility statement",
    "טוען...": "Loading...", "משהו השתבש בטעינה. נסו שוב בעוד רגע.": "Something went wrong while loading. Please try again in a moment.", "הכניסה לא הצליחה. נסו שוב.": "Sign-in failed. Please try again.",
    "עוד לא מצאנו אותך ברשימת החברים": "We couldn't find you on the members list yet",
    "אזור החברים נפתח אחרי ההצטרפות לבורד או לקהילה. אם כבר הצטרפת, ייתכן שנרשמת אצלנו עם כתובת אימייל אחרת.": "The members area opens once you join a board or the community. If you already joined, you may have registered with a different email address.",
    "למילוי שאלון ההתאמה": "Fill in the fit questionnaire", "לכתוב לנו": "Write to us", "כניסה עם חשבון אחר": "Use another account",
    "מה שקורה בבורד נשאר בבורד.": "What happens on the board stays on the board.",
    "כולנו חתומים על NDA, ושומרים בסוד את הפרטים של החברים ושל החברות שליד השולחן.": "We have all signed an NDA and keep the details of the people and companies at the table confidential.",
    "לחיצה על חבר או חברה בשולחן פותחת את הכרטיס שלהם, עם וואטסאפ וטלפון.": "Tap anyone at the table to open their card, with WhatsApp and phone.",
    "עוד לא שובצת לבורד. ברגע שהבורד שלך ייפתח, תראה כאן את כל מי שיושב איתך ליד השולחן.": "You haven't been seated on a board yet. Once your board opens, you'll see everyone at your table here.",
    "ההצטרפות שלך: עוד כמה צעדים": "Your onboarding: a few more steps", "פרופיל": "Profile", "חברה, טאגליין, עיר וטלפון": "Company, tagline, city and phone",
    "תמונה": "Photo", "תמונת פנים ברורה": "A clear photo of your face", "לוגו": "Logo", "הלוגו של החברה": "Your company logo", "הסכם סודיות": "NDA", "חתימה על ה-NDA": "Sign the NDA",
    "המפגש הבא:": "Next session:", "המפגש הבא": "Next session", "פרטי הבורד": "Board details", "סוג": "Type", "שעות": "Hours", "מיקום": "Location", "תל אביב": "Tel Aviv", "מנחה הבורד": "Head of Board", "חברים בשולחן": "At the table",
    "מועדי המפגשים": "Session dates", "לקבוצת הוואטסאפ של הבורד": "Board WhatsApp group", "כיסא פנוי": "Open seat", "השיבוץ בקרוב": "Seating soon", "החברות שלך": "Your membership",
    "כדי לראות את פרטי הקשר של חברי הבורד ואת קבוצת הוואטסאפ, חותמים על": "To see your board members' contact details and the WhatsApp group, sign the", "הסכם הסודיות": "NDA",
    "בורד": "Board", "אופן בורד": "Open board", "קהילה": "Community", "בורד יסודות": "Foundations board", "בורד ענפי": "Sector board", "פעיל": "Active", "מושהה": "Paused", "הסתיים": "Ended",
    "וואטסאפ": "WhatsApp", "שיחה": "Call", "אתר": "Website", "אינסטגרם": "Instagram", "פייסבוק": "Facebook", "עריכת הכרטיס שלי": "Edit my card", "סגירה": "Close", "(את/ה)": "(you)",
    "מה שממלאים כאן מופיע בכרטיס שלך בבורד. השם, התמונה, החברה, הקישורים והטלפון גלויים לחברי הבורד שלך בלבד.": "What you fill in here appears on your board card. Your name, photo, company, links and phone are visible to your board members only.",
    "עליך": "About you", "שם מלא": "Full name", "מגדר": "Gender", "בחירה": "Select", "אישה": "Woman", "גבר": "Man", "אחר": "Other", "טלפון (לוואטסאפ)": "Phone (for WhatsApp)", "גלוי לחברי הבורד שלך בלבד": "Visible to your board members only", "עיר": "City", "אימייל": "Email",
    "החברה": "Company", "שם החברה": "Company name", "סוג החברה": "Company type", "למשל: אי-קומרס, משרד עורכי דין, סטודיו": "e.g. e-commerce, law firm, studio", "טאגליין": "Tagline", "למשל: אנחנו עוזרים לחברות הייטק לדבר אנגלית בביטחון": "e.g. We help tech companies speak English with confidence",
    "התפקיד שלך": "Your role", "מייסד/ת או בעלים": "Founder or owner", "מנכ״ל/ית": "CEO", "מייסד/ת ומנכ״ל/ית": "Founder & CEO", "שותף/ה": "Partner", "מספר עובדים": "Employees", "מה העסק עושה": "What the business does",
    "ותק העסק": "Years in business", "פחות משנה": "Less than a year", "שנה עד שלוש": "1 to 3 years", "שלוש עד עשר": "3 to 10 years", "יותר מעשר": "More than 10 years",
    "מחזור שנתי": "Annual revenue", "עד ₪1M": "Up to ₪1M", "₪1M עד ₪5M": "₪1M to ₪5M", "₪5M עד ₪20M": "₪5M to ₪20M", "מעל ₪20M": "Over ₪20M", "מעדיף/ה לא לומר": "Prefer not to say", "לא מוצג לחברי הבורד": "Not shown to board members",
    "מטרות": "Goals", "האתגר המרכזי בעסק היום": "The main challenge in the business today", "מטרות אישיות לחצי השנה הקרובה": "Personal goals for the next six months", "מטרות עסקיות לחצי השנה הקרובה": "Business goals for the next six months",
    "שמירה": "Save", "שומר...": "Saving...", "נשמר. תודה!": "Saved. Thank you!", "השמירה לא הצליחה. נסו שוב.": "Saving failed. Please try again.",
    "תמונות": "Images", "תמונת פרופיל": "Profile photo", "העלאת תמונה": "Upload photo", "העלאת לוגו": "Upload logo", "מעלה...": "Uploading...", "התמונה עודכנה.": "Image updated.", "ההעלאה לא הצליחה. נסו תמונה אחרת.": "Upload failed. Try another image.",
    "כברירת מחדל מוצגת תמונת חשבון ה-Google שלך. תמונה ברורה של הפנים עוזרת לכולם להכיר.": "By default we show your Google account photo. A clear photo of your face helps everyone get to know you.",
    "לפני כל מפגש מכינים את חומרי החודש. לכל נושא יש תבנית של מה להביא, ופרומפט מוכן להדבקה ב-Claude שיעזור לך לבנות את זה על העסק שלך.": "Before every session you prepare the month's materials. Each topic has a template of what to bring, and a ready prompt to paste into Claude to build it for your business.",
    "מה להביא": "What to bring", "פרומפט ל-Claude": "Prompt for Claude", "העתקת הפרומפט": "Copy prompt", "הועתק ✓": "Copied ✓", "סמנו והעתיקו ידנית": "Select and copy manually",
    "סבב הפתיחה": "The opening round", "בתחילת כל מפגש, 2 דקות לכל משתתף": "At the start of every session, 2 minutes each",
    "ניצחון אחד מהחודש האחרון (עם מספר, אם יש)": "One win from the past month (with a number, if you have one)", "טעות אחת ומה למדת ממנה": "One mistake and what you learned from it", "תובנה אחת שעלתה לך": "One insight you had", "במה הבורד יכול לעזור לך החודש": "What the board can help you with this month",
    "מבנה החברה ויעדים": "Company structure and goals", "מפגש 1": "Session 1", "מפגש 2": "Session 2", "מפגש 3": "Session 3", "מפגש 4": "Session 4", "מפגש 5": "Session 5", "מפגש 6": "Session 6",
    "תרשים מבנה ארגוני: מי עושה מה (כולל אותך)": "An org chart: who does what (including you)", "3 יעדים לחצי השנה, מדידים, עם תאריך": "3 measurable goals for the next six months, with dates", "המספרים הבסיסיים: מחזור, רווח, מספר לקוחות, מספר עובדים": "The basic numbers: revenue, profit, number of customers, number of employees", "מה תקוע לך היום ולמה": "What's stuck right now and why",
    "שיווק": "Marketing", "מי הלקוח האידיאלי שלך (במשפט אחד)": "Who your ideal customer is (in one sentence)", "מאיפה הגיעו 10 הלקוחות האחרונים": "Where your last 10 customers came from", "כמה עולה לך להשיג לקוח, אם ידוע": "What it costs you to win a customer, if you know", "המשפך: מאיפה מגיעים, מה קורה בדרך, איפה נופלים": "The funnel: where people come from, what happens on the way, where they drop off",
    "מכירות": "Sales", "שלבי תהליך המכירה שלך מליד ועד סגירה": "The steps of your sales process from lead to close", "אחוז סגירה בכל שלב, אם ידוע": "Conversion at each step, if you know", "3 ההתנגדויות שאתה שומע הכי הרבה": "The 3 objections you hear most", "תסריט שיחה נוכחי (אם יש)": "Your current call script (if you have one)",
    "מוצר ושירות": "Product and service", "מה אתה מוכר באמת (התוצאה, לא המוצר)": "What you really sell (the outcome, not the product)", "רשימת המוצרים או השירותים והמחירים": "Your list of products or services and prices", "מה הלקוחות הכי מרוצים אומרים": "What your happiest customers say", "מה הכי רווחי ומה הכי מתיש": "What is most profitable and what is most draining",
    "כספים, תמחור ותזרים": "Finance, pricing and cash flow", "דוח רווח והפסד של 6 החודשים האחרונים": "A P&L for the last 6 months", "תזרים צפוי ל-3 החודשים הבאים": "Expected cash flow for the next 3 months", "עלויות קבועות ומשתנות": "Fixed and variable costs", "איך נקבע המחיר שלך היום": "How your price is set today",
    "אנשים, תפעול ותוכנית שנתית": "People, operations and the annual plan", "מי בצוות, מה התפקיד ומה עובד או לא": "Who's on the team, their roles, and what works or doesn't", "3 תהליכים שחוזרים על עצמם ואפשר לאוטמט": "3 repeating processes you could automate", "ספקים ושותפים מרכזיים": "Key suppliers and partners", "טיוטת יעדים לשנה הבאה": "Draft goals for next year",
    "הכיסא החם": "The hot seat", "כשאת/ה מביא/ה אתגר לשולחן": "When you bring a challenge to the table", "האתגר במשפט אחד": "The challenge in one sentence", "רקע קצר: מה כבר ניסית": "Short background: what you already tried", "המספרים הרלוונטיים": "The relevant numbers", "מה בדיוק את/ה רוצה מהבורד: רעיונות, החלטה, או חיבור לאדם": "What exactly you want from the board: ideas, a decision, or an introduction",
    "הסכם סודיות (NDA)": "Confidentiality agreement (NDA)", "מה שקורה בבורד נשאר בבורד. כל חברי The Board חותמים על ההסכם הזה לפני שהם רואים את פרטי החברים האחרים.": "What happens on the board stays on the board. Every The Board member signs this before seeing the other members' details.",
    "מספר ת״ז": "ID number", "חתימה": "Signature", "קראתי את הסכם הסודיות ואני מתחייב/ת לשמור על סודיות כל המידע על חברי הבורד והעסקים שלהם": "I have read the NDA and commit to keeping all information about the board members and their businesses confidential",
    "חתימה על הסכם הסודיות": "Sign the NDA", "חתמת על הסכם הסודיות ✓": "You signed the NDA ✓", "נא למלא שם מלא.": "Please enter your full name.", "נא לחתום באזור החתימה.": "Please sign in the signature box.", "נא להקליד את השם לחתימה.": "Please type your name to sign.", "יש לאשר את ההתחייבות לסודיות.": "Please confirm the confidentiality commitment.", "החתימה לא נשמרה. נסו שוב.": "The signature wasn't saved. Please try again.",
    "תודה ששומרים יחד על השולחן. מה שקורה בבורד נשאר בבורד: לא מעבירים הלאה מספרים, לקוחות, תוכניות או פרטי קשר של חברים אחרים.": "Thank you for protecting the table together. What happens on the board stays on the board: we never pass on other members' numbers, customers, plans or contact details.",
    "ציור חתימה": "Draw", "חתימה מוקלדת": "Type", "אופן החתימה": "Signature method", "ציירו את החתימה עם העכבר או עם האצבע": "Draw your signature with the mouse or your finger", "אזור החתימה: ציירו עם העכבר או עם האצבע": "Signature box: draw with the mouse or your finger", "ניקוי": "Clear", "השם המלא שלך": "Your full name", "החתימה נוצרת מהשם שהקלדת": "The signature is created from the name you typed",
    "טוען את ההסכם...": "Loading the agreement...", "הקישור לא תקין": "This link isn't valid", "ייתכן שהקישור פג או הועתק חלקית. כתבו לנו ל-": "The link may have expired or been copied partially. Write to us at", "ונשלח קישור חדש.": "and we'll send a new one.",
    "ההסכם נחתם ✓": "Agreement signed ✓", "הסכם הצטרפות": "Membership agreement", "הסכם ההצטרפות שלך": "Your membership agreement", "קוראים את ההסכם, ממלאים פרטים וחותמים. החתימה נשמרת יחד עם התאריך, השעה ופרטי החותם.": "Read the agreement, fill in your details and sign. The signature is saved together with the date, time and signer details.",
    "פרטי החותם": "Signer details", "קראתי את ההסכם ואני מסכים/ה לכל תנאיו, כולל ההתחייבות לסודיות": "I have read the agreement and accept all its terms, including the confidentiality commitment", "חתימה על ההסכם": "Sign the agreement", "שומר את החתימה...": "Saving your signature...", "יש לאשר שקראת את ההסכם.": "Please confirm you have read the agreement.",
    "גם התשלום התקבל.": "Payment has been received too.", "נשלח אליך מייל עם הכניסה לאזור החברים.": "We've emailed you the sign-in to the members area.", "לאזור החברים": "Go to the members area", "לתשלום": "Pay now",
    "השלב הבא: תשלום. אחרי התשלום תקבל/י חשבונית מס במייל ואת פרטי הכניסה לאזור החברים.": "Next step: payment. After paying you'll get a tax invoice by email and your sign-in to the members area.",
    "השלב הבא: תשלום. קישור לתשלום יישלח אליך בקרוב, ואחריו חשבונית מס ופרטי הכניסה לאזור החברים.": "Next step: payment. A payment link will be sent to you shortly, followed by a tax invoice and your sign-in to the members area.",
    "📅 שלחנו לך הזמנה ליומן Google לכל מפגש, עם המיקום. נא לאשר אותן ביומן (Yes) כדי לוודא שאין התנגשות. יש התנגשות? כתבו לנו ל-": "📅 We've sent you a Google Calendar invite for every session, with the location. Please accept them (Yes) so we know there are no clashes. Have a clash? Write to us at",
    "משרדי KPMG, קומה 3, משרד Ocean": "KPMG offices, floor 3, Ocean room", "משרדי KPMG, קומה 3, משרד Ocean, תל אביב": "KPMG offices, floor 3, Ocean room, Tel Aviv",
    "בורד דצמבר": "December board", "בורד ינואר": "January board", "בורד פברואר": "February board", "בורד מרץ": "March board",
    "יו״ר הבורד": "Board chairman", "שם מלא בעברית": "Full name in Hebrew", "שם מלא באנגלית": "Full name in English", "גרסה": "Version"
  };
  var PATTERNS = [
    [/^שלום (.+)$/, "Hello $1"], [/^היי (.+), הסכם ההצטרפות שלך$/, "Hi $1, your membership agreement"],
    [/^היי (.+), אזור החברים נפתח אחרי ההצטרפות לבורד או לקהילה\. אם כבר הצטרפת, ייתכן שנרשמת אצלנו עם כתובת אימייל אחרת \((.+)\)\.$/, "Hi $1, the members area opens once you join a board or the community. If you already joined, you may have registered with a different email address ($2)."],
    [/^ההסכם נחתם ב-(.+)\. תודה!$/, "The agreement was signed on $1. Thank you!"], [/^ההסכם נחתם ב-(.+)\. עותק נשמר אצלנו\.$/, "The agreement was signed on $1. A copy is saved with us."],
    [/^נחתם ב-(.+)\. $/, "Signed on $1. "], [/^(\d+) מתוך 8$/, "$1 of 8"], [/^גרסה (.+)$/, "Version $1"]
  ];
  var KEY = "tb_lang", lang = "he";
  try { lang = localStorage.getItem(KEY) || "he"; } catch(e){}
  var orig = new WeakMap(), attrs = ["placeholder", "aria-label", "title"];
  function tr(s){
    var t = s.trim(); if (!t) return null;
    if (EN[t]) return s.replace(t, EN[t]);
    for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i][0].test(t)) return s.replace(t, t.replace(PATTERNS[i][0], PATTERNS[i][1]));
    return null;
  }
  function skip(n){ for (var p = n.parentNode; p && p !== document; p = p.parentNode) { if (p.nodeType === 1 && (p.tagName === "SCRIPT" || p.tagName === "STYLE" || p.tagName === "TEXTAREA" || p.hasAttribute("data-no-tr"))) return true; } return false; }
  function apply(root){
    if (lang !== "en") return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function(t){
      if (skip(t) || !/[֐-׿]/.test(t.nodeValue)) return;
      var x = tr(t.nodeValue); if (x == null) return;
      if (!orig.has(t)) orig.set(t, t.nodeValue);
      var p = t.parentNode; if (p && p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", orig.get(t).trim());
      t.nodeValue = x;
    });
    (root.querySelectorAll ? root.querySelectorAll("[placeholder],[aria-label],[title]") : []).forEach(function(el){
      attrs.forEach(function(a){ var v = el.getAttribute(a); if (!v || !/[֐-׿]/.test(v)) return; var x = tr(v); if (x == null) return; el.setAttribute("data-he-" + a, v); el.setAttribute(a, x); });
    });
  }
  function setDir(){
    document.documentElement.lang = lang; document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.body && document.body.classList.toggle("lang-en", lang === "en");
    var t = document.title; if (lang === "en" && EN[t]) { document.documentElement.setAttribute("data-he-title", t); document.title = EN[t]; }
  }
  function toggle(){
    var next = lang === "en" ? "he" : "en";
    try { localStorage.setItem(KEY, next); } catch(e){}
    if (next === "he") { location.reload(); return; }
    lang = next; setDir(); apply(document.body); btn.textContent = "עב";
    btn.setAttribute("aria-label", "עברית");
    window.dispatchEvent(new CustomEvent("tb-lang", { detail: lang }));
  }
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "tb-lang"; btn.textContent = lang === "en" ? "עב" : "EN"; btn.setAttribute("aria-label", lang === "en" ? "עברית" : "English"); btn.setAttribute("data-no-tr", "");
  btn.addEventListener("click", toggle);
  var css = document.createElement("style");
  css.textContent = ".tb-lang{border:1px solid rgba(255,255,255,.35);background:none;color:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:.85rem;font-weight:700;cursor:pointer;letter-spacing:.04em}.tb-lang:hover{border-color:#fff}.lang-en{font-family:'Inter','Heebo',system-ui,sans-serif}";
  document.head.appendChild(css);
  window.TBLang = { get: function(){ return lang; }, t: function(s){ if (lang !== "en") return s; var x = tr(s); return x == null ? s : x; } };
  function init(){
    var slot = document.querySelector("[data-lang-slot]") || document.querySelector("header .bar");
    if (slot) slot.appendChild(btn);
    setDir(); apply(document.body);
    new MutationObserver(function(ms){ if (lang !== "en") return; ms.forEach(function(m){ m.addedNodes.forEach(function(n){ if (n.nodeType === 1) apply(n); else if (n.nodeType === 3 && n.parentNode) apply(n.parentNode); }); if (m.type === "characterData" && m.target.parentNode) apply(m.target.parentNode); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
