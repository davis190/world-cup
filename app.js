/* ================================================================
   WC26 · THE POOL — data + logic
   Live results feed: kingdoggydog/worldcup2026 data.json
   (football-data.org format), polled every 5 minutes.
   ================================================================ */

/* In production, data.json is written to the site's S3 bucket every 5 min by a
   scheduled Lambda (infra/template.yml) that polls api.football-data.org.
   The committed data.json is a seed for local development. */
const FEED_URL = "data.json";
const LS_KEY = "wc26pool.feed.v1";
const TOURNAMENT_END = Date.parse("2026-07-22T00:00:00Z");
const STALE_MS = 15 * 60e3;          // data older than this (during the tournament) = feed broken
const POLL_FAST = 60e3;              // while a match is live or near kickoff
const POLL_SLOW = 5 * 60e3;

/* ---------------- owners ---------------- */
const OWNERS = {
  Cooney:  { color: "#ef4444" },
  Noah:    { color: "#fbbf24" },
  Clayton: { color: "#a3e635" },
  Chowder: { color: "#38bdf8" },
  Devan:   { color: "#818cf8" },
  Kurtz:   { color: "#c084fc" },
  Joe:     { color: "#f472b6" },
  Casey:   { color: "#2dd4bf" },
};

/* ---------------- teams ----------------
   key: display name · fd: name used by the results feed
   seed: draft slot (1-48) · note: replacement context        */
