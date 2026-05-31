/* Cue — canned interview scenarios + lightweight code highlighter.
   Exposed on window: CUE_SCENARIOS, cueHighlight */
(function () {
  const SCENARIOS = [
    {
      q: "Can you walk me through how you'd reverse a singly linked list, and what the time and space complexity is?",
      short:
        "I'd iterate through the list once, re-pointing each node's next pointer to the node before it while tracking three references — previous, current, and next. It runs in O(n) time and O(1) extra space.",
      points: [
        "Keep three pointers: prev (starts null), curr (starts head), and a temp next.",
        "Each step: save curr.next, point curr.next to prev, then advance prev and curr forward.",
        "When curr becomes null, prev is the new head — return it.",
        "Mention the recursive variant too, but flag its O(n) call-stack space as a trade-off.",
      ],
      lang: "python",
      file: "reverse_list.py",
      code: `def reverse_list(head):
    # iterative, O(n) time / O(1) space
    prev = None
    curr = head
    while curr is not None:
        nxt = curr.next     # stash the rest
        curr.next = prev    # flip the pointer
        prev = curr         # advance window
        curr = nxt
    return prev             # new head`,
    },
    {
      q: "What's the difference between a process and a thread, and when would you reach for one over the other?",
      short:
        "A process is an independent program with its own isolated memory space; a thread is a lightweight unit of execution that lives inside a process and shares that process's memory. Threads are cheaper to create and communicate, but that shared memory is exactly what forces you to think about locking and race conditions.",
      points: [
        "Processes are isolated — a crash in one won't take down another. Great for fault tolerance.",
        "Threads share heap and file handles, so inter-thread communication is fast but needs synchronization.",
        "Reach for threads (or async) for I/O-bound work; reach for multiple processes to sidestep a GIL or to use many CPU cores for compute-bound work.",
        "Context-switching a thread is cheaper than switching a whole process.",
      ],
      lang: "python",
      file: "io_bound.py",
      code: `import threading, queue

results = queue.Queue()

def worker(url):
    data = fetch(url)        # I/O-bound: thread waits
    results.put((url, data))

threads = [threading.Thread(target=worker, args=(u,))
           for u in urls]
for t in threads: t.start()
for t in threads: t.join()   # wait for all`,
    },
    {
      q: "How does a hash map work under the hood, and what happens when two keys collide?",
      short:
        "A hash map applies a hash function to a key to compute an index into an array of buckets, giving you average O(1) lookups, inserts, and deletes. Collisions — two keys landing in the same bucket — are resolved either by chaining (a linked list or tree per bucket) or by open addressing (probing for the next free slot).",
      points: [
        "Good hash functions distribute keys uniformly to minimize collisions.",
        "Chaining stores colliding entries in a per-bucket list; Java upgrades long chains to balanced trees.",
        "Open addressing keeps everything in the array and probes (linear/quadratic) on collision.",
        "When the load factor crosses a threshold (~0.75), the table resizes and rehashes — amortized O(1).",
      ],
      lang: "javascript",
      file: "hashmap.js",
      code: `class HashMap {
  constructor(size = 16) {
    this.buckets = Array.from({ length: size }, () => []);
  }
  _index(key) {
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(h) % this.buckets.length;
  }
  set(key, value) {
    const bucket = this.buckets[this._index(key)];
    const found = bucket.find((e) => e[0] === key);
    if (found) found[1] = value;        // update
    else bucket.push([key, value]);     // chain on collision
  }
  get(key) {
    const bucket = this.buckets[this._index(key)];
    const found = bucket.find((e) => e[0] === key);
    return found ? found[1] : undefined;
  }
}`,
    },
    {
      q: "Implement a function that checks whether a string is a valid palindrome, ignoring punctuation and case.",
      short:
        "I'd use a two-pointer approach: one pointer from the front, one from the back, skipping any non-alphanumeric characters and comparing the rest case-insensitively. It's O(n) time and O(1) space since I never build a second string.",
      points: [
        "Normalize comparison by lowercasing each character as you read it.",
        "Skip characters that aren't letters or digits from both ends.",
        "Move pointers inward; mismatch means it's not a palindrome, exit early.",
        "Two-pointer beats reversing the string because it avoids the extra allocation.",
      ],
      lang: "python",
      file: "palindrome.py",
      code: `def is_palindrome(s: str) -> bool:
    i, j = 0, len(s) - 1
    while i < j:
        while i < j and not s[i].isalnum():
            i += 1
        while i < j and not s[j].isalnum():
            j -= 1
        if s[i].lower() != s[j].lower():
            return False
        i, j = i + 1, j - 1
    return True`,
    },
    {
      q: "How would you design a URL shortener like bit.ly at a high level?",
      short:
        "At its core it's a key-value store mapping a short code to a long URL. I'd generate a unique 7-character base-62 code per URL, persist the mapping, and on redirect do a fast lookup and return a 301/302. The interesting parts are unique ID generation at scale, read-heavy caching, and analytics.",
      points: [
        "Generate codes with a distributed counter encoded in base-62, or hash + collision check.",
        "It's massively read-heavy, so cache hot codes in Redis in front of the database.",
        "Use a 302 if you want to keep counting clicks; a 301 is cacheable but skips your analytics.",
        "Shard the datastore by code prefix and add a CDN edge for global redirect latency.",
      ],
      lang: "javascript",
      file: "shortener.js",
      code: `const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// encode an auto-increment id into a short base-62 code
function encode(id) {
  let code = "";
  do {
    code = ALPHABET[id % 62] + code;
    id = Math.floor(id / 62);
  } while (id > 0);
  return code.padStart(7, "0");
}

async function shorten(longUrl) {
  const id = await nextId();          // distributed counter
  const code = encode(id);
  await store.put(code, longUrl);     // persist mapping
  return "https://cue.sh/" + code;
}`,
    },
  ];

  /* --- tiny tokenizing highlighter (keywords / strings / comments / numbers / calls) --- */
  const KW = {
    python: ["def","return","while","for","in","if","else","elif","import","from","class","None","True","False","and","or","not","is","with","as","lambda","yield","try","except","finally","raise"],
    javascript: ["const","let","var","function","return","while","for","of","in","if","else","class","new","do","async","await","try","catch","finally","throw","this","null","undefined","true","false","=>","export","import"],
  };

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cueHighlight(code, lang) {
    const kws = KW[lang] || KW.javascript;
    const kwSet = new Set(kws.filter((k) => /^\w+$/.test(k)));
    const commentChar = lang === "python" ? "#" : null;

    return code.split("\n").map((line) => {
      // split out comments first
      let codePart = line, comPart = "";
      if (commentChar) {
        const idx = findComment(line, "#");
        if (idx !== -1) { codePart = line.slice(0, idx); comPart = line.slice(idx); }
      } else {
        const idx = line.indexOf("//");
        if (idx !== -1 && !inString(line, idx)) { codePart = line.slice(0, idx); comPart = line.slice(idx); }
      }

      // tokenize codePart by strings vs the rest
      let html = "";
      const re = /(['"`])(?:\\.|(?!\1).)*\1?/g;
      let last = 0, m;
      while ((m = re.exec(codePart)) !== null) {
        html += highlightWords(codePart.slice(last, m.index), kwSet);
        html += `<span class="tok-str">${escapeHtml(m[0])}</span>`;
        last = m.index + m[0].length;
      }
      html += highlightWords(codePart.slice(last), kwSet);

      if (comPart) html += `<span class="tok-com">${escapeHtml(comPart)}</span>`;
      return html;
    }).join("\n");
  }

  function findComment(line, ch) {
    let str = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (str) { if (c === str && line[i-1] !== "\\") str = null; }
      else if (c === '"' || c === "'" || c === "`") str = c;
      else if (c === ch) return i;
    }
    return -1;
  }
  function inString(line, idx) {
    let str = null;
    for (let i = 0; i < idx; i++) {
      const c = line[i];
      if (str) { if (c === str && line[i-1] !== "\\") str = null; }
      else if (c === '"' || c === "'" || c === "`") str = c;
    }
    return !!str;
  }

  function highlightWords(text, kwSet) {
    // numbers, keywords, function calls
    return text.replace(/(\b[A-Za-z_]\w*\b)(\s*\()?|(\b\d+(?:\.\d+)?\b)/g, (full, word, paren, num) => {
      if (num) return `<span class="tok-num">${num}</span>`;
      if (word) {
        if (kwSet.has(word)) return `<span class="tok-kw">${word}</span>` + (paren || "");
        if (paren) return `<span class="tok-fn">${word}</span>${paren}`;
        return word + (paren || "");
      }
      return full;
    });
  }

  window.CUE_SCENARIOS = SCENARIOS;
  window.cueHighlight = cueHighlight;

  /* ---------- résumé parsing + introduction builder ---------- */
  const SKILLS = [
    "JavaScript","TypeScript","React","Next.js","Vue","Angular","Svelte","Node.js","Node",
    "Express","Python","Django","Flask","FastAPI","Java","Spring","Go","Golang","Rust",
    "C++","C#",".NET","Ruby","Rails","PHP","Laravel","Swift","Kotlin","Objective-C",
    "SQL","PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","GraphQL","REST","gRPC",
    "AWS","GCP","Azure","Docker","Kubernetes","Terraform","CI/CD","Kafka","RabbitMQ",
    "TensorFlow","PyTorch","Pandas","NumPy","Spark","Figma","Tailwind",
  ];

  function listJoin(arr) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + " and " + arr[1];
    return arr.slice(0, -1).join(", ") + ", and " + arr[arr.length - 1];
  }

  function cueParseResume(text) {
    const clean = String(text || "").replace(/\r/g, "");
    const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

    let name = null;
    for (const l of lines.slice(0, 6)) {
      if (/^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}$/.test(l) && l.length <= 40) { name = l; break; }
    }

    const roleRe = /((?:senior|sr\.?|staff|lead|principal|junior|jr\.?)\s+)?((?:software|front[\s-]?end|back[\s-]?end|full[\s-]?stack|data|machine\s+learning|ml|devops|cloud|mobile|ios|android|product|ui|ux|web)\s+)?(engineer|developer|designer|scientist|architect|manager|analyst|programmer)/i;
    const rm = clean.match(roleRe);
    const role = rm ? rm[0].replace(/\s+/g, " ").trim().toLowerCase() : null;

    const ym = clean.match(/(\d{1,2})\s*\+?\s*years?/i);
    const years = ym ? parseInt(ym[1], 10) : null;

    const found = [];
    for (const sk of SKILLS) {
      const esc = sk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(^|[^A-Za-z0-9+#.])" + esc + "([^A-Za-z0-9+#]|$)", "i");
      if (re.test(clean) && !found.some((f) => f.toLowerCase() === sk.toLowerCase())) found.push(sk);
      if (found.length >= 6) break;
    }

    return { name, role, years, skills: found };
  }

  function cueBuildIntro(parsed, userName) {
    const p = parsed || {};
    const name = p.name || userName || "there";
    const role = p.role || "software engineer";
    const yearsPhrase = p.years
      ? `over ${p.years} year${p.years > 1 ? "s" : ""} of experience`
      : "several years of hands-on experience";
    const skills = p.skills && p.skills.length ? p.skills : null;
    const skillSentence = skills
      ? ` I work most closely with ${listJoin(skills.slice(0, 4))}, and I like owning features end to end — from design through to production.`
      : ` I like owning features end to end — from early design through to production.`;

    const short =
      `Hi, I'm ${name} — a ${role} with ${yearsPhrase}.` + skillSentence +
      ` Most recently I've focused on shipping reliable, well-tested systems and lifting the people around me. ` +
      `I'm drawn to this role because it pairs genuinely hard technical problems with real product impact, which is exactly where I do my best work.`;

    const points = [
      "Open with your current role and one line of impact — not your whole history.",
      skills ? `Anchor on ${listJoin(skills.slice(0, 3))} — the skills this role leans on most.` : "Name the 2–3 skills most relevant to this role.",
      "Close with why this company: tie it to something specific you've shipped or want to build.",
      "Aim for 60–90 seconds and leave hooks the interviewer can follow up on.",
    ];

    return { q: "Tell me about yourself.", qLabel: "Opening prompt", badge: "Your introduction", intro: true, short, points };
  }

  window.cueParseResume = cueParseResume;
  window.cueBuildIntro = cueBuildIntro;
})();
