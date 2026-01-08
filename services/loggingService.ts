import { supabase, isSupabaseConfigured } from './supabaseService';

const APPS_SCRIPT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxlvgEYSzLz4viRYAKXGi0hAbd1eGE7ccvRw46532Sw_GUpUClA51IWgUmjTFCplmr1/exec";

// Enable/disable logging destinations
const ENABLE_GOOGLE_SHEETS = false;
const ENABLE_SUPABASE = true;

export interface LogPayload {
  userId: string;
  timestamp: string;
  page: string;
  clickType: string; // 'UI_CLICK' | 'GLOBAL_CLICK' | 'CHAT' | 'CUSTOM_EVENT'
  coordinates: {
    x: number; y: number; pageX: number; pageY: number; nx: number; ny: number;
  };
  target: {
    tagName: string; id: string; className: string;
  };
  screenSize: {
    viewportWidth: number; viewportHeight: number; screenWidth: number; screenHeight: number;
  };
}

// Supabase table structure (flattened for easier querying)
interface SupabaseLogEntry {
  user_id: string;
  timestamp: string;
  page: string;
  click_type: string;
  coord_x: number;
  coord_y: number;
  coord_page_x: number;
  coord_page_y: number;
  coord_nx: number;
  coord_ny: number;
  target_tag: string;
  target_id: string;
  target_class: string;
  viewport_width: number;
  viewport_height: number;
  screen_width: number;
  screen_height: number;
  session_id: string;
}

let currentUser: string = 'anonymous';
let currentPage: string = 'portal';
let sessionId: string = generateSessionId();

// Generate a unique session ID for this browser session
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const setUser = (name: string) => {
  currentUser = name || 'anonymous';
};

export const setPage = (page: string) => {
  currentPage = page || 'portal';
};

export const getSessionId = () => sessionId;

const getScreenSize = () => ({
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height
});

// Convert LogPayload to Supabase format
const toSupabaseFormat = (payload: LogPayload): SupabaseLogEntry => ({
  user_id: payload.userId,
  timestamp: payload.timestamp,
  page: payload.page,
  click_type: payload.clickType,
  coord_x: payload.coordinates.x,
  coord_y: payload.coordinates.y,
  coord_page_x: payload.coordinates.pageX,
  coord_page_y: payload.coordinates.pageY,
  coord_nx: payload.coordinates.nx,
  coord_ny: payload.coordinates.ny,
  target_tag: payload.target.tagName,
  target_id: payload.target.id,
  target_class: payload.target.className,
  viewport_width: payload.screenSize.viewportWidth,
  viewport_height: payload.screenSize.viewportHeight,
  screen_width: payload.screenSize.screenWidth,
  screen_height: payload.screenSize.screenHeight,
  session_id: sessionId,
});

// Send to Google Sheets (existing functionality)
const sendToGoogleSheets = async (payload: LogPayload) => {
  try {
    await fetch(APPS_SCRIPT_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Silently fail
  }
};

// Send to Supabase
const sendToSupabase = async (payload: LogPayload) => {
  if (!isSupabaseConfigured) return;

  try {
    const entry = toSupabaseFormat(payload);
    const { error } = await supabase
      .from('user_logs')
      .insert([entry]);

    if (error) {
      // Log error only in development
      if ((import.meta as any).env?.DEV) {
        console.warn('Supabase logging error:', error.message);
      }
    }
  } catch (error) {
    // Silently fail to avoid breaking user experience
  }
};

// Centralized sender - sends to both destinations
export const sendLog = async (payload: LogPayload) => {
  // Fill missing user/page from state
  if (!payload.userId) payload.userId = currentUser;
  if (!payload.page) payload.page = currentPage;

  // Send to both destinations in parallel
  const promises: Promise<void>[] = [];

  if (ENABLE_GOOGLE_SHEETS) {
    promises.push(sendToGoogleSheets(payload));
  }

  if (ENABLE_SUPABASE) {
    promises.push(sendToSupabase(payload));
  }

  await Promise.allSettled(promises);
};

// Helper for Chat Logging
export const logChat = (sender: 'bot' | 'user', message: string) => {
  const payload: LogPayload = {
    userId: currentUser,
    timestamp: new Date().toISOString(),
    page: currentPage,
    clickType: 'CHAT',
    coordinates: { x: 0, y: 0, pageX: 0, pageY: 0, nx: 0, ny: 0 },
    target: {
      tagName: sender.toUpperCase(),
      id: 'chat_message',
      className: message.substring(0, 1000)
    },
    screenSize: getScreenSize()
  };
  sendLog(payload);
};

// Generic event logger
export const logEvent = (
  eventType: string,
  component: string,
  details: any = {}
) => {
  const payload: LogPayload = {
    userId: currentUser,
    timestamp: new Date().toISOString(),
    page: currentPage,
    clickType: 'CUSTOM_EVENT',
    coordinates: { x: 0, y: 0, pageX: 0, pageY: 0, nx: 0, ny: 0 },
    target: {
      tagName: component,
      id: eventType,
      className: JSON.stringify(details).substring(0, 1000)
    },
    screenSize: getScreenSize()
  };
  sendLog(payload);
};

// Log page view
export const logPageView = (pageName: string) => {
  setPage(pageName);
  logEvent('page_view', 'navigation', { page: pageName });
};

// Log user login
export const logLogin = (userId: string, method: string) => {
  setUser(userId);
  logEvent('login', 'auth', { method, userId });
};

// Log user logout
export const logLogout = () => {
  logEvent('logout', 'auth', { userId: currentUser });
  setUser('anonymous');
};

// Log module interaction
export const logModuleInteraction = (moduleId: string, action: string, data?: any) => {
  logEvent(action, moduleId, data);
};

// ============================================
// SQL to create the Supabase table:
// ============================================
/*
CREATE TABLE user_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page TEXT,
  click_type TEXT,
  coord_x REAL DEFAULT 0,
  coord_y REAL DEFAULT 0,
  coord_page_x REAL DEFAULT 0,
  coord_page_y REAL DEFAULT 0,
  coord_nx REAL DEFAULT 0,
  coord_ny REAL DEFAULT 0,
  target_tag TEXT,
  target_id TEXT,
  target_class TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_user_logs_user_id ON user_logs(user_id);
CREATE INDEX idx_user_logs_timestamp ON user_logs(timestamp);
CREATE INDEX idx_user_logs_page ON user_logs(page);
CREATE INDEX idx_user_logs_session ON user_logs(session_id);

-- Enable Row Level Security (optional)
ALTER TABLE user_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow insert from authenticated and anonymous users
CREATE POLICY "Allow insert for all users" ON user_logs
  FOR INSERT WITH CHECK (true);

-- Policy to allow users to read their own logs
CREATE POLICY "Users can read own logs" ON user_logs
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = 'anonymous');
*/