const TEAMS = {
  "Mexico":              { flag:"🇲🇽", group:"A", owner:"Kurtz",   seed:14, fd:"Mexico" },
  "South Africa":        { flag:"🇿🇦", group:"A", owner:"Chowder", seed:33, fd:"South Africa" },
  "South Korea":         { flag:"🇰🇷", group:"A", owner:"Noah",    seed:25, fd:"South Korea" },
  "Czechia":             { flag:"🇨🇿", group:"A", owner:"Clayton", seed:41, fd:"Czechia" },
  "Canada":              { flag:"🇨🇦", group:"B", owner:"Devan",   seed:28, fd:"Canada" },
  "Bosnia & Herzegovina":{ flag:"🇧🇦", group:"B", owner:"Joe",     seed:47, fd:"Bosnia-Herzegovina" },
  "Qatar":               { flag:"🇶🇦", group:"B", owner:"Joe",     seed:27, fd:"Qatar", note:"slot inherited from Ukraine (did not qualify)" },
  "Switzerland":         { flag:"🇨🇭", group:"B", owner:"Devan",   seed:17, fd:"Switzerland" },
  "Brazil":              { flag:"🇧🇷", group:"C", owner:"Noah",    seed:5,  fd:"Brazil" },
  "Morocco":             { flag:"🇲🇦", group:"C", owner:"Noah",    seed:11, fd:"Morocco" },
  "Haiti":               { flag:"🇭🇹", group:"C", owner:"Noah",    seed:42, fd:"Haiti" },
  "Scotland":            { flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿", group:"C", owner:"Cooney",  seed:36, fd:"Scotland" },
  "USA":                 { flag:"🇺🇸", group:"D", owner:"Chowder", seed:13, fd:"United States" },
  "Paraguay":            { flag:"🇵🇾", group:"D", owner:"Clayton", seed:30, fd:"Paraguay" },
  "Australia":           { flag:"🇦🇺", group:"D", owner:"Cooney",  seed:26, fd:"Australia" },
  "Türkiye":             { flag:"🇹🇷", group:"D", owner:"Noah",    seed:24, fd:"Turkey" },
  "Germany":             { flag:"🇩🇪", group:"E", owner:"Joe",     seed:9,  fd:"Germany" },
  "Curaçao":             { flag:"🇨🇼", group:"E", owner:"Devan",   seed:43, fd:"Curaçao" },
  "Ivory Coast":         { flag:"🇨🇮", group:"E", owner:"Chowder", seed:29, fd:"Ivory Coast", note:"slot inherited from Peru (did not qualify)" },
  "Ecuador":             { flag:"🇪🇨", group:"E", owner:"Casey",   seed:23, fd:"Ecuador" },
  "Netherlands":         { flag:"🇳🇱", group:"F", owner:"Casey",   seed:7,  fd:"Netherlands" },
  "Japan":               { flag:"🇯🇵", group:"F", owner:"Clayton", seed:16, fd:"Japan" },
  "Sweden":              { flag:"🇸🇪", group:"F", owner:"Clayton", seed:22, fd:"Sweden" },
  "Tunisia":             { flag:"🇹🇳", group:"F", owner:"Kurtz",   seed:31, fd:"Tunisia" },
  "Belgium":             { flag:"🇧🇪", group:"G", owner:"Kurtz",   seed:8,  fd:"Belgium" },
  "Egypt":               { flag:"🇪🇬", group:"G", owner:"Casey",   seed:32, fd:"Egypt" },
  "Iran":                { flag:"🇮🇷", group:"G", owner:"Chowder", seed:18, fd:"Iran" },
  "New Zealand":         { flag:"🇳🇿", group:"G", owner:"Clayton", seed:37, fd:"New Zealand" },
  "Spain":               { flag:"🇪🇸", group:"H", owner:"Cooney",  seed:3,  fd:"Spain" },
  "Cape Verde":          { flag:"🇨🇻", group:"H", owner:"Noah",    seed:35, fd:"Cape Verde Islands" },
  "Saudi Arabia":        { flag:"🇸🇦", group:"H", owner:"Casey",   seed:48, fd:"Saudi Arabia" },
  "Uruguay":             { flag:"🇺🇾", group:"H", owner:"Devan",   seed:15, fd:"Uruguay" },
  "France":              { flag:"🇫🇷", group:"I", owner:"Devan",   seed:2,  fd:"France" },
  "Senegal":             { flag:"🇸🇳", group:"I", owner:"Joe",     seed:19, fd:"Senegal" },
  "Iraq":                { flag:"🇮🇶", group:"I", owner:"Devan",   seed:38, fd:"Iraq" },
  "Norway":              { flag:"🇳🇴", group:"I", owner:"Cooney",  seed:20, fd:"Norway" },
  "Argentina":           { flag:"🇦🇷", group:"J", owner:"Chowder", seed:1,  fd:"Argentina" },
  "Algeria":             { flag:"🇩🇿", group:"J", owner:"Casey",   seed:34, fd:"Algeria" },
  "Austria":             { flag:"🇦🇹", group:"J", owner:"Kurtz",   seed:21, fd:"Austria" },
  "Jordan":              { flag:"🇯🇴", group:"J", owner:"Chowder", seed:45, fd:"Jordan" },
  "Portugal":            { flag:"🇵🇹", group:"K", owner:"Joe",     seed:6,  fd:"Portugal" },
  "DR Congo":            { flag:"🇨🇩", group:"K", owner:"Kurtz",   seed:46, fd:"Congo DR" },
  "Uzbekistan":          { flag:"🇺🇿", group:"K", owner:"Cooney",  seed:44, fd:"Uzbekistan" },
  "Colombia":            { flag:"🇨🇴", group:"K", owner:"Cooney",  seed:12, fd:"Colombia" },
  "England":             { flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", group:"L", owner:"Clayton", seed:4,  fd:"England" },
  "Croatia":             { flag:"🇭🇷", group:"L", owner:"Casey",   seed:10, fd:"Croatia" },
  "Ghana":               { flag:"🇬🇭", group:"L", owner:"Kurtz",   seed:39, fd:"Ghana" },
  "Panama":              { flag:"🇵🇦", group:"L", owner:"Joe",     seed:40, fd:"Panama" },
};
const FD_TO_DISPLAY = {};
for (const [name, t] of Object.entries(TEAMS)) FD_TO_DISPLAY[t.fd] = name;

/* ---------------- Wikipedia article slugs (for roster fetch) ---------------- */
const WIKI = {
  "Mexico":               "Mexico_national_football_team",
  "South Africa":         "South_Africa_national_football_team",
  "South Korea":          "South_Korea_national_football_team",
  "Czechia":              "Czech_Republic_national_football_team",
  "Canada":               "Canada_national_soccer_team",
  "Bosnia & Herzegovina": "Bosnia_and_Herzegovina_national_football_team",
  "Qatar":                "Qatar_national_football_team",
  "Switzerland":          "Switzerland_national_football_team",
  "Brazil":               "Brazil_national_football_team",
  "Morocco":              "Morocco_national_football_team",
  "Haiti":                "Haiti_national_football_team",
  "Scotland":             "Scotland_national_football_team",
  "USA":                  "United_States_national_soccer_team",
  "Paraguay":             "Paraguay_national_football_team",
  "Australia":            "Australia_national_football_team",
  "Türkiye":              "Turkey_national_football_team",
  "Germany":              "Germany_national_football_team",
  "Curaçao":              "Cura%C3%A7ao_national_football_team",
  "Ivory Coast":          "Ivory_Coast_national_football_team",
  "Ecuador":              "Ecuador_national_football_team",
  "Netherlands":          "Netherlands_national_football_team",
  "Japan":                "Japan_national_football_team",
  "Sweden":               "Sweden_national_football_team",
  "Tunisia":              "Tunisia_national_football_team",
  "Belgium":              "Belgium_national_football_team",
  "Egypt":                "Egypt_national_football_team",
  "Iran":                 "Iran_national_football_team",
  "New Zealand":          "New_Zealand_national_football_team",
  "Spain":                "Spain_national_football_team",
  "Cape Verde":           "Cape_Verde_national_football_team",
  "Saudi Arabia":         "Saudi_Arabia_national_football_team",
  "Uruguay":              "Uruguay_national_football_team",
  "France":               "France_national_football_team",
  "Senegal":              "Senegal_national_football_team",
  "Iraq":                 "Iraq_national_football_team",
  "Norway":               "Norway_national_football_team",
  "Argentina":            "Argentina_national_football_team",
  "Algeria":              "Algeria_national_football_team",
  "Austria":              "Austria_national_football_team",
  "Jordan":               "Jordan_national_football_team",
  "Portugal":             "Portugal_national_football_team",
  "DR Congo":             "Democratic_Republic_of_the_Congo_national_football_team",
  "Uzbekistan":           "Uzbekistan_national_football_team",
  "Colombia":             "Colombia_national_football_team",
  "England":              "England_national_football_team",
  "Croatia":              "Croatia_national_football_team",
  "Ghana":                "Ghana_national_football_team",
  "Panama":               "Panama_national_football_team",
};

const GROUPS = "ABCDEFGHIJKL".split("");
const GROUP_TEAMS = {};
for (const g of GROUPS) GROUP_TEAMS[g] = Object.keys(TEAMS).filter(n => TEAMS[n].group === g);

/* ---------------- venues ---------------- */
const V = [
  ["Estadio Azteca","Mexico City"],["Estadio Akron","Guadalajara"],["Estadio BBVA","Monterrey"],
  ["Mercedes-Benz Stadium","Atlanta"],["BMO Field","Toronto"],["Levi's Stadium","SF Bay Area"],
  ["SoFi Stadium","Los Angeles"],["BC Place","Vancouver"],["Lumen Field","Seattle"],
  ["MetLife Stadium","New York/NJ"],["Gillette Stadium","Boston"],["Lincoln Financial Field","Philadelphia"],
  ["Hard Rock Stadium","Miami"],["NRG Stadium","Houston"],["AT&T Stadium","Dallas"],
  ["Arrowhead Stadium","Kansas City"],
];

/* ---------------- group-stage matches (72) ---------------- */
const GM = [
  [537327,"2026-06-11T19:00:00Z","A","Mexico","South Africa",0],
  [537328,"2026-06-12T02:00:00Z","A","South Korea","Czechia",1],
  [537329,"2026-06-18T16:00:00Z","A","Czechia","South Africa",3],
  [537330,"2026-06-19T01:00:00Z","A","Mexico","South Korea",1],
  [537331,"2026-06-25T01:00:00Z","A","Czechia","Mexico",0],
  [537332,"2026-06-25T01:00:00Z","A","South Africa","South Korea",2],
  [537333,"2026-06-12T19:00:00Z","B","Canada","Bosnia & Herzegovina",4],
  [537334,"2026-06-13T19:00:00Z","B","Qatar","Switzerland",5],
  [537335,"2026-06-18T19:00:00Z","B","Switzerland","Bosnia & Herzegovina",6],
  [537336,"2026-06-18T22:00:00Z","B","Canada","Qatar",7],
  [537337,"2026-06-24T19:00:00Z","B","Switzerland","Canada",7],
  [537338,"2026-06-24T19:00:00Z","B","Bosnia & Herzegovina","Qatar",8],
  [537339,"2026-06-13T22:00:00Z","C","Brazil","Morocco",9],
  [537340,"2026-06-14T01:00:00Z","C","Haiti","Scotland",10],
  [537341,"2026-06-20T00:30:00Z","C","Brazil","Haiti",11],
  [537342,"2026-06-19T22:00:00Z","C","Scotland","Morocco",10],
  [537343,"2026-06-24T22:00:00Z","C","Scotland","Brazil",12],
  [537344,"2026-06-24T22:00:00Z","C","Morocco","Haiti",3],
  [537345,"2026-06-13T01:00:00Z","D","USA","Paraguay",6],
  [537346,"2026-06-14T04:00:00Z","D","Australia","Türkiye",7],
  [537347,"2026-06-20T03:00:00Z","D","Türkiye","Paraguay",5],
  [537348,"2026-06-19T19:00:00Z","D","USA","Australia",8],
  [537349,"2026-06-26T02:00:00Z","D","Türkiye","USA",6],
  [537350,"2026-06-26T02:00:00Z","D","Paraguay","Australia",5],
  [537351,"2026-06-14T17:00:00Z","E","Germany","Curaçao",13],
  [537352,"2026-06-14T23:00:00Z","E","Ivory Coast","Ecuador",11],
  [537353,"2026-06-20T20:00:00Z","E","Germany","Ivory Coast",4],
  [537354,"2026-06-21T00:00:00Z","E","Ecuador","Curaçao",15],
  [537355,"2026-06-25T20:00:00Z","E","Ecuador","Germany",9],
  [537356,"2026-06-25T20:00:00Z","E","Curaçao","Ivory Coast",11],
  [537357,"2026-06-14T20:00:00Z","F","Netherlands","Japan",14],
  [537358,"2026-06-15T02:00:00Z","F","Sweden","Tunisia",2],
  [537359,"2026-06-20T17:00:00Z","F","Netherlands","Sweden",13],
  [537360,"2026-06-21T04:00:00Z","F","Tunisia","Japan",2],
  [537361,"2026-06-25T23:00:00Z","F","Tunisia","Netherlands",15],
  [537362,"2026-06-25T23:00:00Z","F","Japan","Sweden",14],
  [537363,"2026-06-15T19:00:00Z","G","Belgium","Egypt",8],
  [537364,"2026-06-16T01:00:00Z","G","Iran","New Zealand",6],
  [537365,"2026-06-21T19:00:00Z","G","Belgium","Iran",6],
  [537366,"2026-06-22T01:00:00Z","G","New Zealand","Egypt",7],
  [537367,"2026-06-27T03:00:00Z","G","New Zealand","Belgium",7],
  [537368,"2026-06-27T03:00:00Z","G","Egypt","Iran",8],
  [537369,"2026-06-15T16:00:00Z","H","Spain","Cape Verde",3],
  [537370,"2026-06-15T22:00:00Z","H","Saudi Arabia","Uruguay",12],
  [537371,"2026-06-21T16:00:00Z","H","Spain","Saudi Arabia",3],
  [537372,"2026-06-21T22:00:00Z","H","Uruguay","Cape Verde",12],
  [537373,"2026-06-27T00:00:00Z","H","Uruguay","Spain",1],
  [537374,"2026-06-27T00:00:00Z","H","Cape Verde","Saudi Arabia",13],
  [537391,"2026-06-16T19:00:00Z","I","France","Senegal",9],
  [537392,"2026-06-16T22:00:00Z","I","Iraq","Norway",10],
  [537393,"2026-06-22T21:00:00Z","I","France","Iraq",11],
  [537394,"2026-06-23T00:00:00Z","I","Norway","Senegal",9],
  [537395,"2026-06-26T19:00:00Z","I","Norway","France",10],
  [537396,"2026-06-26T19:00:00Z","I","Senegal","Iraq",4],
  [537397,"2026-06-17T01:00:00Z","J","Argentina","Algeria",15],
  [537398,"2026-06-17T04:00:00Z","J","Austria","Jordan",5],
  [537399,"2026-06-22T17:00:00Z","J","Argentina","Austria",14],
  [537400,"2026-06-23T03:00:00Z","J","Jordan","Algeria",5],
  [537401,"2026-06-28T02:00:00Z","J","Jordan","Argentina",14],
  [537402,"2026-06-28T02:00:00Z","J","Algeria","Austria",15],
  [537403,"2026-06-17T17:00:00Z","K","Portugal","DR Congo",13],
  [537404,"2026-06-18T02:00:00Z","K","Uzbekistan","Colombia",0],
  [537405,"2026-06-23T17:00:00Z","K","Portugal","Uzbekistan",13],
  [537406,"2026-06-24T02:00:00Z","K","Colombia","DR Congo",1],
  [537407,"2026-06-27T23:30:00Z","K","Colombia","Portugal",12],
  [537408,"2026-06-27T23:30:00Z","K","DR Congo","Uzbekistan",3],
  [537409,"2026-06-17T20:00:00Z","L","England","Croatia",14],
  [537410,"2026-06-17T23:00:00Z","L","Ghana","Panama",4],
  [537411,"2026-06-23T20:00:00Z","L","England","Ghana",10],
  [537412,"2026-06-23T23:00:00Z","L","Panama","Croatia",4],
  [537413,"2026-06-27T21:00:00Z","L","Panama","England",9],
  [537414,"2026-06-27T21:00:00Z","L","Croatia","Ghana",11],
];

/* ---------------- knockout slots (32) ----------------
   descriptors: {p:1,g:"A"} group position · {t:"A/B/.."} best third
   {w:73} winner of match 73 · {l:101} loser of match 101            */
const KO = [
  { id:537417, num:73,  stage:"LAST_32", utc:"2026-06-28T19:00:00Z", h:{p:2,g:"A"}, a:{p:2,g:"B"}, v:6 },
  { id:537423, num:74,  stage:"LAST_32", utc:"2026-06-29T17:00:00Z", h:{p:1,g:"E"}, a:{t:"A/B/C/D/F"}, v:10 },
  { id:537415, num:75,  stage:"LAST_32", utc:"2026-06-29T20:30:00Z", h:{p:1,g:"F"}, a:{p:2,g:"C"}, v:2 },
  { id:537418, num:76,  stage:"LAST_32", utc:"2026-06-30T01:00:00Z", h:{p:1,g:"C"}, a:{p:2,g:"F"}, v:13 },
  { id:537424, num:77,  stage:"LAST_32", utc:"2026-06-30T17:00:00Z", h:{p:2,g:"E"}, a:{p:2,g:"I"}, v:14 },
  { id:537416, num:78,  stage:"LAST_32", utc:"2026-06-30T21:00:00Z", h:{p:1,g:"I"}, a:{t:"C/D/F/G/H"}, v:9 },
  { id:537425, num:79,  stage:"LAST_32", utc:"2026-07-01T01:00:00Z", h:{p:1,g:"A"}, a:{t:"C/E/F/H/I"}, v:0 },
  { id:537426, num:80,  stage:"LAST_32", utc:"2026-07-01T16:00:00Z", h:{p:1,g:"L"}, a:{t:"E/H/I/J/K"}, v:3 },
  { id:537422, num:81,  stage:"LAST_32", utc:"2026-07-01T20:00:00Z", h:{p:1,g:"G"}, a:{t:"A/E/H/I/J"}, v:8 },
  { id:537421, num:82,  stage:"LAST_32", utc:"2026-07-02T00:00:00Z", h:{p:1,g:"D"}, a:{t:"B/E/F/I/J"}, v:5 },
  { id:537420, num:83,  stage:"LAST_32", utc:"2026-07-02T19:00:00Z", h:{p:1,g:"H"}, a:{p:2,g:"J"}, v:6 },
  { id:537419, num:84,  stage:"LAST_32", utc:"2026-07-02T23:00:00Z", h:{p:2,g:"K"}, a:{p:2,g:"L"}, v:4 },
  { id:537429, num:85,  stage:"LAST_32", utc:"2026-07-03T03:00:00Z", h:{p:1,g:"B"}, a:{t:"E/F/G/I/J"}, v:7 },
  { id:537428, num:86,  stage:"LAST_32", utc:"2026-07-03T18:00:00Z", h:{p:2,g:"D"}, a:{p:2,g:"G"}, v:14 },
  { id:537427, num:87,  stage:"LAST_32", utc:"2026-07-03T22:00:00Z", h:{p:1,g:"J"}, a:{p:2,g:"H"}, v:12 },
  { id:537430, num:88,  stage:"LAST_32", utc:"2026-07-04T01:30:00Z", h:{p:1,g:"K"}, a:{t:"D/E/I/J/L"}, v:15 },
  { id:537376, num:89,  stage:"LAST_16", utc:"2026-07-04T17:00:00Z", h:{w:73}, a:{w:75}, v:13 },
  { id:537375, num:90,  stage:"LAST_16", utc:"2026-07-04T21:00:00Z", h:{w:74}, a:{w:77}, v:11 },
  { id:537377, num:91,  stage:"LAST_16", utc:"2026-07-05T20:00:00Z", h:{w:76}, a:{w:78}, v:9 },
  { id:537378, num:92,  stage:"LAST_16", utc:"2026-07-06T00:00:00Z", h:{w:79}, a:{w:80}, v:0 },
  { id:537379, num:93,  stage:"LAST_16", utc:"2026-07-06T19:00:00Z", h:{w:83}, a:{w:84}, v:14 },
  { id:537380, num:94,  stage:"LAST_16", utc:"2026-07-07T00:00:00Z", h:{w:81}, a:{w:82}, v:8 },
  { id:537381, num:95,  stage:"LAST_16", utc:"2026-07-07T16:00:00Z", h:{w:86}, a:{w:88}, v:3 },
  { id:537382, num:96,  stage:"LAST_16", utc:"2026-07-07T20:00:00Z", h:{w:85}, a:{w:87}, v:7 },
  { id:537383, num:97,  stage:"QUARTER_FINALS", utc:"2026-07-09T20:00:00Z", h:{w:89}, a:{w:90}, v:10 },
  { id:537384, num:98,  stage:"QUARTER_FINALS", utc:"2026-07-10T19:00:00Z", h:{w:93}, a:{w:94}, v:6 },
  { id:537385, num:99,  stage:"QUARTER_FINALS", utc:"2026-07-11T21:00:00Z", h:{w:91}, a:{w:92}, v:12 },
  { id:537386, num:100, stage:"QUARTER_FINALS", utc:"2026-07-12T01:00:00Z", h:{w:95}, a:{w:96}, v:15 },
  { id:537387, num:101, stage:"SEMI_FINALS", utc:"2026-07-14T19:00:00Z", h:{w:97}, a:{w:98}, v:14 },
  { id:537388, num:102, stage:"SEMI_FINALS", utc:"2026-07-15T19:00:00Z", h:{w:99}, a:{w:100}, v:3 },
  { id:537389, num:103, stage:"THIRD_PLACE", utc:"2026-07-18T21:00:00Z", h:{l:101}, a:{l:102}, v:12 },
  { id:537390, num:104, stage:"FINAL", utc:"2026-07-19T19:00:00Z", h:{w:101}, a:{w:102}, v:9 },
];
const KO_BY_NUM = {}; KO.forEach(k => KO_BY_NUM[k.num] = k);

const STAGE_LABEL = {
  LAST_32:"Round of 32", LAST_16:"Round of 16", QUARTER_FINALS:"Quarterfinal",
  SEMI_FINALS:"Semifinal", THIRD_PLACE:"Third place", FINAL:"FINAL",
};

/* ---------------- unified match list ---------------- */
const MATCHES = [
  ...GM.map(([id, utc, g, home, away, v]) => ({ id, utc, stage:"GROUP_STAGE", group:g, home, away, v })),
  ...KO.map(k => ({ id:k.id, utc:k.utc, stage:k.stage, group:null, home:null, away:null, v:k.v, num:k.num, slot:k })),
].sort((a, b) => a.utc.localeCompare(b.utc) || a.id - b.id);
const MATCH_BY_ID = {}; MATCHES.forEach(m => MATCH_BY_ID[m.id] = m);

/* ---------------- state ---------------- */
const state = {
  results: { 537327: { status:"FINISHED", h:2, a:0, winner:"HOME_TEAM" } }, // bundled snapshot
  koTeams: {},          // id -> {home, away} display names from live feed
  feedTime: null,       // when this browser last fetched successfully
  dataTime: null,       // fetchedAt stamped into data.json by the backend Lambda
  fetchTimer: null,
  feedOk: false,
  rosterOwner: "",      // owner filter on Rosters tab
  rosterGroup: "",      // group filter on Rosters tab
  odds: {},             // match id (string) -> { home, away, draw, bk, closing, t }
  filters: { owner:"", team:"", group:"", city:"", upcoming:false },
  tz: "local",
  view: "schedule",
};

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const money = n => "$" + n;

/* ================================================================
   results feed
   ================================================================ */
function applyFeed(json) {
  if (!json || !Array.isArray(json.matches)) return false;
  state.dataTime = json.fetchedAt ? new Date(json.fetchedAt) : null;
  for (const m of json.matches) {
    if (!MATCH_BY_ID[m.id]) continue;
    const ft = (m.score && m.score.fullTime) || {};
    state.results[m.id] = {
      status: m.status,
      h: ft.home, a: ft.away,
      winner: m.score && m.score.winner,
      duration: m.score && m.score.duration,
      pen: m.score && m.score.penalties,
    };
    if (MATCH_BY_ID[m.id].stage !== "GROUP_STAGE" && m.homeTeam && m.homeTeam.name) {
      state.koTeams[m.id] = {
        home: FD_TO_DISPLAY[m.homeTeam.name] || m.homeTeam.name,
        away: FD_TO_DISPLAY[m.awayTeam.name] || m.awayTeam.name,
      };
    }
  }
  return true;
}

async function fetchFeed(manual) {
  const btn = $("#refreshBtn");
  btn.classList.add("spinning");
  try {
    const res = await fetch(FEED_URL + "?_=" + Math.floor(Date.now() / 60000), { cache:"no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (applyFeed(json)) {
      state.feedTime = new Date();
      state.feedOk = true;
      try { localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), json })); } catch (e) {}
      renderAll();
    }
  } catch (e) {
    state.feedOk = false;
    renderStatus();
  } finally {
    btn.classList.remove("spinning");
  }
}

