import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_COLORS = [
  { bg: '#fee2e2', text: '#991b1b' }, // red
  { bg: '#ffedd5', text: '#9a3412' }, // orange
  { bg: '#fef3c7', text: '#92400e' }, // amber
  { bg: '#ecfccb', text: '#3f6212' }, // lime
  { bg: '#d1fae5', text: '#065f46' }, // emerald
  { bg: '#ccfbf1', text: '#115e59' }, // teal
  { bg: '#cffafe', text: '#155e75' }, // cyan
  { bg: '#dbeafe', text: '#1e40af' }, // blue
  { bg: '#e0e7ff', text: '#3730a3' }, // indigo
  { bg: '#ede9fe', text: '#5b21b6' }, // violet
  { bg: '#f3e8ff', text: '#6b21a8' }, // purple
  { bg: '#fce7f3', text: '#9d174d' }, // pink
]

const AVATAR_COLORS_DARK = [
  { bg: '#450a0a', text: '#fca5a5' }, // red
  { bg: '#431407', text: '#fdba74' }, // orange
  { bg: '#451a03', text: '#fcd34d' }, // amber
  { bg: '#1a2e05', text: '#bef264' }, // lime
  { bg: '#022c22', text: '#6ee7b7' }, // emerald
  { bg: '#042f2e', text: '#5eead4' }, // teal
  { bg: '#083344', text: '#67e8f9' }, // cyan
  { bg: '#172554', text: '#93c5fd' }, // blue
  { bg: '#1e1b4b', text: '#a5b4fc' }, // indigo
  { bg: '#2e1065', text: '#c4b5fd' }, // violet
  { bg: '#3b0764', text: '#d8b4fe' }, // purple
  { bg: '#500724', text: '#f9a8d4' }, // pink
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getAvatarColor(label: string): {
  light: { bg: string, text: string }
  dark: { bg: string, text: string }
} {
  const idx = hashString(label) % AVATAR_COLORS.length
  return { light: AVATAR_COLORS[idx], dark: AVATAR_COLORS_DARK[idx] }
}
