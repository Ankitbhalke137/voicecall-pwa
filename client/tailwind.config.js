/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'on-error': '#690005',
        'primary-fixed': '#e1e0ff',
        'background': '#0b1326',
        'on-tertiary': '#68000a',
        'tertiary-fixed': '#ffdad7',
        'on-primary-fixed-variant': '#2f2ebe',
        'secondary-fixed-dim': '#4ae176',
        'surface-dim': '#0b1326',
        'tertiary-container': '#ff5451',
        'on-surface-variant': '#c7c4d7',
        'on-secondary-fixed-variant': '#005321',
        'tertiary': '#ffb3ad',
        'on-background': '#dae2fd',
        'outline-variant': '#464554',
        'inverse-surface': '#dae2fd',
        'on-error-container': '#ffdad6',
        'on-tertiary-fixed': '#410004',
        'surface-container-low': '#131b2e',
        'secondary': '#4ae176',
        'inverse-on-surface': '#283044',
        'primary': '#c0c1ff',
        'on-secondary-container': '#004119',
        'on-secondary': '#003915',
        'surface-bright': '#31394d',
        'surface-container-lowest': '#060e20',
        'on-tertiary-fixed-variant': '#930013',
        'surface-container-highest': '#2d3449',
        'error': '#ffb4ab',
        'surface-container': '#171f33',
        'outline': '#908fa0',
        'surface-tint': '#c0c1ff',
        'on-secondary-fixed': '#002109',
        'surface-variant': '#2d3449',
        'surface-container-high': '#222a3d',
        'on-primary-fixed': '#07006c',
        'secondary-container': '#00b954',
        'secondary-fixed': '#6bff8f',
        'primary-container': '#8083ff',
        'primary-fixed-dim': '#c0c1ff',
        'on-primary': '#1000a9',
        'error-container': '#93000a',
        'on-surface': '#dae2fd',
        'tertiary-fixed-dim': '#ffb3ad',
        'on-tertiary-container': '#5c0008',
        'inverse-primary': '#494bd6',
        'surface': '#0b1326',
        'on-primary-container': '#0d0096'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      spacing: {
        unit: '8px',
        'container-margin-desktop': '40px',
        gutter: '16px',
        'container-margin-mobile': '20px',
        'touch-target-min': '48px'
      },
      fontFamily: {
        'display-lg-mobile': ['Inter'],
        'label-sm': ['Inter'],
        'body-md': ['Inter'],
        'body-lg': ['Inter'],
        'headline-md': ['Inter'],
        'display-lg': ['Inter']
      },
      fontSize: {
        'display-lg-mobile': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }]
      }
    }
  },
  plugins: []
};