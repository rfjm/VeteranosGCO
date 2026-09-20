import test from "node:test";
import assert from "node:assert/strict";
import { dateFromKey, dateKey, getMonthGrid } from "./calendar.js";

test("creates a six-week calendar starting on Monday", () => {
  const days = getMonthGrid(2026, 8);

  assert.equal(days.length, 42);
  assert.equal(days[0].key, "2026-08-31");
  assert.equal(days[41].key, "2026-10-11");
  assert.equal(days.filter((day) => day.isCurrentMonth).length, 30);
});

test("converts date keys without UTC date shifts", () => {
  const parsed = dateFromKey("2026-09-20");

  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8);
  assert.equal(parsed.getDate(), 20);
  assert.equal(dateKey(parsed), "2026-09-20");
});
