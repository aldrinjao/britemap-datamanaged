const WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3']

export function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className={`h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse ${WIDTHS[(i + j) % WIDTHS.length]}`}
              />
              {j === 0 && (
                <div className={`h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse mt-2 ${WIDTHS[(i + j + 2) % WIDTHS.length]}`} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
