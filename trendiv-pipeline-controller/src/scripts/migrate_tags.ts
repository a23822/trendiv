import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 1. 환경 변수 로드
const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

// 실행 옵션 파싱
const args = process.argv.slice(2);
const IS_DRY_RUN = !args.includes("--execute");
const LIMIT = args.includes("--limit")
  ? parseInt(args[args.indexOf("--limit") + 1], 10)
  : undefined;

// [초대형 태그 매핑 테이블 - Ultimate Edition]
const TAG_ALIASES: Record<string, string> = {
  // ==========================================
  // 1. AI & Machine Learning (기존 + 추가)
  // ==========================================
  ai: "AI",
  aiagent: "AI",
  aiagents: "AI",
  aitool: "AI",
  aitools: "AI",
  aitrend: "AI",
  generativeai: "AI",
  genai: "AI",
  llm: "AI",
  llmengineering: "AI",
  localllm: "AI",
  localexecution: "AI",
  machinelearning: "AI",
  ml: "AI",
  deeplearning: "AI",
  chatgpt: "AI",
  gemini: "AI",
  claude: "AI",
  copilot: "AI",
  midjourney: "AI",
  openai: "AI",
  vertexai: "AI",
  xai: "AI",
  rag: "AI",
  prompt: "AI",
  prompting: "AI",
  generalai: "AI",
  generativeui: "AI",
  aicritique: "AI",
  aiimpact: "AI",
  aicoding: "AI",
  aidesign: "AI",
  aielements: "AI",
  aiexperience: "AI",
  aihype: "AI",
  aiinfrastructure: "AI",
  aiprivacy: "AI",
  aiproductivity: "AI",
  aitooling: "AI",
  aiui: "AI",
  aiux: "AI",
  aiworkflow: "AI",
  aiupscaling: "AI",
  ainative: "AI",
  aisdk: "AI",
  aigateway: "AI",
  algorithm: "AI",
  agent: "AI",
  llmbenchmark: "AI",

  // ==========================================
  // 2. CSS & Styling (기존 + 추가)
  // ==========================================
  css: "CSS",
  css3: "CSS",
  moderncss: "CSS",
  tailwindcss: "Tailwind CSS",
  tailwind: "Tailwind CSS",
  shadcn: "Shadcn UI",
  shadcnui: "Shadcn UI",
  scss: "SASS",
  sass: "SASS",
  less: "SASS",
  stylus: "SASS",
  cssinjs: "CSS-in-JS",
  flexbox: "CSS",
  grid: "CSS",
  cssgrid: "CSS",
  subgrid: "CSS",
  masonry: "CSS",
  containerqueries: "CSS",
  mediaqueries: "CSS",
  responsive: "CSS",
  darkmode: "CSS",
  gradient: "CSS",
  conicgradient: "CSS",
  clippath: "CSS",
  mask: "CSS",
  filter: "CSS",
  backdropfilter: "CSS",
  transform: "CSS",
  transition: "CSS",
  animation: "CSS",
  cssanimation: "CSS",
  viewtransitions: "CSS",
  scrolldrivenanimations: "CSS",
  scrollsnap: "CSS",
  aspectratio: "CSS",
  clamp: "CSS",
  calc: "CSS",
  oklch: "CSS",
  has: "CSS",
  layer: "CSS",
  scope: "CSS",
  property: "CSS",
  bfc: "CSS",
  layoutbug: "CSS",
  layoutengineering: "CSS",
  css3d: "CSS",
  css4: "CSS",
  cssarchitecture: "CSS",
  cssart: "CSS",
  cssbattle: "CSS",
  cssbasics: "CSS",
  cssconvention: "CSS",
  csscontainment: "CSS",
  csscustomproperties: "CSS",
  cssdebugging: "CSS",
  csseffects: "CSS",
  cssfunctions: "CSS",
  csshack: "CSS",
  csshoudini: "CSS",
  cssif: "CSS",
  csslayers: "CSS",
  csslayout: "CSS",
  cssloading: "CSS",
  cssmask: "CSS",
  cssmasking: "CSS",
  cssmediaqueries: "CSS",
  cssmodules: "CSS",
  cssom: "CSS",
  cssonly: "CSS",
  cssoptimization: "CSS",
  cssregions: "CSS",
  cssselectors: "CSS",
  cssspec: "CSS",
  cssstyling: "CSS",
  cssunits: "CSS",
  cssvariables: "CSS",
  cssviewtransitions: "CSS",
  csswg: "CSS",
  cssworkflow: "CSS",
  advancedcss: "CSS",
  atomiccss: "CSS",
  basiccss: "CSS",
  emailcss: "CSS",
  inlinecss: "CSS",
  utilityfirst: "CSS",
  vanillacss: "CSS",
  gradientanimation: "CSS",
  gradients: "CSS",
  masking: "CSS",
  mathfunctions: "CSS",
  mathincss: "CSS",
  cascadelayers: "CSS",
  cascade: "CSS",
  pseudoclass: "CSS",
  pseudoclasses: "CSS",
  selectivity: "CSS",
  selectorhack: "CSS",
  selectors: "CSS",
  selectorslevel4: "CSS",
  specificity: "CSS",
  stylequeries: "CSS",
  stylelint: "CSS",
  anchorpositioning: "CSS",
  boxmodel: "CSS",
  center: "CSS",
  color: "CSS",
  colorlevel4: "CSS",
  colorspace: "CSS",
  colorsystem: "CSS",
  gridlanes: "CSS",
  intrinsicsize: "CSS",
  layoutbasics: "CSS",
  layoutengine: "CSS",
  layoutglitch: "CSS",
  layoutshifting: "CSS",
  layoutspec: "CSS",
  leadingtrim: "CSS",
  motion: "CSS",
  objectfit: "CSS",
  positioning: "CSS",
  relativecolors: "CSS",
  responsivedesign: "CSS",
  responsiveimages: "CSS",
  responsiveweb: "CSS",
  scroll: "CSS",
  scrolldriven: "CSS",
  scrolllocking: "CSS",
  scrollstate: "CSS",
  smoothscroll: "CSS",
  textboxtrim: "CSS",
  textdecoration: "CSS",
  trigonometry: "CSS",
  viewportunits: "CSS",
  zindex: "CSS",
  dvh: "CSS",
  fluidlayout: "CSS",
  safearea: "CSS",
  contentstrategy: "CSS",
  deepcss: "CSS",
  futurecss: "CSS",

  // ==========================================
  // 3. Hardware & Components (기존 + 추가)
  // ==========================================
  hardware: "Hardware",
  "8bitdo": "Hardware",
  amd: "Hardware",
  cpu: "Hardware",
  gpu: "Hardware",
  nvidia: "Hardware",
  intel: "Hardware",
  intelme: "Hardware",
  ddr5: "Hardware",
  ram: "Hardware",
  nvme: "Hardware",
  oled: "Hardware",
  rgb: "Hardware",
  hdmi: "Hardware",
  displayport: "Hardware",
  soc: "Hardware",
  cooling: "Hardware",
  overclocking: "Hardware",
  pcbuild: "Hardware",
  pcbuilding: "Hardware",
  pccomponents: "Hardware",
  airplay2: "Hardware",
  batterylife: "Hardware",
  display: "Hardware",
  dlss: "Hardware",
  dma: "Hardware",
  dram: "Hardware",
  drivers: "Hardware",
  gadget: "Hardware",
  gadgets: "Hardware",
  gamingmonitor: "Hardware",
  gamingtech: "Hardware",
  hardwarebug: "Hardware",
  hardwareissue: "Hardware",
  htpc: "Hardware",
  macbook: "Hardware",
  mechanicalkeyboard: "Hardware",
  materialscience: "Hardware",
  monitor: "Hardware",
  peripheral: "Hardware",
  pcmaintenance: "Hardware",
  retrocomputing: "Hardware",
  smarttv: "Hardware",
  wif7: "Hardware",
  widegamut: "Hardware",
  xiaomi: "Hardware",
  consumerelectronics: "Hardware",
  highdpi: "Hardware",
  pixeldensity: "Hardware",

  // ==========================================
  // 4. Accessibility (기존 + 추가)
  // ==========================================
  accessibility: "Accessibility",
  a11y: "Accessibility",
  wcag: "Accessibility",
  wcag22: "Accessibility",
  "wcag2.2": "Accessibility",
  aria: "Accessibility",
  waiaria: "Accessibility",
  screenreader: "Accessibility",
  nvda: "Accessibility",
  jaws: "Accessibility",
  voiceover: "Accessibility",
  talkback: "Accessibility",
  atag: "Accessibility",
  section508: "Accessibility",
  trustedtester: "Accessibility",
  keyboardnavigation: "Accessibility",
  focusmanagement: "Accessibility",
  contrast: "Accessibility",
  pdfua: "Accessibility",
  tts: "Accessibility",
  voicecontrol: "Accessibility",
  eaa: "Accessibility",
  andi: "Accessibility",
  a11ybasic: "Accessibility",
  a11ygeneral: "Accessibility",
  accessibilityfeatures: "Accessibility",
  accessibilitystandards: "Accessibility",
  accessibilitystrategy: "Accessibility",
  accessibilitytesting: "Accessibility",
  accessibilitytool: "Accessibility",
  accessibilitytoolbar: "Accessibility",
  adacompliance: "Accessibility",
  assistivetech: "Accessibility",
  assistivetechnology: "Accessibility",
  axe: "Accessibility",
  axecore: "Accessibility",
  chromeaccessibility: "Accessibility",
  chromevox: "Accessibility",
  cognitiveaccessibility: "Accessibility",
  en301549: "Accessibility",
  focusvisible: "Accessibility",
  generalaccessibility: "Accessibility",
  inclusivedesign: "Accessibility",
  keyboardaccessibility: "Accessibility",
  keyboardinteraction: "Accessibility",
  lighthouse: "Accessibility",
  offlineaccessibility: "Accessibility",
  physicalaccessibility: "Accessibility",
  readability: "Accessibility",
  socialaccessibility: "Accessibility",
  visuala11y: "Accessibility",
  visuallearning: "Accessibility",
  wave: "Accessibility",
  webaccessibility: "Accessibility",
  webcompliance: "Accessibility",
  arialive: "Accessibility",
  cpacc: "Accessibility",
  textinputbug: "Accessibility",
  focusorder: "Accessibility",
  alttext: "Accessibility",

  // ==========================================
  // 5. Native App / Mobile (기존 + 추가)
  // ==========================================
  nativeapp: "Native App",
  mobileapp: "Native App",
  ios: "iOS",
  swift: "iOS",
  swiftui: "iOS",
  xcode: "iOS",
  widgetkit: "iOS",
  coredata: "iOS",
  corelocation: "iOS",
  corebluetooth: "iOS",
  ble: "Native App",
  bluetooth: "Native App",
  android: "Android",
  kotlin: "Android",
  jetpackcompose: "Android",
  retrofit: "Android",
  paging3: "Android",
  kmp: "Native App",
  "kotlin multiplatform": "Native App",
  flutter: "Native App",
  reactnative: "Native App",
  alamofire: "Native App",
  androidnative: "Native App",
  androiddev: "Native App",
  androidstudio: "Native App",
  aosp: "Native App",
  appdevelopment: "Native App",
  appdistribution: "Native App",
  appimage: "Native App",
  appkit: "Native App",
  appops: "Native App",
  appreview: "Native App",
  appscam: "Native App",
  appshowcase: "Native App",
  appstore: "Native App",
  appsubmission: "Native App",
  appupdate: "Native App",
  appium: "Native App",
  apple: "Native App",
  appleintelligence: "Native App",
  applepay: "Native App",
  applepolicy: "Native App",
  applewallet: "Native App",
  applemusic: "Native App",
  aso: "Native App",
  admob: "Native App",
  capacitor: "Native App",
  cloudkit: "Native App",
  codenameone: "Native App",
  expo: "Native App",
  fastlane: "Native App",
  googleplay: "Native App",
  googleplayconsole: "Native App",
  gradle: "Native App",
  iap: "Native App",
  iosnative: "Native App",
  mobiledev: "Native App",
  mobilefirst: "Native App",
  mobilegaming: "Native App",
  mobilegesture: "Native App",
  mobileos: "Native App",
  mobileperformance: "Native App",
  mobileplatform: "Native App",
  mobilerendering: "Native App",
  mobileresponsive: "Native App",
  mobileui: "Native App",
  mobileux: "Native App",
  mobileweb: "Native App",
  nativemessaging: "Native App",
  nativemobile: "Native App",
  nativemodules: "Native App",
  nativedev: "Native App",
  nativedevelopment: "Native App",
  nativeui: "Native App",
  nativewidget: "Native App",
  pushnotifications: "Native App",
  storekit: "Native App",
  watchconnectivity: "Native App",
  webview: "Native App",
  webview2: "Native App",
  wkwebview: "Native App",
  widget: "Native App",
  nativebuild: "Native App",

  // ==========================================
  // 6. Tooling & Dev Tools (기존 + 추가)
  // ==========================================
  tooling: "Tooling",
  devtools: "Tooling",
  vscode: "Tooling",
  ide: "Tooling",
  jetbrains: "Tooling",
  hotreload: "Tooling",
  codereview: "Tooling",
  lint: "Tooling",
  eslint: "Tooling",
  prettier: "Tooling",
  biome: "Tooling",
  cli: "Tooling",
  terminal: "Tooling",
  adventofcode: "Tooling",
  codegolf: "Tooling",
  codequality: "Tooling",
  ast: "Tooling",
  audit: "Tooling",
  automation: "Tooling",
  builderror: "Tooling",
  buildsystem: "Tooling",
  bundling: "Tooling",
  cicd: "Tooling",
  codepen: "Tooling",
  coding: "Tooling",
  codingtools: "Tooling",
  debugging: "Tooling",
  devtool: "Tooling",
  developertools: "Tooling",
  developmentenvironment: "Tooling",
  documenttool: "Tooling",
  editor: "Tooling",
  errorhandling: "Tooling",
  extension: "Tooling",
  extensions: "Tooling",
  github: "Tooling",
  gitlab: "Tooling",
  git: "Tooling",
  linter: "Tooling",
  npm: "Tooling",
  pnpm: "Tooling",
  yarn: "Tooling",
  troubleshooting: "Tooling",
  utility: "Tooling",
  workflow: "Tooling",
  wysiwyg: "Tooling",
  graphicstools: "Tooling",
  webtooling: "Tooling",

  // ==========================================
  // 7. Rendering & Performance (기존 + 추가)
  // ==========================================
  rendering: "Rendering",
  reflow: "Rendering",
  repaint: "Rendering",
  reflowrepaint: "Rendering",
  fouc: "Rendering",
  layoutshift: "Rendering",
  performance: "Performance",
  webvitals: "Performance",
  corewebvitals: "Performance",
  lcp: "Performance",
  cls: "Performance",
  inp: "Performance",
  "60fps": "Performance",
  benchmarking: "Performance",
  browserlifecycle: "Performance",
  browserlogic: "Performance",
  browserparsing: "Performance",
  browserupdate: "Performance",
  caching: "Performance",
  costoptimization: "Performance",
  criticalpath: "Performance",
  criticalrenderingpath: "Performance",
  efficiency: "Performance",
  fontloadingapi: "Performance",
  fontoptimization: "Performance",
  fonts: "Performance",
  imageoptimization: "Performance",
  lazyloading: "Performance",
  maintenance: "Performance",
  memorymanagement: "Performance",
  offscreen: "Performance",
  weboptimization: "Performance",
  browserrendering: "Rendering",
  renderingengine: "Rendering",
  webarchiving: "Rendering",
  webfx: "Rendering",
  webrendering: "Rendering",

  // ==========================================
  // 8. Backend / Infra (기존 + 추가)
  // ==========================================
  backend: "Backend",
  server: "Backend",
  database: "Backend",
  devops: "Backend",
  docker: "Backend",
  kubernetes: "Backend",
  aws: "Backend",
  vercel: "Backend",
  netlify: "Backend",
  cloudflare: "Backend",
  selfhosting: "Backend",
  homelab: "Backend",
  nas: "Backend",
  linux: "Backend",
  os: "Backend",
  windows: "Backend",
  macos: "Backend",
  ansible: "Backend",
  api: "Backend",
  apidesign: "Backend",
  authentication: "Backend",
  auth: "Backend",
  backendintegration: "Backend",
  buildpipeline: "Backend",
  cloud: "Backend",
  cloudinary: "Backend",
  cms: "Backend",
  cors: "Backend",
  cron: "Backend",
  csp: "Backend",
  cybersecurity: "Backend",
  datahandling: "Backend",
  datamanagement: "Backend",
  deployment: "Backend",
  dns: "Backend",
  domain: "Backend",
  edgecomputing: "Backend",
  edgefunctions: "Backend",
  edgemiddleware: "Backend",
  firewall: "Backend",
  flatpak: "Backend",
  gdpr: "Backend",
  graphql: "Backend",
  homeassistant: "Backend",
  homeserver: "Backend",
  http: "Backend",
  httpheaders: "Backend",
  httprequest: "Backend",
  http3: "Backend",
  https: "Backend",
  iac: "Backend",
  infra: "Backend",
  infrastructure: "Backend",
  jellyfin: "Backend",
  jwt: "Backend",
  k8s: "Backend",
  legacycms: "Backend",
  localhosting: "Backend",
  localhost: "Backend",
  mcp: "Backend",
  mysql: "Backend",
  nosql: "Backend",
  oauth: "Backend",
  openssl: "Backend",
  postgresql: "Backend",
  privacy: "Backend",
  privacysandbox: "Backend",
  proxmox: "Backend",
  redis: "Backend",
  restapi: "Backend",
  securityblock: "Backend",
  securitycheck: "Backend",
  sql: "Backend",
  supabase: "Backend",
  trpc: "Backend",
  websecurity: "Backend",
  webserver: "Backend",
  xss: "Backend",
  headlesscms: "Backend",
  mongodb: "Backend",
  firebase: "Backend",
  backendnews: "Backend",

  // ==========================================
  // 9. Events / News / Misc (기존 + 추가)
  // ==========================================
  events: "Events",
  wwdc: "Events",
  wwdc24: "Events",
  wwdc25: "Events",
  ces: "Events",
  ces2026: "Events",
  kickstarter: "Events",
  conference: "Events",
  webinar: "Events",

  news: "News",
  productupdate: "News",
  marketanalysis: "News",
  industrytrend: "News",
  industryanalysis: "News",
  industrynews: "News",
  markettrend: "News",
  productnews: "News",
  techreview: "News",
  vlog: "News",
  webtrends: "News",
  webcomic: "News",

  "off-topic": "Off-topic",
  irrelevant: "Off-topic",
  meme: "Off-topic",
  lowvalue: "Off-topic",
  nocontent: "Off-topic",
  nontech: "Off-topic",
  nonweb: "Off-topic",
  rejected: "Off-topic",
  scam: "Off-topic",
  invalid: "Off-topic",
  "404error": "Off-topic",
  agency: "Off-topic",
  agencystrategy: "Off-topic",
  agencyworkflow: "Off-topic",
  aggregator: "Off-topic",
  antipattern: "Off-topic",
  blog: "Off-topic",
  bugreport: "Off-topic",
  cognitivebias: "Off-topic",
  community: "Off-topic",
  communityissues: "Off-topic",
  consumertech: "Off-topic",
  counterstrike: "Off-topic",
  crashreport: "Off-topic",
  deleted: "Off-topic",
  deletedcontent: "Off-topic",
  discarded: "Off-topic",
  discussion: "Off-topic",
  dropped: "Off-topic",
  humor: "Off-topic",
  invalidcontent: "Off-topic",
  invaliddata: "Off-topic",
  invalidlink: "Off-topic",
  invalidsource: "Off-topic",
  journalism: "Off-topic",
  legal: "Off-topic",
  lowquality: "Off-topic",
  misleading: "Off-topic",
  nontechnical: "Off-topic",
  outofscope: "Off-topic",
  promotion: "Off-topic",
  quiz: "Off-topic",
  reddit: "Off-topic",
  reject: "Off-topic",
  showcase: "Off-topic",
  sideproject: "Off-topic",
  socialchatter: "Off-topic",
  socialmedia: "Off-topic",
  speculationrules: "Off-topic",
  sportsbroadcasting: "Off-topic",
  webculture: "Off-topic",
  wiki: "Off-topic",
  youtube: "Off-topic",
  youtubeapi: "Off-topic",
  deal: "Off-topic",
  deals: "Off-topic",
  investment: "Off-topic",
  donation: "Off-topic",

  // ==========================================
  // 10. Basic & Others (기존 + 추가)
  // ==========================================
  basic: "Basic",
  beginner: "Basic",
  fundamentals: "Basic",
  tutorial: "Basic",
  guide: "Basic",
  freelancing: "Career",
  seo: "SEO",
  marketing: "Marketing",
  opensource: "Open Source",
  basics: "Basic",
  cheatsheet: "Basic",
  course: "Basic",
  curriculum: "Basic",
  education: "Basic",
  educationroadmap: "Basic",
  entrylevel: "Basic",
  example: "Basic",
  exercise: "Basic",
  faq: "Basic",
  fundamental: "Basic",
  generalinquiry: "Basic",
  glossary: "Basic",
  howto: "Basic",
  intro: "Basic",
  introduction: "Basic",
  junior: "Basic",
  learning: "Basic",
  learningpath: "Basic",
  learningroadmap: "Basic",
  lesson: "Basic",
  novice: "Basic",
  philosophy: "Basic",
  practice: "Basic",
  roadmap: "Basic",
  study: "Basic",
  terminology: "Basic",
  tip: "Basic",
  tips: "Basic",
  training: "Basic",
  usertip: "Basic",
  walkthrough: "Basic",
  workshop: "Basic",
  "101": "Basic",
  bestpractice: "Basic",
  bestpractices: "Basic",
  generaltips: "Basic",
  history: "Basic",
  programmingfundamentals: "Basic",
  userstylesheet: "Basic",
  webstandards: "Basic",
  webstandard: "Basic",
  w3c: "Basic",
  whatwg: "Basic",
  webspec: "Basic",
  webspecs: "Basic",
  mdn: "Basic",
  spec: "Basic",
  userstylesheeet: "Basic",

  // ==========================================
  // 11. Framework (신설: 프론트/백엔드 프레임워크 관련)
  // ==========================================
  framework: "Framework",
  angular: "Framework",
  astro: "Framework",
  blazor: "Framework",
  deno: "Framework",
  django: "Framework",
  dotvvm: "Framework",
  express: "Framework",
  fastapi: "Framework",
  gatsby: "Framework",
  hono: "Framework",
  nextjs: "Framework",
  nuxt: "Framework",
  qwik: "Framework",
  react: "Framework",
  remix: "Framework",
  solidjs: "Framework",
  svelte: "Framework",
  vue: "Framework",
  wordpress: "Framework",
  approuter: "Framework",
  boilerplate: "Framework",
  bootstrap: "Framework",
  componentlibrary: "Framework",
  compose: "Framework",
  foundation: "Framework",
  frameworkconfig: "Framework",
  gutenberg: "Framework",
  ktor: "Framework",
  leafylet: "Framework",
  microfrontends: "Framework",
  radixui: "Framework",
  radix: "Framework",
  rscss: "Framework",
  routing: "Framework",
  "shadcn/ui": "Framework",
  webflow: "Framework",
  divi: "Framework",
  divi5: "Framework",
  daisyui: "Framework",
  "media-chrome": "Framework",

  // ==========================================
  // 12. Browser (신설: 브라우저 관련)
  // ==========================================
  browser: "Browser",
  blink: "Browser",
  brave: "Browser",
  browserapi: "Browser",
  browserapis: "Browser",
  browserbug: "Browser",
  browserdevtools: "Browser",
  browserengine: "Browser",
  browserextension: "Browser",
  browserinternal: "Browser",
  browserinternals: "Browser",
  browseros: "Browser",
  browserruntime: "Browser",
  browsers: "Browser",
  browsersupport: "Browser",
  chrome: "Browser",
  chrome133: "Browser",
  chrome144: "Browser",
  chromecanary: "Browser",
  chromeextension: "Browser",
  chromeextensions: "Browser",
  chromeos: "Browser",
  chromium: "Browser",
  edge: "Browser",
  firefox: "Browser",
  firefox147: "Browser",
  gecko: "Browser",
  inappbrowser: "Browser",
  iossafari: "Browser",
  iosmail: "Browser",
  safari: "Browser",
  safariextension: "Browser",
  webkit: "Browser",
  browser_engine: "Browser",

  // ==========================================
  // 13. Design (신설: 디자인/UI/UX 관련)
  // ==========================================
  design: "Design",
  designtocode: "Design",
  designethics: "Design",
  designpattern: "Design",
  designphilosophy: "Design",
  designresearch: "Design",
  designsystem: "Design",
  designsystems: "Design",
  designtokens: "Design",
  designtool: "Design",
  designtools: "Design",
  designtrends: "Design",
  designbasics: "Design",
  emergencyux: "Design",
  figma: "Design",
  framer: "Design",
  graphicdesign: "Design",
  graphics: "Design",
  herosection: "Design",
  interfacedesign: "Design",
  materialdesign: "Design",
  retroui: "Design",
  retrodesign: "Design",
  smashingmagazine: "Design",
  squircle: "Design",
  streamingui: "Design",
  uipattern: "Design",
  uiux: "Design",
  ux: "Design",
  uxui: "Design",
  uxlogic: "Design",
  usertrust: "Design",
  userexperience: "Design",
  user_experience: "Design",
  hig: "Design",
  hci: "Design",
  minimalism: "Design",
  overlay: "Design",
  presentation: "Design",
  singlediv: "Design",
  tablelayout: "Design",
  tvui: "Design",
  typography: "Design",
  ui: "Design",
  webdesign: "Design",
  webui: "Design",
  cybercorecss: "Design",
  cyberpunk: "Design",
  dashboardui: "Design",
  fluidui: "Design",
  glassmorphism: "Design",
  hero: "Design",
  interactiveui: "Design",
  modernui: "Design",
  retro: "Design",
  universaldesign: "Design",
  visualdesign: "Design",

  // ==========================================
  // 14. HTML / Markup (신설)
  // ==========================================
  html: "HTML",
  html5: "HTML",
  markup: "HTML",
  xhtml: "HTML",
  markuparchitecture: "HTML",
  markupcleaning: "HTML",
  markupcritique: "HTML",
  markupengineering: "HTML",
  markupoptimization: "HTML",
  markupstrategy: "HTML",
  markuptool: "HTML",
  markuptricks: "HTML",
  markuputils: "HTML",
  basichtml: "HTML",
  htmlbasics: "HTML",
  htmlcss: "HTML",
  htmlcssbeginner: "HTML",
  htmlmetadata: "HTML",
  htmlsemantics: "HTML",
  htmlstructure: "HTML",
  htmltable: "HTML",
  canvas: "HTML",
  dialog: "HTML",
  dialogelement: "HTML",
  form: "HTML",
  forms: "HTML",
  formdesign: "HTML",
  formvalidation: "HTML",
  iframe: "HTML",
  mathml: "HTML",
  semantic: "HTML",
  semantics: "HTML",
  semantichtml: "HTML",
  semanticmarkup: "HTML",
  xml: "HTML",
  svg: "HTML",
  svgfilter: "HTML",
  svgfilters: "HTML",
  favicon: "HTML",
  mhtml: "HTML",
  markdown: "HTML",

  // ==========================================
  // 15. JavaScript (신설)
  // ==========================================
  javascript: "JavaScript",
  js: "JavaScript",
  javascriptframework: "JavaScript",
  javascriptlibrary: "JavaScript",
  javascriptpatterns: "JavaScript",
  javascriptperformance: "JavaScript",
  javascripttooling: "JavaScript",
  javascripttrends: "JavaScript",
  javascriptbasics: "JavaScript",
  esnext: "JavaScript",
  vanillajs: "JavaScript",
  async: "JavaScript",
  bundler: "JavaScript",
  compiler: "JavaScript",
  concurrency: "JavaScript",
  dom: "JavaScript",
  dommanipulation: "JavaScript",
  domoptimization: "JavaScript",
  domtracking: "JavaScript",
  encapsulation: "JavaScript",
  error: "JavaScript",
  esbuild: "JavaScript",
  event: "JavaScript",
  eventhandling: "JavaScript",
  hooks: "JavaScript",
  hydration: "JavaScript",
  iteratorprotocol: "JavaScript",
  json: "JavaScript",
  keyboardevent: "JavaScript",
  nojs: "JavaScript",
  nodejs: "JavaScript",
  pointerevents: "JavaScript",
  rollup: "JavaScript",
  runtime: "JavaScript",
  scoping: "JavaScript",
  turbopack: "JavaScript",
  typesystem: "JavaScript",
  vite: "JavaScript",
  webpack: "JavaScript",
  javascriptruntime: "JavaScript",

  // ==========================================
  // 16. Testing (신설)
  // ==========================================
  testing: "Testing",
  abtesting: "Testing",
  automatedtesting: "Testing",
  bugfix: "Testing",
  cypress: "Testing",
  e2e: "Testing",
  integrationtesting: "Testing",
  jest: "Testing",
  manualtesting: "Testing",
  nativetesting: "Testing",
  playwright: "Testing",
  puppeteer: "Testing",
  qa: "Testing",
  selenium: "Testing",
  storybook: "Testing",
  test: "Testing",
  unittest: "Testing",
  usertesting: "Testing",
  vitest: "Testing",

  // ==========================================
  // 17. Web API (신설)
  // ==========================================
  webapi: "Web API",
  webaudio: "Web API",
  webaudioapi: "Web API",
  webauthn: "Web API",
  webbluetooth: "Web API",
  webcrypto: "Web API",
  webhistory: "Web API",
  webrtc: "Web API",
  webspeechapi: "Web API",
  webusb: "Web API",
  cameraapi: "Web API",
  canvasapi: "Web API",
  cookie: "Web API",
  cookies: "Web API",
  fetch: "Web API",
  gamepadapi: "Web API",
  geolocation: "Web API",
  haptics: "Web API",
  indexeddb: "Web API",
  intersectionobserver: "Web API",
  localstorage: "Web API",
  mediasync: "Web API",
  mediarecorder: "Web API",
  mediastreaming: "Web API",
  mutationobserver: "Web API",
  resizeobserver: "Web API",
  sessionstorage: "Web API",
  serviceworker: "Web API",
  serviceworkers: "Web API",
  storageaccessapi: "Web API",
  touch: "Web API",
  webanimation: "Web API",
  websocket: "Web API",
  webapis: "Web API",
  searchapi: "Web API",

  // ==========================================
  // 18. 3D Web (신설)
  // ==========================================
  "3dweb": "3D Web",
  "3d": "3D Web",
  "3dprinting": "3D Web",
  "3dtransform": "3D Web",
  ar: "3D Web",
  gpucomputing: "3D Web",
  spatialcomputing: "3D Web",
  spatialnavigation: "3D Web",
  spatialweb: "3D Web",
  threejs: "3D Web",
  r3f: "3D Web",
  reactthreefiber: "3D Web",
  webgl: "3D Web",
  webgl2: "3D Web",
  webgpu: "3D Web",
  webxr: "3D Web",
  glsl: "3D Web",
  shaders: "3D Web",

  // ==========================================
  // 19. Media (신설: 이미지/비디오/오디오 관련)
  // ==========================================
  media: "Media",
  audio: "Media",
  audiofirst: "Media",
  audiodescription: "Media",
  audioframework: "Media",
  captions: "Media",
  d3: "Media",
  datavisualization: "Media",
  image: "Media",
  images: "Media",
  imagegeneration: "Media",
  multimedia: "Media",
  transcoding: "Media",
  video: "Media",
  videoediting: "Media",
  vtt: "Media",
  smil: "Media",

  // ==========================================
  // 20. Career (기존 + 추가)
  // ==========================================
  career: "Career",
  "career advice": "Career",
  careeradvice: "Career",
  engineeringculture: "Career",
  frontendcareer: "Career",
  hiring: "Career",
  hr: "Career",
  indiedev: "Career",
  interview: "Career",
  interviewprep: "Career",
  jobmarket: "Career",
  leadership: "Career",
  management: "Career",
  organizationalculture: "Career",
  portfolio: "Career",
  processimprovement: "Career",
  professionaldevelopment: "Career",
  projectplanning: "Career",
  recruiting: "Career",
  remote: "Career",
  resume: "Career",
  salary: "Career",
  softskills: "Career",
  workspace: "Career",
  workplace: "Career",

  // ==========================================
  // 21. Frontend (신설: 일반 프론트엔드 관련)
  // ==========================================
  frontend: "Frontend",
  frontendbasics: "Frontend",
  frontenddesign: "Frontend",
  frontendframework: "Frontend",
  frontendfundamentals: "Frontend",
  frontendgame: "Frontend",
  frontendinfra: "Frontend",
  frontendnews: "Frontend",
  frontendpatterns: "Frontend",
  frontendreview: "Frontend",
  frontendtool: "Frontend",
  frontendtooling: "Frontend",
  frontendtools: "Frontend",
  frontendtrend: "Frontend",
  "front-end": "Frontend",

  // ==========================================
  // 22. Legacy / Compatibility (신설)
  // ==========================================
  compatibility: "Compatibility",
  backwardscompatibility: "Compatibility",
  breakingchange: "Compatibility",
  browsercompatibility: "Compatibility",
  browser_support: "Compatibility",
  interop: "Compatibility",
  interop2023: "Compatibility",
  legacy: "Compatibility",
  legacysupport: "Compatibility",
  legacybrowsers: "Compatibility",
  legacytech: "Compatibility",
  migration: "Compatibility",

  // ==========================================
  // 23. Gaming (신설)
  // ==========================================
  gaming: "Gaming",
  gameengine: "Gaming",
  gameui: "Gaming",
  roblox: "Gaming",
  xboxfse: "Gaming",
  gaminggear: "Gaming",
  retrogaming: "Gaming",

  // ==========================================
  // 24. IoT / Smart (신설)
  // ==========================================
  iot: "IoT",
  smarthome: "IoT",
  embedded: "IoT",
  esp32: "IoT",
  raspberrypi: "IoT",
  virtualization: "IoT",
  hyperv: "IoT",

  // ==========================================
  // 25. Architecture / Patterns (신설)
  // ==========================================
  architecture: "Architecture",
  cleanarchitecture: "Architecture",
  componentpattern: "Architecture",
  crdt: "Architecture",
  crud: "Architecture",
  "csrvs ssr": "Architecture",
  frontendarchitecture: "Architecture",
  libraryinternals: "Architecture",
  mvvm: "Architecture",
  observationframework: "Architecture",
  platformstrategy: "Architecture",
  progressiveenhancement: "Architecture",
  refactoring: "Architecture",
  technicaldebt: "Architecture",
  viewmodel: "Architecture",
  webarchitecture: "Architecture",
  webplatform: "Architecture",

  // ==========================================
  // 26. Security / Privacy (신설)
  // ==========================================
  security: "Security",
  datasecurity: "Security",
  oidc: "Security",
  pcidss: "Security",
  sandbox: "Security",
  sandboxing: "Security",
  sameoriginpolicy: "Security",
  sri: "Security",

  // ==========================================
  // 27. i18n / Localization (신설)
  // ==========================================
  i18n: "i18n",
  grapheme: "i18n",
  ime: "i18n",
  inputmethod: "i18n",
  inputmode: "i18n",
  localization: "i18n",
  unicode: "i18n",

  // ==========================================
  // 28. Media / Multimedia (추가 확장)
  // ==========================================
  chartjs: "Multimedia",

  // ==========================================
  // 29. Community / Open Source (추가 확장)
  // ==========================================
  communitypolicy: "Community",
  foss: "Open Source",
  slack: "Community",
  stackoverflow: "Community",
  thunderbird: "Community",

  // ==========================================
  // 30. Sustainability (신설)
  // ==========================================
  sustainability: "Sustainability",
  recycle: "Sustainability",
  sustainableweb: "Sustainability",

  // ==========================================
  // 31. Regex / Parsing (신설)
  // ==========================================
  regex: "Regex",
  ocr: "Regex",
  parsing: "Regex",
  xpath: "Regex",
  xslt: "Regex",

  // ==========================================
  // 32. Ecommerce / Business (신설)
  // ==========================================
  ecommerce: "Business",
  business: "Business",
  saas: "Business",
  startup: "Business",
  whitelabel: "Business",
  telecom: "Business",

  // ==========================================
  // 34. Software / General (신설)
  // ==========================================
  software: "Software",
  generalsoftware: "Software",
  generaltech: "Software",
  softwareengineering: "Software",
  softwarereview: "Software",
  system: "Software",
  update: "Software",
  osupdate: "Software",
  operatingsystem: "Software",

  // ==========================================
  // 35. Documentation (신설)
  // ==========================================
  documentation: "Documentation",
  technicalwriting: "Documentation",

  // ==========================================
  // 36. Policy / Compliance (신설)
  // ==========================================
  policy: "Policy",
  compliance: "Policy",
  developerpolicy: "Policy",
  standard: "Policy",

  // ==========================================
  // 37. Analytics (신설)
  // ==========================================
  analytics: "Analytics",
  dataanalysis: "Analytics",

  // ==========================================
  // 38. Networking (신설)
  // ==========================================
  networking: "Networking",

  // ==========================================
  // 39. Ergonomics (신설)
  // ==========================================
  ergonomics: "Ergonomics",

  // ==========================================
  // 40. Licensing (신설)
  // ==========================================
  licensing: "Licensing",
  copyright: "Licensing",

  // ==========================================
  // 41. Firmware (신설)
  // ==========================================
  firmware: "Firmware",
  uefi: "Firmware",

  // ==========================================
  // 42. Storage (신설)
  // ==========================================
  storage: "Storage",
  cloudstorage: "Storage",
};

