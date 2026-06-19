export function stats(values: Array<number | null | undefined>) {
  return statsWithExtrema(values);
}

export function statsWithExtrema(
  values: Array<number | null | undefined>,
  mins?: Array<number | null | undefined>,
  maxs?: Array<number | null | undefined>
) {
  const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return null;

  const minVals = (mins ?? values).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const maxVals = (maxs ?? values).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const min = minVals.length ? Math.min(...minVals) : Math.min(...nums);
  const max = maxVals.length ? Math.max(...maxVals) : Math.max(...nums);
  const avg = nums.reduce((sum, v) => sum + v, 0) / nums.length;
  return { min, max, avg };
}