function loadCachedFeed() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const { ts, json } = JSON.parse(raw);
    if (applyFeed(json)) { state.feedTime = new Date(ts); state.feedOk = true; }
  } catch (e) {}
}

/* ================================================================
   standings + bracket resolution
   ================================================================ */
const isDone = r => r && (r.status === "FINISHED" || r.status === "AWARDED");
const isLive = r => r && (r.status === "IN_PLAY" || r.status === "PAUSED" || r.status === "LIVE");

function computeStandings() {
  const out = {};
  for (const g of GROUPS) {
    const rows = {};
    for (const t of GROUP_TEAMS[g]) rows[t] = { team:t, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
    const games = GM.filter(m => m[2] === g);
    let played = 0;
    for (const [id,, , home, away] of games) {
      const r = state.results[id];
      if (!isDone(r) || r.h == null) continue;
      played++;
      const H = rows[home], A = rows[away];
      H.p++; A.p++; H.gf += r.h; H.ga += r.a; A.gf += r.a; A.ga += r.h;
      if (r.h > r.a) { H.w++; A.l++; H.pts += 3; }
      else if (r.h < r.a) { A.w++; H.l++; A.pts += 3; }
      else { H.d++; A.d++; H.pts++; A.pts++; }
    }
    for (const t of Object.values(rows)) t.gd = t.gf - t.ga;

    let list = Object.values(rows).sort((x, y) =>
      y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team));
    // head-to-head among fully tied clusters
    list = breakTies(list, games);
    out[g] = { table:list, complete: played === 6, played };
  }
  return out;
}