// 태그 정규화 키 생성 함수 (공백, 점, 하이픈, 괄호 등 모두 제거)
function normalizeTagKey(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "") // 모든 공백 제거
    .replace(/[\.\-\(\)\/]/g, "") // 특수문자 제거 (:has() -> has)
    .replace(/[:@]/g, "");
}

// 헬퍼: 두 배열이 같은지 비교
function areArraysEqual(arr1: string[], arr2: string[]) {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((val, index) => val === arr2[index]);
}

const main = async () => {
  console.log("\n========================================");
  console.log("🔍 Tag Normalization & Migration Start (Paged Mode)");
  console.log("========================================");

  if (IS_DRY_RUN) {
    console.log(
      "⚠️ DRY RUN MODE: DB는 수정되지 않습니다. (실행: --execute 추가)",
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Supabase 환경변수가 로드되지 않았습니다.");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  // 1. 전체 개수 확인 (count only)
  const { count, error: countError } = await supabase
    .from("trend")
    .select("*", { count: "exact", head: true })
    .not("represent_result", "is", null);

  if (countError) {
    console.error("❌ 카운트 조회 실패:", countError.message);
    process.exit(1);
  }

  const totalCount = count || 0;
  console.log(`📊 DB 전체 데이터 수(represent_result 존재): ${totalCount}건`);

  // 사용자 지정 LIMIT이 있으면 그것을 쓰고, 없으면 전체(totalCount)
  const targetLimit = LIMIT && LIMIT > 0 ? LIMIT : totalCount;
  console.log(`🎯 처리 목표 개수: ${targetLimit}건`);

  // 페이지네이션 변수
  const PAGE_SIZE = 1000;
  let processedCount = 0;
  let pageIndex = 0;

  const updateOperations = [];
  const reportDetails = [];
  const changeStats: Record<string, number> = {};

  const unmappedKeySet = new Set<string>();
  const unmappedDisplayMap = new Map<string, string>();

  // 2. 페이지네이션 루프
  while (processedCount < targetLimit) {
    const rangeStart = pageIndex * PAGE_SIZE;
    const rangeEnd = rangeStart + PAGE_SIZE - 1;

    // Supabase의 range는 0-based index inclusive
    const { data: trends, error } = await supabase
      .from("trend")
      .select("*")
      .not("represent_result", "is", null)
      .range(rangeStart, rangeEnd);

    if (error) {
      console.error(`❌ 데이터 조회 실패 (Page ${pageIndex}):`, error.message);
      break;
    }

    if (!trends || trends.length === 0) {
      break; // 더 이상 데이터 없음
    }

    // 3. 데이터 처리
    for (const trend of trends) {
      // 사용자 지정 LIMIT 도달 시 중단
      if (processedCount >= targetLimit) break;
      processedCount++;

      const representResult = trend.represent_result as any;
      if (!representResult || !representResult.tags) continue;

      const originalTags = representResult.tags as string[];
      const newTags: string[] = [];
      const seen = new Set<string>();

      originalTags.forEach((tag) => {
        const key = normalizeTagKey(tag);
        const mappedTag = TAG_ALIASES[key];
        const finalTag = mappedTag || tag.trim();

        if (!seen.has(finalTag)) {
          seen.add(finalTag);
          newTags.push(finalTag);
        }

        // 통계 집계
        if (mappedTag && mappedTag !== tag) {
          const statKey = `"${tag}" ➡️ "${mappedTag}"`;
          changeStats[statKey] = (changeStats[statKey] || 0) + 1;
        } else if (!mappedTag) {
          unmappedKeySet.add(key);
          if (!unmappedDisplayMap.has(key)) {
            unmappedDisplayMap.set(key, tag.trim());
          }
        }
      });

      // 변경 사항이 있는 경우만 업데이트 목록에 추가
      if (!areArraysEqual(originalTags, newTags)) {
        updateOperations.push({
          ...trend,
          represent_result: { ...representResult, tags: newTags },
        });

        reportDetails.push({
          id: trend.id,
          title: trend.title,
          original: originalTags,
          updated: newTags,
        });
      }
    }

    console.log(
      `✅ ${trends.length}건 로드 및 분석 완료 (누적: ${processedCount}/${totalCount})`,
    );
    pageIndex++;
  }

  // 4. 결과 리포트 출력
  const cleanUnmappedTags = Array.from(unmappedKeySet)
    .map((key) => unmappedDisplayMap.get(key)!)
    .sort();

  console.log("\n========================================");
  console.log(
    `🎯 최종 결과: 총 ${processedCount}건 스캔 완료, ${updateOperations.length}건 변경 예정`,
  );
  console.log("========================================");

  const sortedStats = Object.entries(changeStats).sort((a, b) => b[1] - a[1]);
  console.log("\n📊 [가장 많이 치환된 태그 Top 10]");
  sortedStats
    .slice(0, 10)
    .forEach(([key, count]) => console.log(` - ${key} : ${count}건`));

  const reportPath = path.join(
    process.cwd(),
    `tag_migration_report_${Date.now()}.json`,
  );
  const finalReport = {
    summary: {
      totalScanned: processedCount,
      totalChanged: updateOperations.length,
    },
    unmappedTags: cleanUnmappedTags,
    changes: reportDetails,
  };

  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  console.log(`\n✅ 상세 리포트가 생성되었습니다: ${reportPath}`);

  // 5. DB 실제 업데이트 (Batch 처리)
  if (!IS_DRY_RUN && updateOperations.length > 0) {
    console.log("\n🚀 실제 DB 업데이트를 시작합니다...");
    const BATCH_SIZE = 500;

    for (let i = 0; i < updateOperations.length; i += BATCH_SIZE) {
      const batch = updateOperations.slice(i, i + BATCH_SIZE);

      const { error: upsertError } = await supabase
        .from("trend")
        .upsert(batch, { onConflict: "id" });

      if (upsertError) {
        console.error(`❌ Batch ${i} 업데이트 실패:`, upsertError.message);
        break;
      }

      console.log(
        `✅ [${Math.min(i + BATCH_SIZE, updateOperations.length)}/${updateOperations.length}] 건 업데이트 완료`,
      );
    }
    console.log("🎉 마이그레이션이 완료되었습니다!");
  }
};

main().catch((error) => {
  console.error("❌ Fatal Error:", error);
  process.exit(1);
});
