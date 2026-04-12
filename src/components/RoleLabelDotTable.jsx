import { ALL_FN_NAMES } from "../lib/researchClassifier.js"

const thStyle = {
  padding: "6px 10px",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "#a09080",
  borderBottom: "1px solid #ede8e2",
  whiteSpace: "nowrap",
  textAlign: "left",
  background: "#faf8f5",
}

const tdStyle = {
  padding: "6px 10px",
  fontSize: 11,
  borderBottom: "1px solid #ede8e2",
  verticalAlign: "middle",
}

const legendDot = (present, accent) => ({
  display: "inline-block",
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: present ? accent : "#e0dbd4",
})

function getRoleLabelSet(classifications, roleIndex) {
  if (!Array.isArray(classifications)) return new Set()
  const entry = classifications.find(c => c.role_index === roleIndex)
  return new Set((entry?.labels || []).map(l => l.name))
}

export default function RoleLabelDotTable({
  roles,
  classificationsByVariant,
  activeVariants,
  title = "Role-level label assignments",
  calibrationByRoleIndex = null,
}) {
  if (!Array.isArray(roles) || roles.length === 0) return null
  if (!Array.isArray(activeVariants) || activeVariants.length === 0) return null

  const hasAnyVariantData = activeVariants.some(v => classificationsByVariant?.[v.key])
  const hasCalibration = calibrationByRoleIndex && typeof calibrationByRoleIndex === "object"
  if (!hasAnyVariantData && !hasCalibration) return null

  const visibleRoleIndexes = roles
    .map((role, index) => ({ role, index }))
    .filter(x => !x.role?.flagged)

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#a09080", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", border: "1px solid #ede8e2", borderRadius: 6, overflow: "hidden", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, minWidth: 180 }}>Role</th>
              <th style={{ ...thStyle, minWidth: 40 }}>Mo</th>
              {ALL_FN_NAMES.map(fn => (
                <th key={fn} style={{ ...thStyle, minWidth: 100 }}>
                  {fn.replace("Processing ", "Proc. ").replace("Strategic ", "Strat. ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRoleIndexes.map(({ role, index: roleIndex }, i) => {
              const variantSets = activeVariants.reduce((acc, v) => {
                acc[v.key] = getRoleLabelSet(classificationsByVariant?.[v.key], roleIndex)
                return acc
              }, {})
              const calibrationSet = new Set(calibrationByRoleIndex?.[roleIndex] || [])

              return (
                <tr key={`${roleIndex}-${role.title || "role"}`} style={{ background: i % 2 === 0 ? "white" : "#faf8f5" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{role.title}</div>
                    <div style={{ color: "#a09080", fontSize: 10 }}>{role.employer}</div>
                  </td>
                  <td style={{ ...tdStyle, color: "#a09080", fontSize: 10 }}>{role.months}</td>
                  {ALL_FN_NAMES.map(fn => (
                    <td key={`${roleIndex}-${fn}`} style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 3, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                        {hasCalibration && (
                          <span title="Calibration" style={legendDot(calibrationSet.has(fn), "#1a1410")} />
                        )}
                        {activeVariants.map(v => (
                          <span key={v.key} title={v.label} style={legendDot(variantSets[v.key]?.has(fn), v.accent)} />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: "#a09080", marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {hasCalibration && (
            <span>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#1a1410", marginRight: 4 }} />
              Calibration
            </span>
          )}
          {activeVariants.map(v => (
            <span key={v.key}>
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: v.accent, marginRight: 4 }} />
              {v.label}
            </span>
          ))}
          <span>
            <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#e0dbd4", marginRight: 4 }} />
            Not assigned
          </span>
        </div>
      </div>
    </div>
  )
}

