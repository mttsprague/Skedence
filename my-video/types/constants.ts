import { z } from "zod";
export const COMP_NAME = "MyComp";

export const CompositionProps = z.object({
  title: z.string(),
});

export const defaultMyCompProps: z.infer<typeof CompositionProps> = {
  title: "Next.js and Remotion",
};

export const DURATION_IN_FRAMES = 200;
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;

// Skedence Video Constants
export const SKEDENCE_COMP_NAME = "Skedence";
export const SKEDENCE_FPS = 30;
export const SKEDENCE_WIDTH = 1920;
export const SKEDENCE_HEIGHT = 1080;
export const SKEDENCE_DURATION = 45 * SKEDENCE_FPS; // 45 seconds

// Act durations (in frames)
export const ACT1_DURATION = 10 * SKEDENCE_FPS; // 10 seconds
export const ACT2_DURATION = 12 * SKEDENCE_FPS; // 12 seconds
export const ACT3_DURATION = 10 * SKEDENCE_FPS; // 10 seconds
export const ACT4_DURATION = 13 * SKEDENCE_FPS; // 13 seconds

// Brand colors
export const SKEDENCE_COLORS = {
  background: '#0f1115',
  accent: '#3b82f6', // Soft blue
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

// Volleyball Outbound Video Constants
export const VOLLEYBALL_COMP_NAME = "VolleyballOutbound";
export const VOLLEYBALL_FPS = 30;
export const VOLLEYBALL_WIDTH = 1920;
export const VOLLEYBALL_HEIGHT = 1080;
export const VOLLEYBALL_DURATION = 60 * VOLLEYBALL_FPS; // 60 seconds

// Scene durations (in frames)
export const VB_SCENE1_DURATION = 5 * VOLLEYBALL_FPS; // 5 seconds - Direct Hook
export const VB_SCENE2_DURATION = 10 * VOLLEYBALL_FPS; // 10 seconds - Real Situation
export const VB_SCENE3_DURATION = 20 * VOLLEYBALL_FPS; // 20 seconds - The System
export const VB_SCENE4_DURATION = 15 * VOLLEYBALL_FPS; // 15 seconds - Revenue Reality
export const VB_SCENE5_DURATION = 10 * VOLLEYBALL_FPS; // 10 seconds - Close

// Brand colors (same as Skedence)
export const VOLLEYBALL_COLORS = {
  background: '#0f1115',
  accent: '#ff6b35', // Orange
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

// How It Works Video Constants
export const HOWITWORKS_COMP_NAME = "HowItWorks";
export const HOWITWORKS_FPS = 30;
export const HOWITWORKS_WIDTH = 1920;
export const HOWITWORKS_HEIGHT = 1080;
export const HOWITWORKS_DURATION = 80 * HOWITWORKS_FPS; // 80 seconds

// Scene durations (in frames)
export const HIW_SCENE1_DURATION = 8 * HOWITWORKS_FPS; // 8 seconds - The Problem
export const HIW_SCENE2_DURATION = 11 * HOWITWORKS_FPS; // 11 seconds - Run Training Business
export const HIW_SCENE3_DURATION = 7 * HOWITWORKS_FPS; // 7 seconds - Lesson Packages
export const HIW_SCENE4_DURATION = 10 * HOWITWORKS_FPS; // 10 seconds - Track Revenue
export const HIW_SCENE5_DURATION = 14 * HOWITWORKS_FPS; // 14 seconds - Trainer Apps (2 pairs)
export const HIW_SCENE6_DURATION = 10 * HOWITWORKS_FPS; // 10 seconds - Client App (3 phones)
export const HIW_SCENE7_DURATION = 8 * HOWITWORKS_FPS; // 8 seconds - Auto Updates
export const HIW_SCENE8_DURATION = 6 * HOWITWORKS_FPS; // 6 seconds - Full System
export const HIW_SCENE9_DURATION = 6 * HOWITWORKS_FPS; // 6 seconds - Closing

// Brand colors
export const HOWITWORKS_COLORS = {
  background: '#0f1115',
  accent: '#ff6b35', // Orange for visibility against white backgrounds
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textDark: '#1a1d24', // For text on light backgrounds
};

// The Journey Video Constants (Agent-Designed)
export const JOURNEY_COMP_NAME = "TheJourney";
export const JOURNEY_FPS = 30;
export const JOURNEY_WIDTH = 1920;
export const JOURNEY_HEIGHT = 1080;
export const JOURNEY_DURATION = 55 * JOURNEY_FPS; // 55 seconds

// Scene durations (in frames)
export const JOURNEY_SCENE1_DURATION = 5 * JOURNEY_FPS; // 5 seconds - Opening Hook
export const JOURNEY_SCENE2_DURATION = 8 * JOURNEY_FPS; // 8 seconds - Quick Setup
export const JOURNEY_SCENE3_DURATION = 7 * JOURNEY_FPS; // 7 seconds - Athlete Discovery
export const JOURNEY_SCENE4_DURATION = 8 * JOURNEY_FPS; // 8 seconds - The Booking
export const JOURNEY_SCENE5_DURATION = 7 * JOURNEY_FPS; // 7 seconds - Staying Synced
export const JOURNEY_SCENE6_DURATION = 8 * JOURNEY_FPS; // 8 seconds - Business Insights
export const JOURNEY_SCENE7_DURATION = 7 * JOURNEY_FPS; // 7 seconds - Scale Effortlessly
export const JOURNEY_SCENE8_DURATION = 5 * JOURNEY_FPS; // 5 seconds - Closing

// Brand colors (matching Skedence brand)
export const JOURNEY_COLORS = {
  background: '#0f1115',
  accent: '#ff6b35', // Orange
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

// Basketball Video Constants
export const BASKETBALL_COMP_NAME = "Basketball";
export const BASKETBALL_FPS = 30;
export const BASKETBALL_WIDTH = 1920;
export const BASKETBALL_HEIGHT = 1080;
export const BASKETBALL_DURATION = 57 * BASKETBALL_FPS; // 57 seconds

// Scene durations (in frames)
export const BB_SCENE1_DURATION = 5 * BASKETBALL_FPS; // 5 seconds - The Hook
export const BB_SCENE2_DURATION = 13 * BASKETBALL_FPS; // 13 seconds - The Reality
export const BB_SCENE3_DURATION = 20 * BASKETBALL_FPS; // 20 seconds - The Operating System
export const BB_SCENE4_DURATION = 14 * BASKETBALL_FPS; // 14 seconds - The Math
export const BB_SCENE5_DURATION = 5 * BASKETBALL_FPS; // 5 seconds - The Close

// Brand colors
export const BASKETBALL_COLORS = {
  background: '#0f1115',
  accent: '#ff6b35', // Orange
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

// Soccer Video Constants
export const SOCCER_COMP_NAME = "Soccer";
export const SOCCER_FPS = 30;
export const SOCCER_WIDTH = 1920;
export const SOCCER_HEIGHT = 1080;
export const SOCCER_DURATION = 57 * SOCCER_FPS; // 57 seconds

// Scene durations (in frames)
export const SC_SCENE1_DURATION = 5 * SOCCER_FPS; // 5 seconds - The Hook
export const SC_SCENE2_DURATION = 13 * SOCCER_FPS; // 13 seconds - The Reality
export const SC_SCENE3_DURATION = 20 * SOCCER_FPS; // 20 seconds - The Operating System
export const SC_SCENE4_DURATION = 14 * SOCCER_FPS; // 14 seconds - The Math
export const SC_SCENE5_DURATION = 5 * SOCCER_FPS; // 5 seconds - The Close

// Brand colors
export const SOCCER_COLORS = {
  background: '#0f1115',
  accent: '#ff6b35', // Orange
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

// Baseball Video Constants
export const BASEBALL_COMP_NAME = "Baseball";
export const BASEBALL_FPS = 30;
export const BASEBALL_WIDTH = 1920;
export const BASEBALL_HEIGHT = 1080;
export const BASEBALL_DURATION = 57 * BASEBALL_FPS; // 57 seconds

// Scene durations (in frames)
export const BS_SCENE1_DURATION = 5 * BASEBALL_FPS; // 5 seconds - The Hook
export const BS_SCENE2_DURATION = 13 * BASEBALL_FPS; // 13 seconds - The Reality
export const BS_SCENE3_DURATION = 20 * BASEBALL_FPS; // 20 seconds - The Operating System
export const BS_SCENE4_DURATION = 14 * BASEBALL_FPS; // 14 seconds - The Math
export const BS_SCENE5_DURATION = 5 * BASEBALL_FPS; // 5 seconds - The Close

// Brand colors
export const BASEBALL_COLORS = {
  background: '#0f1115',
  accent: '#ff6b35', // Orange
  text: '#ffffff',
  textSecondary: '#9ca3af',
};