function breakTies(list, games) {
  const result = [];
  let i = 0;
  while (i < list.length) {
    let j = i + 1;
    while (j < list.length &&
      list[j].pts === list[i].pts && list[j].gd === list[i].gd && list[j].gf === list[i].gf) j++;
    const cluster = list.slice(i, j);
    if (cluster.length > 1) {
      const names = new Set(cluster.map(c => c.team));
      const mini = {};
      for (const c of cluster) mini[c.team] = { pts:0, gd:0, gf:0 };
      for (const [id,, , home, away] of games) {
        if (!names.has(home) || !names.has(away)) continue;
        const r = state.results[id];
        if (!isDone(r) || r.h == null) continue;
        mini[home].gf += r.h; mini[home].gd += r.h - r.a;
        mini[away].gf += r.a; mini[away].gd += r.a - r.h;
        if (r.h > r.a) mini[home].pts += 3;
        else if (r.h < r.a) mini[away].pts += 3;
        else { mini[home].pts++; mini[away].pts++; }
      }
      cluster.sort((x, y) =>
        mini[y.team].pts - mini[x.team].pts || mini[y.team].gd - mini[x.team].gd ||
        mini[y.team].gf - mini[x.team].gf || x.team.localeCompare(y.team));
    }
    result.push(...cluster);
    i = j;
  }
  return result;
}

function thirdPlaceRanking(standings) {
  const thirds = GROUPS.map(g => ({ g, row: standings[g].table[2], complete: standings[g].complete }));
  thirds.sort((x, y) =>
    y.row.pts - x.row.pts || y.row.gd - x.row.gd || y.row.gf - x.row.gf ||
    x.row.team.localeCompare(y.row.team));
  return thirds;
}

/* resolve a knockout slot side to a display team name (or null) */
function resolveSide(slot, side, standings) {
  const live = state.koTeams[slot.id];
  if (live) return side === "h" ? live.home : live.away;
  const d = slot[side];
  if (d.p && standings[d.g] && standings[d.g].complete) return standings[d.g].table[d.p - 1].team;
  if (d.w != null || d.l != null) {
    const src = KO_BY_NUM[d.w != null ? d.w : d.l];
    const r = state.results[src.id];
    if (isDone(r) && r.winner && r.winner !== "DRAW") {
      const teams = resolvedTeams(src, standings);
      if (teams.home && teams.away) {
        const winner = r.winner === "HOME_TEAM" ? teams.home : teams.away;
        const loser  = r.winner === "HOME_TEAM" ? teams.away : teams.home;
        return d.w != null ? winner : loser;
      }
    }
  }
  return null;
}
function resolvedTeams(slot, standings) {
  return { home: resolveSide(slot, "h", standings), away: resolveSide(slot, "a", standings) };
}
function descLabel(d) {
  if (d.p) return `${d.p === 1 ? "Winner" : "Runner-up"} Group ${d.g}`;
  if (d.t) return `3rd · ${d.t}`;
  if (d.w != null) return `Winner M${d.w}`;
  return `Loser M${d.l}`;
}

/* ================================================================
   payouts
   ================================================================ */
function computePool(standings) {
  const thirds = thirdPlaceRanking(standings);
  const bestThird = new Set(thirds.slice(0, 8).map(t => t.row.team));

  // knockout participation / results per team
  const reach = {};   // team -> {r32,r16,qf,sf,final,champ,runnerUp,outKO}
  for (const t of Object.keys(TEAMS)) reach[t] = {};
  const stageKey = { LAST_32:"r32", LAST_16:"r16", QUARTER_FINALS:"qf", SEMI_FINALS:"sf", FINAL:"final" };
  for (const k of KO) {
    if (k.stage === "THIRD_PLACE") continue;
    const live = state.koTeams[k.id];
    if (!live) continue;
    const r = state.results[k.id];
    for (const side of ["home", "away"]) {
      const t = live[side];
      if (!reach[t]) continue;
      reach[t][stageKey[k.stage]] = true;
      if (isDone(r) && r.winner && r.winner !== "DRAW") {
        const won = (r.winner === "HOME_TEAM") === (side === "home");
        if (!won) reach[t].outKO = k.stage;
        else if (k.stage === "FINAL") reach[t].champ = true;
        if (!won && k.stage === "FINAL") reach[t].runnerUp = true;
      }
    }
  }

  const teams = {};
  for (const [name, info] of Object.entries(TEAMS)) {
    const g = standings[info.group];
    const pos = g.table.findIndex(r => r.team === name) + 1;
    const row = g.table[pos - 1];
    const rc = reach[name];
    const advancedTop2 = g.complete && pos <= 2;
    const advancedThird = g.complete && pos === 3 && bestThird.has(name);
    const earned =
      (advancedTop2 ? 5 : 0) + (rc.qf ? 10 : 0) + (rc.sf ? 30 : 0) + (rc.champ ? 80 : 0);
    const projAdv = !g.complete && pos <= 2 && row.p > 0 ? 5 : 0;

    let alive, status;
    if (rc.champ) { alive = true; status = `<span class="st-champ">🏆 CHAMPION</span>`; }
    else if (rc.runnerUp) { alive = false; status = `<span class="st-out">Final · runner-up</span>`; }
    else if (rc.outKO) {
      alive = false;
      const at = { LAST_32:"R32", LAST_16:"R16", QUARTER_FINALS:"QF", SEMI_FINALS:"Semis" }[rc.outKO];
      status = `<span class="st-out">out · ${at}</span>`;
    }
    else if (rc.final) { alive = true; status = `<span class="st-alive">in the FINAL</span>`; }
    else if (rc.sf) { alive = true; status = `<span class="st-alive">in the Semis</span>`; }
    else if (rc.qf) { alive = true; status = `<span class="st-alive">in the QF</span>`; }
    else if (rc.r16) { alive = true; status = `<span class="st-alive">in the R16</span>`; }
    else if (rc.r32 || advancedTop2 || advancedThird) {
      alive = true;
      status = `<span class="st-alive">through${advancedThird ? " (3rd)" : ""}</span>`;
    }
    else if (g.complete) { alive = false; status = `<span class="st-out">out · groups</span>`; }
    else {
      alive = true;
      const ord = ["1st", "2nd", "3rd", "4th"][pos - 1];
      status = `${ord} · ${row.pts} pts · ${row.p}/3`;
    }
    teams[name] = { earned, projAdv, alive, status, pos, advancedTop2, advancedThird,
      qf: !!rc.qf, sf: !!rc.sf, champ: !!rc.champ };
  }

  const owners = Object.keys(OWNERS).map(name => {
    const roster = Object.keys(TEAMS).filter(t => TEAMS[t].owner === name)
      .sort((a, b) => TEAMS[a].seed - TEAMS[b].seed);
    let earned = 0, proj = 0, adv = 0, qf = 0, sf = 0, champ = 0, aliveCt = 0;
    for (const t of roster) {
      const x = teams[t];
      earned += x.earned; proj += x.earned + x.projAdv;
      if (x.advancedTop2) adv++;
      if (x.qf) qf++;
      if (x.sf) sf++;
      if (x.champ) champ++;
      if (x.alive) aliveCt++;
    }
    return { name, roster, earned, proj, adv, qf, sf, champ, aliveCt };
  }).sort((a, b) => b.earned - a.earned || b.proj - a.proj || a.name.localeCompare(b.name));

  return { teams, owners, bestThird, thirds };
}

