// src/components/ThemePicker.jsx
// Five coloured dots. Clicking one updates the active theme.

import { THEMES, THEME_KEYS } from './Card'

export default function ThemePicker({ theme, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {THEME_KEYS.map(key => {
        const t = THEMES[key]
        const active = key === theme
        return (
          <button
            key={key}
            title={t.label}
            onClick={() => onChange(key)}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: t.dot,
              border: 'none',
              cursor: 'pointer',
              boxShadow: active ? `0 0 0 2px #f5f1eb, 0 0 0 3.5px ${t.dot}` : 'none',
              transition: 'box-shadow .15s',
              flexShrink: 0,
            }}
          />
        )
      })}
      <span style={{ fontSize: 10, color: '#706050', marginLeft: 4 }}>
        {THEMES[theme]?.label}
      </span>
    </div>
  )
}
