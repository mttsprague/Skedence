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