/* ================================================================
   formatting
   ================================================================ */
const TZ_OPTIONS = [
  ["local", "Local time"],
  ["America/New_York", "Eastern (ET)"],
  ["America/Chicago", "Central (CT)"],
  ["America/Denver", "Mountain (MT)"],
  ["America/Los_Angeles", "Pacific (PT)"],
  ["America/Mexico_City", "Mexico City"],
  ["Europe/London", "UK (BST)"],
  ["Europe/Paris", "Central Europe"],
];
function tzName() { return state.tz === "local" ? undefined : state.tz; }
function fmtTime(utc) {
  return new Intl.DateTimeFormat(undefined, { hour:"numeric", minute:"2-digit", timeZone: tzName() })
    .format(new Date(utc));
}
function fmtDayKey(utc) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle:"short", timeZone: tzName() }).format(new Date(utc));
}
function fmtDayLabel(utc) {
  return new Intl.DateTimeFormat(undefined, { weekday:"long", month:"long", day:"numeric", timeZone: tzName() })
    .format(new Date(utc));
}
function ownerTag(team) {
  const o = TEAMS[team] && TEAMS[team].owner;
  if (!o) return "";
  return `<span class="owner-tag" style="color:${OWNERS[o].color}">${o}</span>`;
}
function teamHtml(team, side, extra, oddsPrice) {
  const oddsEl = oddsPrice != null
    ? `<span class="t-odds${oddsPrice < 0 ? " fav" : ""}">${oddsPrice > 0 ? "+" : ""}${oddsPrice}</span>` : "";
  if (!team || !TEAMS[team]) {
    return `<div class="m-team ${side}"><div class="m-team-main"><span class="tname" style="color:var(--chalk-faint);font-style:italic;font-weight:400">${esc(extra || "TBD")}</span></div>${oddsEl}</div>`;
  }
  const t = TEAMS[team];
  return `<div class="m-team ${side}"><div class="m-team-main"><span class="flag">${t.flag}</span><span class="t-stack"><span class="tname">${esc(team)}</span>${ownerTag(team)}</span></div>${oddsEl}</div>`;
}

/* ================================================================
   render: schedule
   ================================================================ */
function renderSchedule(standings) {
  const f = state.filters;
  const now = Date.now();
  const rows = [];
  for (const m of MATCHES) {
    let home = m.home, away = m.away, hDesc, aDesc;
    if (m.stage !== "GROUP_STAGE") {
      const t = resolvedTeams(m.slot, standings);
      home = t.home; away = t.away;
      hDesc = descLabel(m.slot.h); aDesc = descLabel(m.slot.a);
    }
    const r = state.results[m.id];
    if (f.upcoming && isDone(r)) continue;
    if (f.upcoming && !isLive(r) && new Date(m.utc).getTime() < now - 3 * 3600e3) continue;
    if (f.group && m.group !== f.group) continue;
    if (f.city && V[m.v][1] !== f.city) continue;
    if (f.team && home !== f.team && away !== f.team) continue;
    if (f.owner) {
      const ho = home && TEAMS[home] && TEAMS[home].owner;
      const ao = away && TEAMS[away] && TEAMS[away].owner;
      if (ho !== f.owner && ao !== f.owner) continue;
    }
    rows.push({ m, home, away, hDesc, aDesc, r });
  }

  if (!rows.length) {
    $("#scheduleList").innerHTML = `<div class="empty">NO MATCHES — ADJUST FILTERS</div>`;
    return;
  }

  let html = "", lastDay = "";
  let dayBuf = [], dayLabel = "";
  const flush = () => {
    if (!dayBuf.length) return;
    html += `<div class="day-h"><span>${dayLabel}</span><span class="day-count">${dayBuf.length} match${dayBuf.length > 1 ? "es" : ""}</span></div>` + dayBuf.join("");
    dayBuf = [];
  };
  for (const { m, home, away, hDesc, aDesc, r } of rows) {
    const dk = fmtDayKey(m.utc);
    if (dk !== lastDay) { flush(); lastDay = dk; dayLabel = fmtDayLabel(m.utc); }
    const live = isLive(r);
    const done = isDone(r);
    const o = state.odds[String(m.id)];
    const fmtP = p => p == null ? "—" : p > 0 ? `+${p}` : `${p}`;
    const drawEl = o?.draw != null ? `<span class="m-draw">${fmtP(o.draw)}</span>` : "";
    const badge = o ? (o.closing
      ? `<span class="o-badge closing" title="Closing line">🔒 closing</span>`
      : `<span class="o-badge">pre-match</span>`) : "";
    let center;
    if (done || live) {
      const pen = r.pen && r.pen.home != null ? `<span class="pens">${r.pen.home}–${r.pen.away} pens</span>` :
        (r.duration && r.duration !== "REGULAR" ? `<span class="pens">a.e.t.</span>` : "");
      const dh = r.h ?? (live ? 0 : "–"), da = r.a ?? (live ? 0 : "–");
      center = `<div class="m-score">${dh}<span class="vs"> : </span>${da}${pen}${drawEl}</div>`;
    } else {
      center = `<div class="m-score"><span class="vs">vs</span>${drawEl}</div>`;
    }
    let hCls = "", aCls = "";
    if (done && r.winner === "HOME_TEAM") aCls = "loser";
    if (done && r.winner === "AWAY_TEAM") hCls = "loser";
    const tag = m.stage === "GROUP_STAGE" ? `Group ${m.group}` : `${STAGE_LABEL[m.stage]} · M${m.num}`;
    const bkEl = o?.bk ? `<span class="m-bk">${esc(o.bk)}</span>` : "";
    dayBuf.push(`<div class="match${live ? " is-live" : ""}">
      <div class="m-time">${live ? `<span class="live-tag">● LIVE</span>` : fmtTime(m.utc)}${badge}</div>
      ${teamHtml(home, `right ${hCls}`, hDesc, o?.home)}
      ${center}
      ${teamHtml(away, aCls, aDesc, o?.away)}
      <div class="m-meta"><span class="grp">${tag}</span><br>${V[m.v][0]} · ${V[m.v][1]}${bkEl}</div>
    </div>`);
  }
  flush();
  $("#scheduleList").innerHTML = html;
}

/* ================================================================
   render: groups
   ================================================================ */
