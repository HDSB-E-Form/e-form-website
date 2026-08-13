import { useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import logo from "@/assets/logo.png";
import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  DollarSign,
  FileText,
  Home,
  Menu,
  MonitorCog,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";

const departmentTiles = [
  { icon: Users, label: "HR", color: "bg-blue-500" },
  { icon: DollarSign, label: "Finance", color: "bg-amber-500" },
  { icon: ShieldCheck, label: "Safety", color: "bg-red-500" },
  { icon: MonitorCog, label: "IT", color: "bg-violet-500" },
];

const MobileAppPromo = () => {
  const [phoneTransform, setPhoneTransform] = useState("translateY(0) rotateX(0deg) rotateY(0deg)");
  const [isSpinning, setIsSpinning] = useState(false);

  const handlePhoneTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || isSpinning) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setPhoneTransform(`translateY(-6px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg)`);
  };

  const spinPhone = async (event: MouseEvent<HTMLDivElement>) => {
    if (isSpinning) return;
    setIsSpinning(true);
    setPhoneTransform("translateY(0) rotateX(0deg) rotateY(0deg)");
    const animation = event.currentTarget.animate(
      [
        { transform: "translateY(0) rotateX(0deg) rotateY(0deg)" },
        { transform: "translateY(-10px) rotateX(2deg) rotateY(180deg)", offset: 0.5 },
        { transform: "translateY(0) rotateX(0deg) rotateY(360deg)" },
      ],
      { duration: 1500, easing: "cubic-bezier(.45,.05,.2,1)", fill: "none" },
    );
    try { await animation.finished; } finally { setIsSpinning(false); }
  };

  const handlePhoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.currentTarget.click();
  };

  return (
    <div className="flex w-full max-w-xl shrink-0 items-center gap-3 sm:gap-6 lg:gap-8">
      {/* Phone mockup */}
      <div className="group relative shrink-0 [perspective:1200px] lg:translate-y-10">
        <div
          className="absolute -inset-4 rounded-[3rem] bg-accent/15 blur-2xl transition-all duration-500 ease-out group-hover:-inset-5 group-hover:bg-accent/20"
          aria-hidden="true"
        />
        <div
          onPointerMove={handlePhoneTilt}
          onPointerEnter={handlePhoneTilt}
          onPointerLeave={() => !isSpinning && setPhoneTransform("translateY(0) rotateX(0deg) rotateY(0deg)")}
          onClick={spinPhone}
          onKeyDown={handlePhoneKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Rotate phone mockup to see its back"
          title="Click to rotate"
          style={{ transform: phoneTransform }}
          className={`relative w-[165px] cursor-pointer rounded-[2.35rem] bg-gradient-to-br from-[#d8d4cb] via-[#77756f] to-[#bbb7ad] p-[3px] shadow-[0_28px_55px_rgba(0,0,0,.5),inset_0_0_0_1px_rgba(255,255,255,.55)] transition-[transform,box-shadow] duration-300 ease-out [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-transparent group-hover:shadow-[0_36px_70px_rgba(0,0,0,.58),inset_0_0_0_1px_rgba(255,255,255,.6)] sm:w-[225px] lg:w-[270px] lg:rounded-[3.1rem] lg:p-[4px] ${isSpinning ? "pointer-events-none" : ""}`}
        >
          <span className="absolute -left-[5px] top-[20%] h-10 w-[3px] rounded-l bg-[#77756f] lg:h-14" aria-hidden="true" />
          <span className="absolute -right-[5px] top-[27%] h-14 w-[3px] rounded-r bg-[#77756f] lg:h-20" aria-hidden="true" />
          <div className="absolute inset-[3px] overflow-hidden rounded-[2.15rem] border border-white/80 bg-gradient-to-br from-[#fafafa] via-[#e8e7e4] to-[#c9c8c4] shadow-[inset_0_1px_5px_rgba(255,255,255,.95),inset_0_-2px_5px_rgba(0,0,0,.12)] [backface-visibility:hidden] [transform:rotateY(180deg)] lg:inset-[4px] lg:rounded-[2.8rem]">
            <div className="absolute inset-[4%] rounded-[1.7rem] border border-white/80 bg-gradient-to-br from-white/85 via-[#efefed]/80 to-[#dad9d6]/75 shadow-[inset_0_1px_3px_rgba(255,255,255,.9)] lg:rounded-[2.3rem]" />
            <div className="absolute left-[6%] top-[4%] h-[28%] w-[57%] rounded-[1.35rem] border border-black/10 bg-gradient-to-br from-[#f8f8f6] via-[#deddda] to-[#c5c4c0] shadow-[0_5px_14px_rgba(0,0,0,.2),inset_0_1px_2px_rgba(255,255,255,.95)] lg:rounded-[1.8rem]">
              {[[10,8],[52,16],[12,54]].map(([left, top], index) => <span key={index} className="absolute h-[39%] w-[35%] rounded-full border-[3px] border-[#767570] bg-[radial-gradient(circle_at_40%_36%,#49617a_0%,#111720_23%,#030405_54%,#3b3b3b_60%,#080808_74%)] shadow-[0_3px_7px_rgba(0,0,0,.7),inset_0_0_0_1px_rgba(255,255,255,.2)] lg:border-[4px]" style={{left: `${left}%`, top: `${top}%`}}><span className="absolute left-[27%] top-[23%] h-[17%] w-[17%] rounded-full bg-sky-100/45 blur-[.3px]" /></span>)}
              <span className="absolute right-[3%] top-[8%] h-[16%] w-[14%] rounded-full border border-stone-300 bg-amber-50 shadow-[0_0_6px_rgba(255,246,203,.9),inset_0_0_2px_rgba(180,160,110,.5)]" />
              <span className="absolute bottom-[17%] right-[10%] h-[13%] w-[12%] rounded-full bg-[#151719] shadow-[inset_0_0_2px_#526070] ring-1 ring-black/30" />
              <span className="absolute bottom-[39%] right-[13%] h-[5%] w-[4%] rounded-full bg-black/75" />
            </div>
            <svg viewBox="0 0 16 16" aria-label="Apple logo" className="absolute left-1/2 top-[45%] h-9 w-9 -translate-x-1/2 fill-[#777672] drop-shadow-[0_1px_0_rgba(255,255,255,.8)] sm:h-12 sm:w-12 lg:h-14 lg:w-14">
              <path d="M11.182.008c-.034-.038-1.259.015-2.325 1.172-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
            </svg>
            <div className="absolute inset-x-[14%] bottom-[3%] h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
          </div>
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.15rem] border-[3px] border-black bg-[#f5f7fb] [backface-visibility:hidden] lg:rounded-[2.8rem] lg:border-[5px]">
            <div className="absolute left-1/2 top-1.5 z-20 flex h-4 w-[38%] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2 lg:top-2 lg:h-7">
              <span className="h-1 w-1 rounded-full bg-sky-950 ring-1 ring-sky-800/50 lg:h-1.5 lg:w-1.5" />
            </div>
            <div className="flex h-full flex-col bg-[#f5f7fb] pt-6 text-slate-800 lg:pt-10">
              <div className="flex items-center justify-between bg-[#24205f] px-3 py-2 lg:px-4 lg:py-3">
                <img src={logo} alt="" aria-hidden="true" className="h-3.5 w-auto brightness-200 sm:h-5 lg:h-6" />
                <div className="flex items-center gap-2 text-white/80"><Bell className="h-3 w-3 lg:h-4 lg:w-4" /><Menu className="h-3.5 w-3.5 lg:h-4 lg:w-4" /></div>
              </div>

              <div className="flex-1 overflow-hidden px-2.5 py-2 sm:px-3 lg:px-4 lg:py-3">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#312876] to-[#5145a3] p-2.5 text-white shadow-lg lg:rounded-2xl lg:p-3.5">
                  <div className="absolute -right-5 -top-6 h-20 w-20 rounded-full border border-white/10" />
                  <p className="text-[6px] text-white/60 sm:text-[8px] lg:text-[9px]">Welcome back</p>
                  <div className="mt-0.5 flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[6px] font-bold lg:h-7 lg:w-7 lg:text-[8px]">HS</span><div><p className="text-[8px] font-bold sm:text-[10px] lg:text-xs">HDSB Staff</p><p className="text-[5px] text-white/55 lg:text-[7px]">Employee Portal</p></div></div>
                </div>

                <div className="mt-2 flex items-end justify-between lg:mt-3"><div><p className="text-[8px] font-bold lg:text-[11px]">My Dashboard</p><p className="text-[5px] text-slate-400 lg:text-[7px]">Submission overview</p></div><span className="text-[5px] font-semibold text-[#40358f] lg:text-[7px]">View all</span></div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 lg:mt-2 lg:gap-2">
                  {[{ label: "Total", value: "24", icon: FileText, tone: "text-blue-600 bg-blue-50" }, { label: "Approved", value: "18", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" }, { label: "Pending", value: "06", icon: ClipboardList, tone: "text-amber-600 bg-amber-50" }].map(({label, value, icon: Icon, tone}) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm lg:rounded-xl lg:p-2"><div className={`mb-1 flex h-4 w-4 items-center justify-center rounded ${tone} lg:h-6 lg:w-6`}><Icon className="h-2.5 w-2.5 lg:h-3.5 lg:w-3.5" /></div><p className="text-[9px] font-extrabold lg:text-sm">{value}</p><p className="text-[5px] text-slate-400 lg:text-[7px]">{label}</p></div>)}
                </div>

                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:mt-3 lg:p-3">
                  <div className="flex items-center justify-between"><p className="text-[7px] font-bold lg:text-[10px]">Monthly activity</p><span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[5px] font-bold text-emerald-600 lg:text-[7px]">+12%</span></div>
                  <div className="mt-1.5 h-10 lg:mt-2 lg:h-14">
                    <svg viewBox="0 0 200 62" className="h-full w-full overflow-visible" role="img" aria-label="Monthly activity trending upward">
                      <defs>
                        <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46a5" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#4f46a5" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <g stroke="#e2e8f0" strokeWidth="0.7" strokeDasharray="2 3">
                        <line x1="4" y1="10" x2="196" y2="10" /><line x1="4" y1="28" x2="196" y2="28" /><line x1="4" y1="46" x2="196" y2="46" />
                      </g>
                      <path d="M4 43 Q4 43 7 41 L25 34 Q28 32 31 35 L50 43 Q53 44 56 40 L75 25 Q78 23 81 27 L100 34 Q103 35 106 31 L125 20 Q128 18 131 22 L150 28 Q153 29 156 25 L175 14 Q178 12 181 15 L196 10 L196 51 L4 51 Z" fill="url(#activity-area)" />
                      <path d="M4 43 Q4 43 7 41 L25 34 Q28 32 31 35 L50 43 Q53 44 56 40 L75 25 Q78 23 81 27 L100 34 Q103 35 106 31 L125 20 Q128 18 131 22 L150 28 Q153 29 156 25 L175 14 Q178 12 181 15 L196 10" fill="none" stroke="#4f46a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      {[[4,43],[28,34],[53,43],[78,25],[103,34],[128,20],[153,28],[178,14],[196,10]].map(([cx, cy], index, points) => <circle key={index} cx={cx} cy={cy} r={index === points.length - 1 ? 3 : 1.8} fill={index === points.length - 1 ? "#e4a936" : "#ffffff"} stroke={index === points.length - 1 ? "#ffffff" : "#4f46a5"} strokeWidth={index === points.length - 1 ? 1.4 : 1.2} />)}
                      <g fill="#94a3b8" fontSize="5" textAnchor="middle"><text x="4" y="60">1</text><text x="59" y="60">8</text><text x="115" y="60">15</text><text x="171" y="60">22</text><text x="196" y="60">30</text></g>
                    </svg>
                  </div>
                </div>

                <p className="mb-1.5 mt-2 text-[8px] font-bold lg:mb-2 lg:mt-3 lg:text-[11px]">Quick access</p>
                <div className="grid grid-cols-4 gap-1.5 lg:gap-2">{departmentTiles.map(({icon: Icon, label, color}) => <div key={label} className="flex flex-col items-center gap-1"><span className={`flex h-6 w-6 items-center justify-center rounded-lg text-white shadow-sm ${color} lg:h-9 lg:w-9 lg:rounded-xl`}><Icon className="h-3 w-3 lg:h-4 lg:w-4" /></span><span className="text-[5px] font-medium text-slate-500 lg:text-[7px]">{label}</span></div>)}</div>
              </div>

              <div className="mx-2.5 mb-1.5 flex items-center justify-around rounded-xl border border-slate-200 bg-white py-2 shadow-[0_-4px_16px_rgba(15,23,42,.06)] lg:mx-4 lg:mb-2 lg:py-3">
                <Home className="h-3.5 w-3.5 text-[#40358f] lg:h-5 lg:w-5" /><Building2 className="h-3.5 w-3.5 text-slate-300 lg:h-5 lg:w-5" /><ClipboardList className="h-3.5 w-3.5 text-slate-300 lg:h-5 lg:w-5" /><UserRound className="h-3.5 w-3.5 text-slate-300 lg:h-5 lg:w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing copy + download link, to the right of the phone */}
      <div className="flex flex-col items-start gap-4 text-left lg:gap-5">
        <div className="space-y-1.5 lg:space-y-2">
          <h2 className="max-w-[110px] text-base font-bold text-primary-foreground sm:max-w-[240px] sm:text-xl lg:max-w-[260px] lg:text-2xl">HDSB E-Form System in your pocket!</h2>
          <p className="max-w-[110px] text-xs text-nav-dark-foreground sm:max-w-[240px] sm:text-sm lg:max-w-[260px] lg:text-base">
            Submit forms, track approvals, and stay updated wherever work takes you.
          </p>
        </div>

        {/* Disabled Android download link */}
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Android app coming soon"
            className="group relative flex cursor-not-allowed items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 opacity-90 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-8 sm:w-8 lg:h-9 lg:w-9">
              <Download className="h-3.5 w-3.5 text-white/70 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[9px] uppercase tracking-wide text-white/50 sm:text-[10px]">Download for</span>
              <span className="text-xs font-semibold text-white sm:text-sm lg:text-base">Android</span>
            </span>
            <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground shadow sm:px-2 sm:text-[10px]">
              Soon
            </span>
          </button>
          <p className="text-[10px] text-nav-dark-foreground/80 sm:text-xs">Available soon &mdash; stay tuned!</p>
        </div>
      </div>
    </div>
  );
};

export default MobileAppPromo;
