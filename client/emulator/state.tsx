import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { cn } from "@/lib/utils";

export type AppId =
  | "settings"
  | "clock"
  | "calculator"
  | "camera"
  | "gallery"
  | "files"
  | "contacts"
  | "phone"
  | "messages"
  | "playstore";

export type NotificationAction = {
  id: string;
  label: string;
  onClick: (n: NotificationItem) => void;
};

export type NotificationItem = {
  id: string;
  appId: AppId | "system";
  title: string;
  body: string;
  time: number;
  actions?: NotificationAction[];
  unread?: boolean;
};

export type AppSpec = {
  id: AppId;
  name: string;
  icon: string; // emoji for simplicity
};

export type RunningApp = {
  id: AppId;
  instanceId: string; // unique per open instance
  title: string;
  createdAt: number;
};

export type QuickSettingKey =
  | "wifi"
  | "bluetooth"
  | "airplane"
  | "dnd"
  | "rotationLock";

export type SystemTheme = "light" | "dark" | "amoled";

export type SystemState = {
  booted: boolean;
  locked: boolean;
  wallpaper: string;
  theme: SystemTheme;
  brightness: number; // 0..1
  volume: number; // 0..1
  battery: { level: number; charging: boolean };
  network: {
    signal: number;
    type: "none" | "2G" | "3G" | "4G" | "5G";
    wifi: boolean;
  };
  quickSettings: Record<QuickSettingKey, boolean>;
  notifications: NotificationItem[];
  apps: AppSpec[];
  homeGrid: AppId[]; // ordering on home screen
  running: RunningApp[]; // stack, top is foreground
  recents: RunningApp[]; // last closed apps for multitasking
  now: number;
};

const DEFAULT_APPS: AppSpec[] = [
  { id: "phone", name: "Phone", icon: "📞" },
  { id: "messages", name: "Messages", icon: "💬" },
  { id: "camera", name: "Camera", icon: "📷" },
  { id: "gallery", name: "Gallery", icon: "🖼️" },
  { id: "clock", name: "Clock", icon: "⏰" },
  { id: "calculator", name: "Calculator", icon: "🧮" },
  { id: "files", name: "Files", icon: "📁" },
  { id: "contacts", name: "Contacts", icon: "👤" },
  { id: "settings", name: "Settings", icon: "⚙️" },
  { id: "playstore", name: "Play Store", icon: "▶️" },
];

const initialState: SystemState = {
  booted: false,
  locked: true,
  wallpaper: "linear-gradient(135deg, hsl(265 85% 60%), hsl(200 90% 55%))",
  theme: "dark",
  brightness: 0.9,
  volume: 0.7,
  battery: { level: 0.76, charging: false },
  network: { signal: 4, type: "5G", wifi: true },
  quickSettings: {
    wifi: true,
    bluetooth: false,
    airplane: false,
    dnd: false,
    rotationLock: false,
  },
  notifications: [],
  apps: DEFAULT_APPS,
  homeGrid: [
    "phone",
    "messages",
    "camera",
    "gallery",
    "clock",
    "calculator",
    "files",
    "contacts",
    "settings",
    "playstore",
  ],
  running: [],
  recents: [],
  now: Date.now(),
};

// Persistence helpers
const STORAGE_KEY = "android_emulator_state_v1";
function loadState(): SystemState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SystemState;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: SystemState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        running: [],
        recents: state.recents.slice(0, 12),
      }),
    );
  } catch {}
}

// Actions
export type Action =
  | { type: "BOOT" }
  | { type: "LOCK"; locked: boolean }
  | { type: "OPEN_APP"; id: AppId }
  | { type: "CLOSE_TOP_APP" }
  | { type: "CLOSE_APP"; instanceId: string }
  | { type: "BRING_TO_FRONT"; instanceId: string }
  | { type: "ADD_NOTIFICATION"; notif: NotificationItem }
  | { type: "DISMISS_NOTIFICATION"; id: string }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "SET_BRIGHTNESS"; value: number }
  | { type: "SET_VOLUME"; value: number }
  | { type: "SET_THEME"; value: SystemTheme }
  | { type: "TOGGLE_QS"; key: QuickSettingKey }
  | { type: "TICK" }
  | { type: "SET_WALLPAPER"; css: string }
  | { type: "SET_BATTERY"; level: number; charging?: boolean };

