// src/utils/tagColorUtils.ts

/**
 * Utility functions for generating and managing tag colors
 */

// Define a set of distinct colors for tags
// These colors are chosen to be visually distinct and work well together
const TAG_COLORS = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC05', // Yellow
  '#34A853', // Green
  '#8E24AA', // Purple
  '#16A2D7', // Light Blue
  '#FF6D00', // Orange
  '#0F9D58', // Emerald
  '#DB4437', // Coral
  '#673AB7', // Deep Purple
  '#FF5722', // Deep Orange
  '#009688', // Teal
  '#3F51B5', // Indigo
  '#E91E63', // Pink
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#436EEE', // Royal Blue
  '#00C853', // Light Green
  '#D81B60', // Dark Pink
  '#1E88E5', // Bright Blue
];

// A map to store assigned colors for tags
const tagColorMap = new Map<string, string>();

/**
 * Gets a consistent color for a tag based on its ID
 * The same tag will always get the same color across sessions
 * 
 * @param tagId The ID of the tag
 * @returns A color string (hex code)
 */
export const getTagColor = (tagId: string): string => {
  // If we've already assigned a color to this tag, return it
  if (tagColorMap.has(tagId)) {
    return tagColorMap.get(tagId)!;
  }
  
  // Use a hash of the tagId to ensure consistent color assignment
  // This ensures the same tag always gets the same color regardless of order
  let hash = 0;
  for (let i = 0; i < tagId.length; i++) {
    const char = tagId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a valid color index
  const colorIndex = Math.abs(hash) % TAG_COLORS.length;
  const color = TAG_COLORS[colorIndex];
  
  // Store the color assignment for future use
  tagColorMap.set(tagId, color);
  
  return color;
};

/**
 * Gets a lighter version of the tag color for backgrounds or highlights
 * 
 * @param tagId The ID of the tag
 * @returns A lighter color string (hex code)
 */
export const getTagBackgroundColor = (tagId: string): string => {
  const baseColor = getTagColor(tagId);
  
  // Convert the hex color to RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Create a lighter version (add transparency)
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
};

/**
 * Gets a darker version of the tag color for borders or active states
 * 
 * @param tagId The ID of the tag
 * @returns A darker color string (hex code)
 */
export const getTagBorderColor = (tagId: string): string => {
  const baseColor = getTagColor(tagId);
  
  // Convert the hex color to RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Create a darker version
  const darken = (val: number) => Math.max(0, val - 40);
  return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
};

/**
 * Determines if a color is light or dark to ensure text contrast
 * 
 * @param tagId The ID of the tag
 * @returns Boolean indicating if the color is light (true) or dark (false)
 */
export const isLightColor = (tagId: string): boolean => {
  const baseColor = getTagColor(tagId);
  
  // Convert the hex color to RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // Calculate the luminance (simplified formula)
  // If luminance > 186, it's considered a light color
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
};

/**
 * Reset the color assignments
 * Useful when starting a new session or activity
 */
export const resetTagColors = (): void => {
  tagColorMap.clear();
};