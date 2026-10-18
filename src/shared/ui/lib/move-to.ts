export const moveTo = <T,>(xs: T[], from: number, to: number) => {
  const ys = [...xs]
  ys.splice(to, 0, ...ys.splice(from, 1))
  return ys
}