function reducer(state: SystemState, action: Action): SystemState {
  switch (action.type) {
    case "BOOT":
      return { ...state, booted: true, locked: true };
    case "LOCK":
      return { ...state, locked: action.locked };
    case "OPEN_APP": {
      const spec = state.apps.find((a) => a.id === action.id);
      if (!spec) return state;
      const instance: RunningApp = {
        id: spec.id,
        instanceId: `${spec.id}-${crypto.randomUUID()}`,
        title: spec.name,
        createdAt: Date.now(),
      };
      return { ...state, running: [...state.running, instance], locked: false };
    }
    case "CLOSE_TOP_APP": {
      if (state.running.length === 0) return state;
      const closing = state.running[state.running.length - 1];
      return {
        ...state,
        running: state.running.slice(0, -1),
        recents: [
          closing,
          ...state.recents.filter((r) => r.instanceId !== closing.instanceId),
        ].slice(0, 12),
      };
    }
    case "CLOSE_APP": {
      const closing = state.running.find(
        (r) => r.instanceId === action.instanceId,
      );
      return {
        ...state,
        running: state.running.filter(
          (r) => r.instanceId !== action.instanceId,
        ),
        recents: closing ? [closing, ...state.recents] : state.recents,
      };
    }
    case "BRING_TO_FRONT": {
      const target = state.running.find(
        (r) => r.instanceId === action.instanceId,
      );
      if (!target) return state;
      const others = state.running.filter(
        (r) => r.instanceId !== action.instanceId,
      );
      return { ...state, running: [...others, target] };
    }
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.notif, ...state.notifications],
      };
    case "DISMISS_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, unread: false } : n,
        ),
      };
    case "SET_BRIGHTNESS":
      return { ...state, brightness: Math.max(0, Math.min(1, action.value)) };
    case "SET_VOLUME":
      return { ...state, volume: Math.max(0, Math.min(1, action.value)) };
    case "SET_THEME":
      return { ...state, theme: action.value };
    case "TOGGLE_QS": {
      const next = !state.quickSettings[action.key];
      let network = state.network;
      if (action.key === "airplane") {
        network = next
          ? { signal: 0, type: "none", wifi: false }
          : { ...state.network };
      }
      if (action.key === "wifi") {
        network = { ...state.network, wifi: next };
      }
      return {
        ...state,
        quickSettings: { ...state.quickSettings, [action.key]: next },
        network,
      };
    }
    case "SET_WALLPAPER":
      return { ...state, wallpaper: action.css };
    case "SET_BATTERY":
      return {
        ...state,
        battery: {
          level: Math.max(0, Math.min(1, action.level)),
          charging: action.charging ?? state.battery.charging,
        },
      };
    case "TICK": {
      const drain = state.quickSettings.airplane ? 0.00005 : 0.00012;
      const level = state.battery.charging
        ? Math.min(1, state.battery.level + 0.0005)
        : Math.max(0, state.battery.level - drain);
      return {
        ...state,
        now: Date.now(),
        battery: { ...state.battery, level },
      };
    }
    default:
      return state;
  }
}

const EmulatorContext = createContext<{
  state: SystemState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function EmulatorProvider({ children }: { children: React.ReactNode }) {
  const loaded = loadState();
  const [state, dispatch] = useReducer(reducer, loaded ?? initialState);

  useEffect(() => {
    saveState(state);
    document.documentElement.classList.toggle("dark", state.theme !== "light");
  }, [state]);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state.booted) {
      const t = setTimeout(() => dispatch({ type: "BOOT" }), 1500);
      return () => clearTimeout(t);
    }
  }, [state.booted]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <EmulatorContext.Provider value={value}>
      {children}
    </EmulatorContext.Provider>
  );
}

export function useEmulator() {
  const ctx = useContext(EmulatorContext);
  if (!ctx) throw new Error("useEmulator must be used within EmulatorProvider");
  return ctx;
}
