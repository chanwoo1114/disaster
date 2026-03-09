export const timeToSeconds = (time) => {
  const str = String(time).padStart(6, "0");
  return parseInt(str.slice(0, 2)) * 3600 +
    parseInt(str.slice(2, 4)) * 60 +
    parseInt(str.slice(4, 6));
};

export const formatSeconds = (sec) => {
  if (sec === null || sec === undefined) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};