function renderGroups(standings, pool) {
  let html = "";
  for (const g of GROUPS) {
    const { table, complete, played } = standings[g];
    const rows = table.map((r, i) => {
      const inBest8 = pool.bestThird.has(r.team) && i === 2;
      const cls = played === 0 ? "" : i < 2 ? "q1" : (inBest8 ? "q3" : "");
      const t = TEAMS[r.team];
      return `<tr class="${cls}">
        <td class="t-team"><span class="flag">${t.flag}</span>${esc(r.team)}${ownerTag(r.team)}</td>
        <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
        <td>${r.gf}</td><td>${r.ga}</td><td>${r.gd > 0 ? "+" + r.gd : r.gd}</td>
        <td class="t-pts">${r.pts}</td></tr>`;
    }).join("");
    html += `<div class="group-card">
      <div class="gc-h"><span class="g-name">GROUP <b>${g}</b></span>
      <span class="g-state ${complete ? "done" : ""}">${complete ? "FINAL ✓" : `${played}/6 played`}</span></div>
      <table class="standings">
        <thead><tr><th class="t-team">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }
  $("#groupGrid").innerHTML = html;
}

/* ================================================================
   render: bracket
   ================================================================ */
function bracketCard(slot, standings) {
  const { home, away } = resolvedTeams(slot, standings);
  const r = state.results[slot.id];
  const done = isDone(r);
  const live = isLive(r);
  const date = new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", timeZone: tzName() }).format(new Date(slot.utc));
  const row = (team, d, isHome) => {
    if (!team || !TEAMS[team]) return `<div class="b-row tbd">${esc(descLabel(d))}</div>`;
    const t = TEAMS[team];
    let cls = "", score = "";
    if (done && r.h != null) {
      const winSide = r.winner === "HOME_TEAM" ? "home" : r.winner === "AWAY_TEAM" ? "away" : null;
      const mySide = isHome ? "home" : "away";
      cls = winSide ? (winSide === mySide ? "winner" : "loser") : "";
      let s = isHome ? r.h : r.a;
      if (r.pen && r.pen.home != null) s += ` (${isHome ? r.pen.home : r.pen.away})`;
      score = `<span class="bscore">${s}</span>`;
    } else if (live && r.h != null) {
      score = `<span class="bscore">${isHome ? r.h : r.a}</span>`;
    }
    return `<div class="b-row ${cls}"><span class="flag">${t.flag}</span>${esc(team)}${ownerTag(team)}${score}</div>`;
  };
  return `<div class="b-match${done ? " decided" : ""}${slot.stage === "FINAL" ? " final-match" : ""}">
    <span class="b-num">M${slot.num} · ${date}${live ? " · LIVE" : ""}</span>
    ${row(home, slot.h, true)}${row(away, slot.a, false)}
    <div class="b-venue">${V[slot.v][0]} · ${V[slot.v][1]}</div></div>`;
}

function renderBracket(standings) {
  const cols = [
    ["ROUND OF 32", [73,75,74,77,83,84,81,82,76,78,79,80,86,88,85,87]],
    ["ROUND OF 16", [89,90,93,94,91,92,95,96]],
    ["QUARTERS",    [97,98,99,100]],
    ["SEMIS",       [101,102]],
    ["FINAL",       [104]],
  ];
  $("#bracket").innerHTML = cols.map(([label, nums]) =>
    `<div class="b-round"><div class="b-round-h">${label}</div><div class="b-slots">
      ${nums.map(n => bracketCard(KO_BY_NUM[n], standings)).join("")}</div></div>`).join("");

  // third place + champion banner
  const third = KO_BY_NUM[103];
  const finalR = state.results[KO_BY_NUM[104].id];
  let champHtml = "";
  if (isDone(finalR) && finalR.winner && finalR.winner !== "DRAW") {
    const ft = resolvedTeams(KO_BY_NUM[104], standings);
    const champ = finalR.winner === "HOME_TEAM" ? ft.home : ft.away;
    if (champ && TEAMS[champ]) {
      champHtml = `<div class="champ-banner"><span class="trophy">🏆</span>
        <span>${TEAMS[champ].flag} ${esc(champ)} — WORLD CHAMPIONS</span>${ownerTag(champ)}</div>`;
    }
  } else {
    champHtml = `<div class="champ-banner"><span class="trophy">🏆</span><span style="color:var(--chalk-faint)">Champion — Jul 19, MetLife Stadium</span></div>`;
  }
  $("#bracketExtras").innerHTML =
    `<div><div class="b-round-h" style="margin-bottom:8px">THIRD PLACE</div>${bracketCard(third, standings)}</div>${champHtml}`;
}

/* ================================================================
   render: owners + payouts
   ================================================================ */
function renderOwners(pool) {
  $("#ownerGrid").innerHTML = pool.owners.map((o, i) => {
    const c = OWNERS[o.name].color;
    const rows = o.roster.map(t => {
      const x = pool.teams[t];
      const info = TEAMS[t];
      const cash = x.earned;
      return `<div class="oc-team${x.alive ? "" : " out"}" ${info.note ? `title="${esc(info.note)}"` : ""}>
        <span class="flag">${info.flag}</span>
        <span>${esc(t)}<span class="seed">#${info.seed}${info.note ? "*" : ""}</span></span>
        <span class="oc-status">${x.status}</span>
        <span class="oc-cash${cash ? "" : " zero"}">${cash ? "+" + money(cash) : "—"}</span>
      </div>`;
    }).join("");
    return `<div class="owner-card" style="--oc:${c};animation-delay:${i * 60}ms">
      <div class="oc-h"><span class="oc-rank">#${i + 1}</span><span class="oc-name">${o.name}</span>
        <span class="oc-money"><span class="oc-earned">${money(o.earned)}</span>
        <span class="oc-proj">proj ${money(o.proj)} · ${o.aliveCt}/6 alive</span></span></div>
      ${rows}</div>`;
  }).join("");
}

function renderPayouts(pool, standings) {
  const allDone = GROUPS.every(g => standings[g].complete);
  const head = `<thead><tr><th>Owner</th><th>Alive</th><th>Advanced ×$5</th><th>QF ×$10</th><th>SF ×$30</th><th>Champion</th><th>Earned</th><th>Projected</th></tr></thead>`;
  const body = pool.owners.map((o, i) => `<tr class="${i === 0 && o.earned > 0 ? "leader" : ""}">
      <td class="lb-owner" style="color:${OWNERS[o.name].color}">${o.name}</td>
      <td>${o.aliveCt}/6</td>
      <td>${o.adv ? `${o.adv} · $${o.adv * 5}` : "—"}</td>
      <td>${o.qf ? `${o.qf} · $${o.qf * 10}` : "—"}</td>
      <td>${o.sf ? `${o.sf} · $${o.sf * 30}` : "—"}</td>
      <td>${o.champ ? "$80 🏆" : "—"}</td>
      <td class="lb-total">${money(o.earned)}</td>
      <td class="lb-proj">${money(o.proj)}</td></tr>`).join("");
  $("#leaderboard").innerHTML = head + `<tbody>${body}</tbody>`;
  $("#lbNote").textContent = allDone
    ? "Group-stage money is locked. Knockout money lands as teams reach the QF, semis and lift the trophy."
    : "Earned = locked results only. Projected adds $5 for each team currently sitting top-2 of an unfinished group. * Qatar and Ivory Coast inherited the draft slots of Ukraine and Peru, who did not qualify.";
}

/* ================================================================
   next match ticker + status
   ================================================================ */
function renderNextMatch(standings) {
  const now = Date.now();
  let pick = null, live = false;
  for (const m of MATCHES) {
    const r = state.results[m.id];
    if (isLive(r)) { pick = m; live = true; break; }
  }
  if (!pick) pick = MATCHES.find(m => !isDone(state.results[m.id]) && new Date(m.utc).getTime() > now);
  const box = $("#nextMatch");
  if (!pick) { box.hidden = true; return; }
  box.hidden = false;
  let home = pick.home, away = pick.away;
  if (pick.stage !== "GROUP_STAGE") {
    const t = resolvedTeams(pick.slot, standings);
    home = t.home || descLabel(pick.slot.h); away = t.away || descLabel(pick.slot.a);
  }
  const fh = TEAMS[home] ? TEAMS[home].flag + " " : "";
  const fa = TEAMS[away] ? " " + TEAMS[away].flag : "";
  $("#nmLabel").textContent = live ? "● LIVE NOW" : "NEXT MATCH";
  $("#nmLabel").classList.toggle("is-live", live);
  $("#nmTeams").textContent = `${fh}${home} v ${away}${fa}`;
  if (live) {
    const r = state.results[pick.id];
    $("#nmCount").textContent = r.h != null ? `${r.h} : ${r.a} — ${V[pick.v][1]}` : V[pick.v][1];
  } else {
    const diff = new Date(pick.utc).getTime() - now;
    const d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5),
          mi = Math.floor(diff % 36e5 / 6e4), s = Math.floor(diff % 6e4 / 1e3);
    $("#nmCount").textContent =
      (d ? `${d}d ` : "") + `${h}h ${String(mi).padStart(2,"0")}m ${String(s).padStart(2,"0")}s · ${fmtTime(pick.utc)} · ${V[pick.v][1]}`;
  }
}

function renderStatus() {
  const dot = $("#statusDot"), txt = $("#statusText");
  const fmt = d => d.toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  if (state.dataTime) {
    const stale = Date.now() < TOURNAMENT_END && Date.now() - state.dataTime.getTime() > STALE_MS;
    dot.className = "dot " + (stale ? "err" : "ok");
    txt.textContent = (stale ? "STALE — data from " : "data ") + fmt(state.dataTime);
  } else if (state.feedOk) {
    dot.className = "dot ok";
    txt.textContent = "connected · no data timestamp";
  } else if (state.feedTime) {
    dot.className = "dot err"; txt.textContent = "feed unreachable";
  } else {
    dot.className = "dot"; txt.textContent = "snapshot";
  }
  $("#lastUpdated").textContent =
    (state.dataTime ? "data written " + state.dataTime.toLocaleString() : "no backend timestamp yet") +
    (state.feedTime ? " · checked " + state.feedTime.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" }) : "");
}

/* poll fast while a match is live, imminent, or possibly lagging in the feed */
function fastPollNeeded() {
  const now = Date.now();
  for (const m of MATCHES) {
    const r = state.results[m.id];
    if (isLive(r)) return true;
    if (isDone(r)) continue;
    const ko = new Date(m.utc).getTime();
    if (now > ko - 10 * 60e3 && now < ko + 3 * 3600e3) return true;
  }
  return false;
}
function scheduleNextFetch() {
  clearTimeout(state.fetchTimer);
  state.fetchTimer = setTimeout(async () => {
    if (!document.hidden) await fetchFeed(false);
    scheduleNextFetch();
  }, fastPollNeeded() ? POLL_FAST : POLL_SLOW);
}

/* ================================================================
   .ics export (currently filtered schedule)
   ================================================================ */
function downloadIcs(standings) {
  const f = state.filters;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WC26 Pool//EN", "X-WR-CALNAME:World Cup 2026 (The Pool)"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  for (const m of MATCHES) {
    let home = m.home, away = m.away;
    if (m.stage !== "GROUP_STAGE") {
      const t = resolvedTeams(m.slot, standings);
      home = t.home || descLabel(m.slot.h); away = t.away || descLabel(m.slot.a);
    }
    if (f.group && m.group !== f.group) continue;
    if (f.city && V[m.v][1] !== f.city) continue;
    if (f.team && home !== f.team && away !== f.team) continue;
    if (f.owner) {
      const ho = TEAMS[home] && TEAMS[home].owner, ao = TEAMS[away] && TEAMS[away].owner;
      if (ho !== f.owner && ao !== f.owner) continue;
    }
    const start = m.utc.replace(/[-:]/g, "");
    const end = new Date(new Date(m.utc).getTime() + 2 * 3600e3).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const tag = m.stage === "GROUP_STAGE" ? `Group ${m.group}` : STAGE_LABEL[m.stage];
    lines.push("BEGIN:VEVENT", `UID:${m.id}@wc26pool`, `DTSTAMP:${stamp}`,
      `DTSTART:${start}`, `DTEND:${end}`,
      `SUMMARY:⚽ ${home} v ${away} (${tag})`,
      `LOCATION:${V[m.v][0]}\\, ${V[m.v][1]}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type:"text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "worldcup2026-pool.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ================================================================
   rosters — lazy Wikipedia fetch per team
   ================================================================ */
const rosterCache = {};   // team name -> [{no, pos, name, club}] | {error}
const expandedRosters = new Set();

// single-letter codes appear on some Wikipedia pages (e.g. G, D, M, F)
const POS_ORDER = { GK:1, G:1, DF:2, D:2, MF:3, M:3, FW:4, F:4, AT:4 };
const POS_LABEL = { GK:"Goalkeepers", G:"Goalkeepers", DF:"Defenders", D:"Defenders",
                    MF:"Midfielders", M:"Midfielders", FW:"Forwards", F:"Forwards", AT:"Forwards" };

async function fetchRoster(team) {
  if (rosterCache[team]) return rosterCache[team];
  const slug = WIKI[team];
  if (!slug) { rosterCache[team] = { error:"No Wikipedia mapping" }; return rosterCache[team]; }
  try {
    // step 1: find "Current squad" section index
    const secRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${slug}&prop=sections&format=json&origin=*`);
    const secData = await secRes.json();
    if (!secData.parse) { rosterCache[team] = { error:"Page not found on Wikipedia" }; return rosterCache[team]; }
    const sec = secData.parse.sections.find(s => /current squad/i.test(s.line));
    if (!sec) { rosterCache[team] = { error:"No 'Current squad' section found" }; return rosterCache[team]; }

    // step 2: fetch that section's HTML
    const htmlRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=parse&page=${slug}&section=${sec.index}&prop=text&format=json&origin=*`);
    const htmlData = await htmlRes.json();
    const html = htmlData.parse?.text?.["*"];
    if (!html) { rosterCache[team] = { error:"Empty section" }; return rosterCache[team]; }

    const players = parseSquadHtml(html);
    rosterCache[team] = players.length ? players : { error:"Could not parse squad table" };
  } catch (e) {
    rosterCache[team] = { error: e.message };
  }
  return rosterCache[team];
}

function parseSquadHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const players = [];

  for (const table of doc.querySelectorAll("table.wikitable")) {
    // Use the row with the most <th> cells as the column header row.
    // This skips title rows like <th colspan="7">2026 FIFA World Cup squad</th>
    // and position-group rows like <th colspan="7">Goalkeepers</th>.
    const headerCells = [...table.querySelectorAll("tr")]
      .map(r => [...r.querySelectorAll("th")])
      .reduce((best, cells) => cells.length > best.length ? cells : best, []);
    if (headerCells.length < 3) continue;
    const ths = headerCells.map(th => th.textContent.trim().toLowerCase());
    const noIdx   = ths.findIndex(h => /^no\.?$/.test(h));
    const posIdx  = ths.findIndex(h => /^pos/i.test(h));
    const nameIdx = ths.findIndex(h => /player|name/i.test(h));
    const clubIdx = ths.findIndex(h => /club/i.test(h));
    if (nameIdx === -1 || clubIdx === -1) continue;

    // tracks position when table uses section-header rows instead of a Pos. column
    let sectionPos = "?";
    for (const row of table.querySelectorAll("tbody tr")) {
      if (!row.querySelector("td")) {
        // position-group header row (e.g. <th colspan="7">Goalkeepers</th>)
        const hdr = row.querySelector("th")?.textContent.toLowerCase() || "";
        if (/goal/i.test(hdr))                         sectionPos = "GK";
        else if (/defend/i.test(hdr))                  sectionPos = "DF";
        else if (/midfield/i.test(hdr))                sectionPos = "MF";
        else if (/forward|attack|striker/i.test(hdr))  sectionPos = "FW";
        continue;
      }
      const cells = [...row.querySelectorAll("td, th")]; // th[scope=row] holds player name
      if (cells.length < 3) continue;
      const get = i => i >= 0 && cells[i] ? cells[i] : null;
      const txt = el => el?.textContent.replace(/\[.*?\]/g, "").trim() || "";
      const link = el => el?.querySelector("a")?.textContent.replace(/\[.*?\]/g, "").trim() || txt(el);
      const no   = txt(get(noIdx)) || "—";
      const rawPos = posIdx >= 0 ? txt(get(posIdx)).toUpperCase().replace(/[^A-Z]/g, "") : "";
      const pos  = rawPos.slice(0, 2) || sectionPos;
      const name = link(get(nameIdx));
      const club = link(get(clubIdx));
      if (name && name.length > 1) players.push({ no, pos, name, club });
    }
    if (players.length) break; // first matching table is the squad
  }
  return players;
}

