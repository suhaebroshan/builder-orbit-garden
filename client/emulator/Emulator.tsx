import { useEffect, useMemo, useRef, useState } from "react";
import { EmulatorProvider, useEmulator } from "./state";
import { cn } from "@/lib/utils";
import { clickFeedback, notifyFeedback } from "./feedback";

export default function Emulator() {
  return (
    <EmulatorProvider>
      <PhoneChrome />
    </EmulatorProvider>
  );
}

function PhoneChrome() {
  const {
    state: { theme, wallpaper, brightness },
  } = useEmulator();
  return (
    <div className="relative mx-auto select-none" style={{ width: 360, height: 740 }}>
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-b from-slate-300/70 to-slate-50/60 blur-xl" />
      <div className="relative w-full h-full rounded-[2.4rem] border border-black/20 shadow-2xl overflow-hidden bg-black">
        <div
          className={cn("absolute inset-0 transition-colors", theme === "amoled" ? "bg-black" : "bg-[hsl(var(--background))]")}
          style={{ filter: `brightness(${0.6 + brightness * 0.6})` }}
        >
          <BootScreen />
          <LockOrSystem />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -top-0.5 h-5 w-40 bg-black rounded-b-3xl" />
        <div className="absolute left-0 top-32 h-10 w-1.5 rounded-r-xl bg-black/60" />
        <div className="absolute left-0 top-52 h-20 w-1.5 rounded-r-xl bg-black/60" />
        <div className="absolute right-0 top-44 h-36 w-1.5 rounded-l-xl bg-black/60" />
      </div>
    </div>
  );
}

function BootScreen() {
  const { state } = useEmulator();
  if (state.booted) return null;
  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <div className="text-white text-5xl font-bold tracking-widest">android</div>
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-white/20 rounded">
        <div className="h-full w-1/3 bg-white rounded animate-[pulse_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function LockOrSystem() {
  const { state } = useEmulator();
  if (!state.booted) return null;
  return state.locked ? <LockScreen /> : <SystemShell />;
}

function StatusBar() {
  const {
    state: { now, battery, network, notifications },
  } = useEmulator();
  const date = new Date(now);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  const pct = Math.round(battery.level * 100);
  return (
    <div className="h-6 text-[11px] text-white/90 flex items-center justify-between px-2">
      <div className="flex items-center gap-2">
        <span className="font-medium">{hh}:{mm}</span>
      </div>
      <div className="flex items-center gap-2">
        <span title="notifications">{notifications.filter(n=>n.unread!==false).length > 0 ? "🔔" : ""}</span>
        <span title="network">{network.wifi ? "📶" : network.type !== "none" ? network.type : "✈️"}</span>
        <span title="battery">{pct}% {battery.charging ? "⚡" : ""}</span>
      </div>
    </div>
  );
}

function LockScreen() {
  const { state, dispatch } = useEmulator();
  const startY = useRef<number | null>(null);
  const offset = useRef(0);
  const [drag, setDrag] = useState(0);
  const time = new Date(state.now);

  function onStart(y: number) {
    startY.current = y;
  }
  function onMove(y: number) {
    if (startY.current == null) return;
    offset.current = Math.max(0, startY.current - y);
    setDrag(offset.current);
  }
  function onEnd() {
    if (offset.current > 120) {
      dispatch({ type: "LOCK", locked: false });
      clickFeedback();
    }
    startY.current = null;
    setDrag(0);
  }

  return (
    <div className="absolute inset-0" style={{ background: state.wallpaper }}>
      <div className="absolute inset-0 backdrop-brightness-[.6]" />
      <StatusBar />
      <div className="absolute inset-0 grid place-items-center" onMouseDown={(e)=>onStart(e.clientY)} onMouseMove={(e)=>onMove(e.clientY)} onMouseUp={onEnd} onTouchStart={(e)=>onStart(e.touches[0].clientY)} onTouchMove={(e)=>onMove(e.touches[0].clientY)} onTouchEnd={onEnd}>
        <div className="text-white text-center" style={{ transform: `translateY(${drag * -0.25}px)` }}>
          <div className="text-6xl font-bold tracking-tight">
            {time.getHours().toString().padStart(2, "0")}:{time.getMinutes().toString().padStart(2, "0")}
          </div>
          <div className="text-white/70 mt-1 text-sm">
            {time.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="mt-24 text-white/80">Swipe up to unlock</div>
        </div>
        <Notifications shadeOnLock />
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-white/50" />
    </div>
  );
}

function SystemShell() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" aria-hidden style={{ background: "var(--wallpaper, transparent)" }} />
      <StatusBar />
      <HomeScreen />
      <Notifications />
      <QuickSettings />
      <TaskSwitcher />
      <NavBar />
    </div>
  );
}

