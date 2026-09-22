/* RICOIL Waste Oil FAQ Chatbot
   Rule-based (no AI backend / no API key / no ongoing cost).
   Matches visitor questions against a waste-oil knowledge base by keyword,
   falls back to phone/email/quote-form when nothing matches well. */

(function () {
  const KB = [
    {
      id: "quote",
      keywords: ["quote", "price", "cost", "how much", "pricing", "charge", "rate"],
      question: "How much does collection cost?",
      answer: "It depends on your volume and setup, so we don't quote blind. Fill in the Get a Quote form and we'll come back with a straight number within one working day — or call 0844 812 5818."
    },
    {
      id: "licence",
      keywords: ["licence", "license", "licensed", "registered", "carrier", "legal", "compliance", "duty of care", "law"],
      question: "Do I legally need a licensed collector?",
      answer: "Yes. Waste cooking oil is controlled waste under the Environmental Protection Act 1990, and you stay responsible even after handing it over if the collector isn't registered. RICOIL is a registered waste carrier, and you get a Waste Transfer Note on every collection. See the full Guide page for details."
    },
    {
      id: "frequency",
      keywords: ["often", "frequency", "schedule", "weekly", "fortnightly", "how regularly", "collection day"],
      question: "How often will my oil be collected?",
      answer: "Whatever suits your volume — a fixed weekly or fortnightly round for busy kitchens, or on-request collection for smaller producers. We agree the schedule with you directly."
    },
    {
      id: "pump",
      keywords: ["pump", "access", "hard to reach", "reach", "awkward", "behind equipment", "extraction", "tight space"],
      question: "What if my storage is hard to access?",
      answer: "That's what our pump-assisted extraction is for. If your container is boxed in or awkward to shift, our team extracts the oil directly rather than skipping the collection."
    },
    {
      id: "container",
      keywords: ["container", "clean container", "washed", "swap", "dirty", "bin"],
      question: "Do I get a clean container back?",
      answer: "Yes — every collection is a straight swap. We take the full container and leave a washed, ready-to-use one in its place. No gap, no mess, no waiting."
    },
    {
      id: "exchange",
      keywords: ["exchange", "fresh oil", "supply", "buy oil", "vegetable oil", "oil exchange", "programme", "program"],
      question: "What's the Oil Exchange Programme?",
      answer: "If your kitchen goes through a set amount of fresh oil regularly, we can supply that oil back to you at a competitive rate as part of your collection — turning your waste oil into a saving on stock you'd be buying anyway. Mention it when you get a quote."
    },
    {
      id: "contract",
      keywords: ["contract", "long term", "long-term", "agreement", "partnership", "years"],
      question: "Do you offer long-term contracts?",
      answer: "Yes — most of our accounts run on 2–5 year agreements. You get a locked-in rate and a fixed schedule, and we're accountable for keeping service consistent throughout."
    },
    {
      id: "coverage",
      keywords: ["area", "cover", "location", "where", "postcode", "region", "uk wide"],
      question: "What areas do you cover?",
      answer: "We collect UK-wide. Send us your postcode via the Get a Quote form and we'll confirm collection timing for your area."
    },
    {
      id: "process",
      keywords: ["biodiesel", "recycle", "recycling", "what happens", "process", "byproduct", "renewable"],
      question: "What actually happens to the oil?",
      answer: "Collected oil is transported under proper waste documentation and routed to biodiesel producers and other recovery partners — turned into renewable fuel and recovered byproducts instead of landfill or the drain."
    },
    {
      id: "drains",
      keywords: ["drain", "sink", "household", "home", "tenant", "landlord", "council", "block", "fatberg"],
      question: "I'm a household, not a business — can you help?",
      answer: "Yes — that's exactly what our Save Our Drains initiative is for. We supply free containers and organise periodic collection for households, landlords, councils and letting agents. Visit the Save Our Drains page to join."
    },
    {
      id: "contact",
      keywords: ["phone", "call", "email", "contact", "speak to someone", "talk to"],
      question: "How do I contact RICOIL directly?",
      answer: "Call 0844 812 5818 or email ricoil-uk@pm.me — or use the Get a Quote form and we'll come back to you within one working day."
    },
    {
      id: "since",
      keywords: ["how long", "established", "experience", "trading since", "history", "founded"],
      question: "How long has RICOIL been operating?",
      answer: "RICOIL has been collecting waste cooking oil since 2011 — we've operated continuously since, formally registering and re-registering along the way."
    }
  ];

  const STARTERS = ["quote", "licence", "pump", "exchange", "coverage"];

  // EmailJS config — reused from the site's existing quote form setup
  const EMAILJS_SERVICE_ID = "service_wbfbfqt";
  const EMAILJS_TEMPLATE_ID = "template_y097aw9";
  const EMAILJS_PUBLIC_KEY = "oAALGGB5MXvYVm1qi";

  const HANDOFF_KEYWORDS = ["human", "person", "agent", "real person", "someone", "speak to", "talk to", "rico", "call me", "callback", "call back"];

  function wantsHuman(text) {
    const t = text.toLowerCase();
    return HANDOFF_KEYWORDS.some(function (k) { return t.indexOf(k) !== -1; });
  }

  function ensureEmailJS(callback) {
    if (window.emailjs) { callback(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload = function () {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      callback();
    };
    document.head.appendChild(s);
  }

  function score(input, entry) {
    const text = input.toLowerCase();
    let s = 0;
    entry.keywords.forEach(function (k) {
      if (text.indexOf(k) !== -1) s += k.split(" ").length; // multi-word matches score higher
    });
    return s;
  }

  function bestMatch(input) {
    let best = null, bestScore = 0;
    KB.forEach(function (entry) {
      const s = score(input, entry);
      if (s > bestScore) { bestScore = s; best = entry; }
    });
    return bestScore > 0 ? best : null;
  }

  function buildWidget() {
    const style = document.createElement("style");
    style.textContent = `
      #ricoilChatToggle{
        position:fixed; bottom:22px; right:22px; z-index:200;
        width:58px; height:58px; border-radius:50%; border:none; cursor:pointer;
        background:var(--amber,#D89B2E); color:var(--ink,#0B2E3D);
        font-size:26px; box-shadow:0 6px 18px rgba(0,0,0,0.35);
        display:flex; align-items:center; justify-content:center;
        transition:transform .2s;
      }
      #ricoilChatToggle:hover{ transform:scale(1.06); }
      #ricoilChatWindow{
        position:fixed; bottom:90px; right:22px; z-index:200;
        width:min(340px, calc(100vw - 32px)); max-height:min(480px, calc(100vh - 140px));
        background:var(--ink,#0B2E3D); border:1px solid var(--line, rgba(242,233,206,0.14));
        border-radius:10px; display:none; flex-direction:column; overflow:hidden;
        box-shadow:0 12px 32px rgba(0,0,0,0.45);
        font-family:'Barlow', sans-serif;
      }
      #ricoilChatWindow.open{ display:flex; }
      #ricoilChatHeader{
        background:var(--ink-soft,#123C4E); padding:14px 16px; display:flex; align-items:center; justify-content:space-between;
        border-bottom:1px solid var(--line, rgba(242,233,206,0.14));
      }
      #ricoilChatHeader .title{ font-family:'Archivo Expanded', sans-serif; color:var(--paper,#F2E9CE); font-size:14px; text-transform:uppercase; letter-spacing:0.04em; }
      #ricoilChatHeader .sub{ font-family:'IBM Plex Mono', monospace; color:var(--steel,#A9BEC7); font-size:10.5px; }
      #ricoilChatClose{ background:none; border:none; color:var(--steel,#A9BEC7); font-size:18px; cursor:pointer; }
      #ricoilChatBody{ flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
      .ricoil-msg{ font-size:13.5px; line-height:1.5; padding:10px 12px; border-radius:8px; max-width:85%; }
      .ricoil-msg.bot{ background:var(--ink-soft,#123C4E); color:var(--paper,#F2E9CE); align-self:flex-start; }
      .ricoil-msg.user{ background:var(--amber,#D89B2E); color:var(--ink,#0B2E3D); align-self:flex-end; font-weight:600; }
      #ricoilChatStarters{ display:flex; flex-wrap:wrap; gap:6px; padding:0 16px 12px; }
      .ricoil-chip{
        font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--steel,#A9BEC7);
        border:1px solid var(--line, rgba(242,233,206,0.14)); border-radius:14px; padding:6px 10px;
        cursor:pointer; background:none; transition:all .2s;
      }
      .ricoil-chip:hover{ border-color:var(--amber,#D89B2E); color:var(--amber-bright,#F0B93D); }
      #ricoilChatInputRow{ display:flex; border-top:1px solid var(--line, rgba(242,233,206,0.14)); }
      #ricoilChatInput{
        flex:1; background:var(--ink-soft,#123C4E); border:none; color:var(--paper,#F2E9CE);
        padding:12px 14px; font-size:13.5px; font-family:'Barlow', sans-serif;
      }
      #ricoilChatInput:focus{ outline:none; }
      #ricoilChatSend{
        background:var(--amber,#D89B2E); color:var(--ink,#0B2E3D); border:none; padding:0 18px;
        font-weight:600; cursor:pointer; font-size:13px;
      }
      @media (max-width:480px){
        #ricoilChatWindow{ right:16px; bottom:84px; }
        #ricoilChatToggle{ right:16px; bottom:16px; }
      }
    `;
    document.head.appendChild(style);

    const toggle = document.createElement("button");
    toggle.id = "ricoilChatToggle";
    toggle.setAttribute("aria-label", "Open waste oil chat assistant");
    toggle.textContent = "💬";
    document.body.appendChild(toggle);

    const win = document.createElement("div");
    win.id = "ricoilChatWindow";
    win.innerHTML = `
      <div id="ricoilChatHeader">
        <div>
          <div class="title">RICOIL Assistant</div>
          <div class="sub">Waste oil questions, answered</div>
        </div>
        <button id="ricoilChatClose" aria-label="Close chat">✕</button>
      </div>
      <div id="ricoilChatBody"></div>
      <div id="ricoilChatStarters"></div>
      <div id="ricoilChatHandoffRow" style="padding:0 16px 10px;">
        <button id="ricoilChatHandoffBtn" class="ricoil-chip" style="border-color:var(--olive-bright,#4CAF50); color:var(--olive-bright,#4CAF50);">🧑 Talk to a human</button>
      </div>
      <div id="ricoilChatInputRow">
        <input id="ricoilChatInput" type="text" placeholder="Ask about collection, pricing, compliance…">
        <button id="ricoilChatSend">Send</button>
      </div>
    `;
    document.body.appendChild(win);

    const body = win.querySelector("#ricoilChatBody");
    const startersEl = win.querySelector("#ricoilChatStarters");
    const input = win.querySelector("#ricoilChatInput");
    const sendBtn = win.querySelector("#ricoilChatSend");
    const closeBtn = win.querySelector("#ricoilChatClose");
    const handoffBtn = win.querySelector("#ricoilChatHandoffBtn");

    const transcript = [];
    let awaitingContact = false;
    let unmatchedStreak = 0;

    function addMsg(text, who) {
      const div = document.createElement("div");
      div.className = "ricoil-msg " + who;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      transcript.push((who === "user" ? "Visitor: " : "Bot: ") + text);
    }

    function renderStarters() {
      startersEl.innerHTML = "";
      STARTERS.forEach(function (id) {
        const entry = KB.find(function (e) { return e.id === id; });
        if (!entry) return;
        const chip = document.createElement("button");
        chip.className = "ricoil-chip";
        chip.textContent = entry.question;
        chip.addEventListener("click", function () { handleInput(entry.question); });
        startersEl.appendChild(chip);
      });
    }

    function beginHandoff() {
      awaitingContact = true;
      addMsg("Sure — what's your name and the best phone number or email to reach you on? I'll get RICOIL to follow up directly.", "bot");
    }

    function sendHandoff(contactText) {
      addMsg("Thanks — sending that over now…", "bot");
      ensureEmailJS(function () {
        const payload = {
          business_name: "Chatbot Handoff Request",
          contact_name: contactText,
          phone: contactText,
          postcode: "N/A",
          volume: "N/A",
          details: "Chat transcript:\n" + transcript.join("\n")
        };
        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, payload)
          .then(function () {
            addMsg("Done — RICOIL will be in touch within one working day. You can also call 0844 812 5818 directly if it's urgent.", "bot");
          })
          .catch(function () {
            addMsg("That didn't send, sorry — please call 0844 812 5818 or email ricoil-uk@pm.me directly instead.", "bot");
          });
      });
    }

    function handleInput(text) {
      if (!text || !text.trim()) return;
      addMsg(text, "user");
      input.value = "";

      if (awaitingContact) {
        awaitingContact = false;
        sendHandoff(text);
        return;
      }

      if (wantsHuman(text)) {
        beginHandoff();
        return;
      }

      const match = bestMatch(text);
      setTimeout(function () {
        if (match) {
          unmatchedStreak = 0;
          addMsg(match.answer, "bot");
        } else {
          unmatchedStreak++;
          let fallback = "I don't have a canned answer for that one — call 0844 812 5818 or email ricoil-uk@pm.me directly, or use the Get a Quote form.";
          if (unmatchedStreak >= 2) {
            fallback += " Or just say \"talk to a human\" and I'll pass your details straight to RICOIL.";
          }
          addMsg(fallback, "bot");
        }
      }, 300);
    }

    toggle.addEventListener("click", function () {
      const isOpen = win.classList.toggle("open");
      if (isOpen && body.children.length === 0) {
        addMsg("Hi — I can answer common questions about waste cooking oil collection with RICOIL. Tap a question below, type your own, or ask to speak to a human.", "bot");
        renderStarters();
      }
    });
    closeBtn.addEventListener("click", function () { win.classList.remove("open"); });
    sendBtn.addEventListener("click", function () { handleInput(input.value); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") handleInput(input.value); });
    handoffBtn.addEventListener("click", function () {
      if (body.children.length === 0) { addMsg("Hi — I can answer common questions, or connect you with RICOIL directly.", "bot"); renderStarters(); }
      beginHandoff();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
