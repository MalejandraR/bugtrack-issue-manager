import { TONE_COLORS } from '../utils/badges'

/**
 * NEObutalism chip for status/severity/priority (prototype's `.bd`).
 * The label text always travels with the color, so meaning never depends
 * on color alone. `dots` (0..3) renders the prototype's ●●●○ priority dots.
 */
export default function Badge({ tone = 'neutral', dots, children, testId }) {
  const hasDots = typeof dots === 'number'

  return (
    <span
      className={`badge badge--${tone}`}
      style={{ '--c': TONE_COLORS[tone] ?? 'var(--surf2)' }}
      data-testid={testId}
    >
      {hasDots && (
        <s aria-hidden="true">
          {'●'.repeat(dots + 1)}
          {'○'.repeat(3 - dots)}
        </s>
      )}
      {children}
    </span>
  )
}
