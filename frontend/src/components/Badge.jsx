/**
 * Colored chip for status/severity/priority.
 * The label text always travels with the color, so meaning never
 * depends on color alone.
 */
export default function Badge({ tone = 'neutral', children, testId }) {
  return (
    <span className={`badge badge--${tone}`} data-testid={testId}>
      {children}
    </span>
  )
}