function renderRosters() {
  const st = window.__standings || computeStandings();
  let html = "";

  // --- Playing Now ---
  const liveMatches = MATCHES.filter(m => isLive(state.results[m.id]));
  if (liveMatches.length) {
    const liveTeams = [];
    for (const m of liveMatches) {
      let home = m.home, away = m.away;
      if (m.stage !== "GROUP_STAGE") {
        const t = resolvedTeams(m.slot, st);
        home = t.home; away = t.away;
      }
      if (home && TEAMS[home]) liveTeams.push(home);
      if (away && TEAMS[away]) liveTeams.push(away);
    }
    if (liveTeams.length) {
      // kick off fetches; re-render when each lands
      for (const team of liveTeams) {
        if (!rosterCache[team]) {
          fetchRoster(team).then(() => { if (state.view === "rosters") renderRosters(); });
        }
      }
      const pnCards = liveTeams.map(team => {
        const t = TEAMS[team]; const o = OWNERS[t.owner];
        return `<div class="roster-card pn-card" data-team="${esc(team)}" style="--oc:${o.color}">
          <div class="rc-h"><span class="flag r-flag">${t.flag}</span>
            <span class="r-name">${esc(team)}</span>
            <span class="r-meta">Group ${t.group} · <span style="color:${o.color}">${t.owner}</span></span>
          </div>${renderRosterBody(team, rosterCache[team])}</div>`;
      }).join("");
      html += `<div class="pn-section">
        <div class="pn-label">⚽ PLAYING NOW</div>
        <div class="pn-grid">${pnCards}</div>
      </div>`;
    }
  }

  // --- Main grid (alphabetical, filtered) ---
  const teams = Object.keys(TEAMS)
    .filter(t => !state.rosterOwner || TEAMS[t].owner === state.rosterOwner)
    .filter(t => !state.rosterGroup  || TEAMS[t].group  === state.rosterGroup)
    .sort((a, b) => a.localeCompare(b));

  const cards = teams.map((team, i) => {
    const t = TEAMS[team]; const o = OWNERS[t.owner];
    const expanded = expandedRosters.has(team);
    return `<div class="roster-card${expanded ? " expanded" : ""}" data-team="${esc(team)}"
        style="--oc:${o.color};animation-delay:${Math.min(i, 16) * 25}ms">
      <div class="rc-h">
        <span class="flag r-flag">${t.flag}</span>
        <span class="r-name">${esc(team)}</span>
        <span class="r-meta">Group ${t.group} · <span style="color:${o.color}">${t.owner}</span></span>
        <span class="r-chevron">${expanded ? "▲" : "▼"}</span>
      </div>
      ${expanded ? renderRosterBody(team, rosterCache[team]) : ""}
    </div>`;
  }).join("");

  html += `<div class="roster-main-grid">${cards}</div>`;
  $("#rosterGrid").innerHTML = html;
}