function HomeScreen() {
  const { state, dispatch } = useEmulator();
  const [edit, setEdit] = useState(false);
  const grid = state.homeGrid.map((id) => state.apps.find((a) => a.id === id)!).filter(Boolean);
  return (
    <div className="absolute inset-0 pt-6 pb-16" style={{ background: state.wallpaper }} onDoubleClick={()=>setEdit(!edit)}>
      <div className="absolute inset-0 pointer-events-none backdrop-brightness-[.85]" />
      <div className="relative z-10 px-4">
        <div className={cn("grid grid-cols-4 gap-3 transition-transform", edit && "scale-[0.98]")}> 
          {grid.map((app) => (
            <button
              key={app.id}
              onClick={() => dispatch({ type: "OPEN_APP", id: app.id })}
              className="group flex flex-col items-center gap-1 text-white"
            >
              <div className={cn("h-12 w-12 grid place-items-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 shadow-lg group-active:scale-95 transition", edit && "animate-[pulse_2s_infinite]")}>{app.icon}</div>
              <div className="text-[11px] opacity-90">{app.name}</div>
            </button>
          ))}
        </div>
      </div>
      <Dock />
      <OpenAppsLayer />
    </div>
  );
}

function Dock() {
  const { state, dispatch } = useEmulator();
  const favorites: (typeof state.apps)[number][] = [
    state.apps.find(a=>a.id==="phone")!,
    state.apps.find(a=>a.id==="messages")!,
    state.apps.find(a=>a.id==="camera")!,
    state.apps.find(a=>a.id==="gallery")!,
  ].filter(Boolean);
  return (
    <div className="absolute bottom-10 left-0 right-0 flex justify-center">
      <div className="rounded-2xl bg-black/30 backdrop-blur border border-white/15 px-4 py-2 flex gap-4">
        {favorites.map((app) => (
          <button key={app.id} onClick={()=>dispatch({type:"OPEN_APP", id: app.id})} className="h-10 w-10 grid place-items-center text-white text-lg">
            <span className="drop-shadow">{app.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NavBar() {
  const { dispatch } = useEmulator();
  return (
    <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-16 text-white/80">
      <button onClick={()=>dispatch({type:"CLOSE_TOP_APP"})} className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10 active:scale-95">◁</button>
      <div className="h-1 w-24 rounded-full bg-white/60" />
      <button onClick={()=>dispatch({type:"OPEN_APP", id: "playstore"})} className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10 active:scale-95">▢</button>
    </div>
  );
}

function OpenAppsLayer() {
  const { state, dispatch } = useEmulator();
  const top = state.running[state.running.length - 1];
  if (!top) return null;
  return (
    <div className="absolute inset-0">
      <AppWindow app={top} onClose={()=>dispatch({type:"CLOSE_TOP_APP"})} />
    </div>
  );
}

function AppWindow({ app, onClose }: { app: import("./state").RunningApp; onClose: ()=>void }) {
  const { state } = useEmulator();
  return (
    <div className="absolute inset-0 bg-black/40">
      <div className="absolute inset-2 rounded-2xl overflow-hidden shadow-2xl"> 
        <div className="h-8 px-3 flex items-center justify-between text-white/90 bg-black/40">
          <div className="text-sm">{state.apps.find(a=>a.id===app.id)?.name}</div>
          <div className="flex items-center gap-2"><button onClick={onClose} className="text-xs px-2 py-1 rounded bg-white/10">Close</button></div>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-8 bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
          <AppRouter id={app.id} />
        </div>
      </div>
    </div>
  );
}

function AppRouter({ id }: { id: import("./state").AppId }) {
  switch (id) {
    case "calculator":
      return <CalculatorApp />;
    case "clock":
      return <ClockApp />;
    case "camera":
      return <CameraApp />;
    case "gallery":
      return <GalleryApp />;
    case "settings":
      return <SettingsApp />;
    case "phone":
      return <PhoneApp />;
    case "messages":
      return <MessagesApp />;
    case "files":
      return <FilesApp />;
    case "contacts":
      return <ContactsApp />;
    case "playstore":
      return <PlayStoreApp />;
    default:
      return <div className="p-4">App not implemented</div>;
  }
}

function Notifications({ shadeOnLock = false }: { shadeOnLock?: boolean }) {
  const { state, dispatch } = useEmulator();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 18) setOpen(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);
  if (!open && !shadeOnLock) return null;
  return (
    <div className={cn("absolute inset-x-0 top-0 transition-transform", open ? "translate-y-0" : "-translate-y-full")}
      onMouseLeave={()=>setOpen(false)}>
      <div className="bg-black/50 backdrop-blur px-3 pt-2 pb-3">
        <div className="text-white/80 text-sm mb-2">Notifications</div>
        <div className="flex flex-col gap-2 max-h-64 overflow-auto">
          {state.notifications.length === 0 && <div className="text-white/60 text-sm">No notifications</div>}
          {state.notifications.map((n)=> (
            <div key={n.id} className="rounded-xl bg-white/10 p-2 text-white border border-white/10">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs opacity-80">{n.body}</div>
              <div className="mt-1 flex gap-2">
                {n.actions?.map(a=> (
                  <button key={a.id} onClick={()=>{a.onClick(n); dispatch({type:"MARK_NOTIFICATION_READ", id:n.id});}} className="text-xs px-2 py-1 rounded bg-white/20">{a.label}</button>
                ))}
                <button onClick={()=>dispatch({type:"DISMISS_NOTIFICATION", id:n.id})} className="text-xs px-2 py-1 rounded bg-white/20 ml-auto">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickSettings() {
  const { state, dispatch } = useEmulator();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  return (
    <div className="absolute inset-x-0 top-0">
      <div className="bg-black/70 backdrop-blur px-3 pt-3 pb-4 text-white">
        <div className="text-sm mb-2">Quick settings</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["wifi", "Wi‑Fi"],
            ["bluetooth", "Bluetooth"],
            ["airplane", "Airplane"],
            ["dnd", "Do Not Disturb"],
            ["rotationLock", "Rotation"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={()=>dispatch({type:"TOGGLE_QS", key})}
              className={cn("rounded-xl py-2 text-sm border border-white/10", state.quickSettings[key] ? "bg-white/20" : "bg-white/5")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 items-center text-xs">
          <label>Brightness</label>
          <input type="range" min={0} max={1} step={0.01} value={state.brightness} onChange={(e)=>dispatch({type:"SET_BRIGHTNESS", value: Number(e.target.value)})} />
          <label>Volume</label>
          <input type="range" min={0} max={1} step={0.01} value={state.volume} onChange={(e)=>dispatch({type:"SET_VOLUME", value: Number(e.target.value)})} />
        </div>
      </div>
    </div>
  );
}

function TaskSwitcher() {
  // Placeholder recents grid using running stack for now
  return null;
}

// Apps implementations
function CalculatorApp() {
  const [expr, setExpr] = useState("");
  const [res, setRes] = useState<string | null>(null);
  function append(x: string) { setExpr((e) => e + x); clickFeedback(); }
  function clearAll() { setExpr(""); setRes(null); }
  function evalExpr() {
    try {
      // safe eval: allow digits, operators and parentheses only
      if (!/^[-+*/().\d\s]+$/.test(expr)) throw new Error("bad");
      // eslint-disable-next-line no-new-func
      const out = Function(`return (${expr})`)();
      setRes(String(out));
    } catch { setRes("Error"); }
  }
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"];
  return (
    <div className="h-full flex flex-col p-3 bg-neutral-900 text-white">
      <div className="text-right text-2xl min-h-[3rem]">{expr}</div>
      <div className="text-right text-lg min-h-[2rem] opacity-70">{res ?? ""}</div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button onClick={clearAll} className="col-span-2 py-3 rounded-xl bg-white/10">AC</button>
        <button onClick={()=>append("(")} className="py-3 rounded-xl bg-white/10">(</button>
        <button onClick={()=>append(")")} className="py-3 rounded-xl bg-white/10">)</button>
        {keys.map(k => k === "=" ? (
          <button key={k} onClick={evalExpr} className="py-3 rounded-xl bg-emerald-500 text-black col-span-1">=</button>
        ) : (
          <button key={k} onClick={()=>append(k)} className="py-3 rounded-xl bg-white/10">{k}</button>
        ))}
      </div>
    </div>
  );
}

function ClockApp() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; const i = setInterval(()=>setMs(m=>m+100), 100); return ()=>clearInterval(i); }, [running]);
  const s = (ms/1000).toFixed(1);
  return (
    <div className="h-full p-4 bg-neutral-900 text-white">
      <div className="text-xl font-medium mb-2">Stopwatch</div>
      <div className="text-5xl mb-4">{s}s</div>
      <div className="flex gap-2">
        <button onClick={()=>setRunning(!running)} className="px-3 py-2 rounded bg-white/10">{running?"Pause":"Start"}</button>
        <button onClick={()=>{setRunning(false); setMs(0);}} className="px-3 py-2 rounded bg-white/10">Reset</button>
      </div>
    </div>
  );
}

function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(()=>{
    (async ()=>{
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);
  return (
    <div className="h-full relative bg-black">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <button onClick={()=>notifyFeedback()} className="h-14 w-14 rounded-full bg-white/90" />
      </div>
      {!ready && <div className="absolute inset-0 grid place-items-center text-white/80">Grant camera permission…</div>}
    </div>
  );
}

function GalleryApp() {
  return (
    <div className="h-full p-4 bg-neutral-900 text-white">Gallery (captures will appear here in a future step)</div>
  );
}

function SettingsApp() {
  const { state, dispatch } = useEmulator();
  return (
    <div className="h-full p-4 space-y-4 overflow-auto bg-neutral-900 text-white">
      <div>
        <div className="text-lg font-semibold mb-2">Appearance</div>
        <div className="flex gap-2">
          {["light","dark","amoled"].map(t=> (
            <button key={t} onClick={()=>dispatch({type:"SET_THEME", value: t as any})} className={cn("px-3 py-2 rounded border", state.theme===t?"bg-white text-black":"bg-white/10")}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold mb-2">Wallpaper</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            "linear-gradient(135deg, hsl(265 85% 60%), hsl(200 90% 55%))",
            "linear-gradient(135deg, hsl(15 85% 60%), hsl(45 90% 55%))",
            "linear-gradient(135deg, hsl(140 85% 40%), hsl(200 90% 60%))",
          ].map(css => (
            <button key={css} onClick={()=>dispatch({type:"SET_WALLPAPER", css})} className="h-16 rounded-xl border" style={{ background: css }} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold mb-2">Battery</div>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={1} step={0.01} value={state.battery.level} onChange={(e)=>dispatch({type:"SET_BATTERY", level: Number(e.target.value)})} />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={state.battery.charging} onChange={(e)=>dispatch({type:"SET_BATTERY", level: state.battery.level, charging: e.target.checked})} /> Charging</label>
        </div>
      </div>
      <div>
        <div className="text-lg font-semibold mb-2">About</div>
        <div className="text-sm opacity-80">Web Android Emulator — experimental build</div>
      </div>
    </div>
  );
}

function PhoneApp() {
  const [digits, setDigits] = useState("");
  const [active, setActive] = useState(false);
  const [sec, setSec] = useState(0);
  useEffect(()=>{ if(!active) return; const t = setInterval(()=>setSec(s=>s+1), 1000); return ()=>clearInterval(t); }, [active]);
  function press(n: string){ setDigits(d=> (d + n).slice(0,16)); clickFeedback(); }
  function call(){ if (!digits) return; setActive(true); notifyFeedback(); }
  function hang(){ setActive(false); setSec(0); setDigits(""); }
  const nums = ["1","2","3","4","5","6","7","8","9","*","0","#"];
  return (
    <div className="h-full p-4 bg-neutral-900 text-white flex flex-col">
      <div className="text-center text-2xl h-10">{active? `In call: ${digits}` : digits}</div>
      {active ? (
        <div className="flex-1 grid place-items-center text-5xl">{Math.floor(sec/60)}:{(sec%60).toString().padStart(2,"0")}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mt-6">
          {nums.map(n => <button key={n} onClick={()=>press(n)} className="rounded-full aspect-square bg-white/10 text-xl">{n}</button>)}
        </div>
      )}
      <div className="mt-auto flex justify-center gap-4">
        {!active ? (
          <button onClick={call} className="px-6 py-2 rounded-full bg-emerald-500 text-black">Call</button>
        ) : (
          <button onClick={hang} className="px-6 py-2 rounded-full bg-rose-500 text-black">Hang up</button>
        )}
      </div>
    </div>
  );
}

function MessagesApp() {
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ me: boolean; t: number; body: string }[]>([]);
  function send(){ if(!text.trim()) return; const msg = { me: true, t: Date.now(), body: text }; setLog(l=>[...l, msg]); setText(""); setTimeout(()=> setLog(l=>[...l, { me:false, t:Date.now(), body: "Auto‑reply: "+msg.body }]), 800); }
  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      <div className="px-3 py-2 border-b border-white/10">Chat with Demo</div>
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
        {log.map((m,i)=> (
          <div key={i} className={cn("max-w-[80%] px-3 py-2 rounded-2xl", m.me?"bg-emerald-500 text-black self-end rounded-br-sm":"bg-white/10 self-start rounded-bl-sm")}>{m.body}</div>
        ))}
      </div>
      <div className="p-2 flex gap-2 border-t border-white/10">
        <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type…" className="flex-1 bg-white/10 rounded px-3 py-2 outline-none" />
        <button onClick={send} className="px-3 rounded bg-white/20">Send</button>
      </div>
    </div>
  );
}

function FilesApp() {
  const [files, setFiles] = useState<File[]>([]);
  function onPick(e: React.ChangeEvent<HTMLInputElement>){
    const list = e.target.files; if(!list) return; setFiles(f=>[...f, ...Array.from(list)]);
  }
  return (
    <div className="h-full p-3 bg-neutral-900 text-white">
      <div className="mb-2">Files</div>
      <input type="file" multiple onChange={onPick} className="mb-2" />
      <ul className="space-y-1 text-sm">
        {files.map((f,i)=> <li key={i} className="flex justify-between border-b border-white/10 py-1"><span>{f.name}</span><span>{(f.size/1024).toFixed(1)} KB</span></li>)}
      </ul>
    </div>
  );
}

function ContactsApp() {
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([{name:"Demo", phone:"555-0100"}]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  function add(){ if(!name||!phone) return; setContacts(c=>[...c, {name, phone}]); setName(""); setPhone(""); }
  return (
    <div className="h-full p-4 bg-neutral-900 text-white">
      <div className="text-lg mb-2">Contacts</div>
      <div className="flex gap-2 mb-3">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="bg-white/10 rounded px-2 py-1" />
        <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" className="bg-white/10 rounded px-2 py-1" />
        <button onClick={add} className="px-3 rounded bg-white/20">Add</button>
      </div>
      <ul className="space-y-1 text-sm">
        {contacts.map((c,i)=> <li key={i} className="flex justify-between border-b border-white/10 py-1"><span>{c.name}</span><span>{c.phone}</span></li>)}
      </ul>
    </div>
  );
}

function PlayStoreApp() {
  const apps = [
    { id: "calculator", name: "Calculator" },
    { id: "camera", name: "Camera" },
    { id: "messages", name: "Messages" },
    { id: "phone", name: "Phone" },
    { id: "clock", name: "Clock" },
    { id: "files", name: "Files" },
    { id: "gallery", name: "Gallery" },
    { id: "contacts", name: "Contacts" },
    { id: "settings", name: "Settings" },
  ];
  return (
    <div className="h-full p-4 bg-neutral-900 text-white">
      <div className="text-lg mb-2">Play Store</div>
      <div className="grid grid-cols-2 gap-2">
        {apps.map(a=> (
          <div key={a.id} className="rounded-xl p-3 bg-white/10">
            <div className="font-medium">{a.name}</div>
            <div className="text-xs opacity-70">Installed</div>
          </div>
        ))}
      </div>
    </div>
  );
}