function renderRosterBody(team, cached) {
  if (!cached) return `<div class="rc-body"><div class="rc-loading">Loading squad…</div></div>`;
  if (cached.error) return `<div class="rc-body"><div class="rc-err">${esc(cached.error)}</div></div>`;

  // normalise all positions to the canonical 2-letter form for grouping
  const norm = pos => ({ G:"GK", D:"DF", M:"MF", F:"FW", AT:"FW" }[pos] || (POS_ORDER[pos] ? pos : "?"));
  const byPos = { GK:[], DF:[], MF:[], FW:[], "?":[] };
  for (const p of cached) byPos[norm(p.pos)].push(p);
  const POS_CSS = { GK:"gk", DF:"df", MF:"mf", FW:"fw" };
  const rows = Object.entries(byPos)
    .filter(([, arr]) => arr.length)
    .sort(([a], [b]) => (POS_ORDER[a] || 9) - (POS_ORDER[b] || 9))
    .map(([pos, arr]) => `
      <div class="pos-group">
        <div class="pos-label pos-${POS_CSS[pos] || "other"}">${POS_LABEL[pos] || "Other"}</div>
        ${arr.map(p => `<div class="player-row"><span class="p-no">${p.no}</span><span class="p-name">${esc(p.name)}</span><span class="p-club">${esc(p.club)}</span></div>`).join("")}
      </div>`).join("");
  const wikiSlug = WIKI[team];
  const wikiUrl = wikiSlug ? `https://en.wikipedia.org/wiki/${wikiSlug}#Current_squad` : "#";
  return `<div class="rc-body">${rows}<a class="rc-wiki" href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia ↗</a></div>`;
}

async function toggleRoster(team) {
  if (expandedRosters.has(team)) {
    expandedRosters.delete(team);
    renderRosters();
    return;
  }
  expandedRosters.add(team);
  renderRosters();                          // show "Loading…" immediately
  await fetchRoster(team);
  if (expandedRosters.has(team)) renderRosters(); // re-render with data
}

/* ================================================================
   odds
   ================================================================ */
async function fetchOddsData() {
  try {
    const res = await fetch("odds.json?_=" + Math.floor(Date.now() / 60000), { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    if (json?.matches) {
      state.odds = json.matches;
      if (state.view === "schedule") renderSchedule(window.__standings || computeStandings());
    }
  } catch (e) { console.warn("odds fetch:", e.message); }
}

/* ================================================================
   wiring
   ================================================================ */
function renderAll() {
  const standings = computeStandings();
  const pool = computePool(standings);
  renderSchedule(standings);
  renderGroups(standings, pool);
  renderBracket(standings);
  renderOwners(pool);
  renderPayouts(pool, standings);
  renderRosters();
  renderNextMatch(standings);
  renderStatus();
  window.__standings = standings; // for next-match ticker reuse
}

function initControls() {
  // filter dropdowns
  const owners = Object.keys(OWNERS);
  $("#fOwner").innerHTML += owners.map(o => `<option>${o}</option>`).join("");
  $("#fTeam").innerHTML += Object.keys(TEAMS).sort()
    .map(t => `<option value="${esc(t)}">${TEAMS[t].flag} ${esc(t)}</option>`).join("");
  $("#fGroup").innerHTML += GROUPS.map(g => `<option value="${g}">Group ${g}</option>`).join("");
  $("#fCity").innerHTML += [...new Set(V.map(v => v[1]))].sort()
    .map(c => `<option>${c}</option>`).join("");
  $("#fTz").innerHTML = TZ_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

  const bind = (id, key) => $(id).addEventListener("change", e => {
    state.filters[key] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    renderAll();
  });
  bind("#fOwner", "owner"); bind("#fTeam", "team"); bind("#fGroup", "group");
  bind("#fCity", "city"); bind("#fUpcoming", "upcoming");
  $("#fTz").addEventListener("change", e => { state.tz = e.target.value; renderAll(); });
  $("#clearFilters").addEventListener("click", () => {
    state.filters = { owner:"", team:"", group:"", city:"", upcoming:false };
    for (const id of ["#fOwner", "#fTeam", "#fGroup", "#fCity"]) $(id).value = "";
    $("#fUpcoming").checked = false;
    renderAll();
  });
  $("#icsBtn").addEventListener("click", () => downloadIcs(window.__standings || computeStandings()));
  $("#refreshBtn").addEventListener("click", () => fetchFeed(true));

  // tabs
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
    state.view = btn.dataset.view;
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== "view-" + state.view);
  }));

  // rosters filters
  $("#rOwner").innerHTML += Object.keys(OWNERS).map(o => `<option>${o}</option>`).join("");
  $("#rOwner").addEventListener("change", e => {
    state.rosterOwner = e.target.value; expandedRosters.clear(); renderRosters();
  });
  $("#rGroup").innerHTML += GROUPS.map(g => `<option value="${g}">Group ${g}</option>`).join("");
  $("#rGroup").addEventListener("change", e => {
    state.rosterGroup = e.target.value; expandedRosters.clear(); renderRosters();
  });

  // roster card click — skip pn-cards (always open while live)
  $("#rosterGrid").addEventListener("click", e => {
    const card = e.target.closest(".roster-card");
    if (card && !card.classList.contains("pn-card")) toggleRoster(card.dataset.team);
  });
}

if (typeof document !== "undefined") {
  initControls();
  loadCachedFeed();
  renderAll();
  fetchFeed(false).then(scheduleNextFetch);
  fetchOddsData();
  setInterval(fetchOddsData, 5 * 60e3);
  setInterval(() => renderNextMatch(window.__standings || computeStandings()), 1000);
  setInterval(renderStatus, 30e3);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { fetchFeed(false).then(scheduleNextFetch); fetchOddsData(); }
  });
}

/* node test hook */
if (typeof module !== "undefined") {
  module.exports = { TEAMS, OWNERS, GM, KO, MATCHES, computeStandings, computePool, state, applyFeed, V, GROUP_TEAMS };
}
