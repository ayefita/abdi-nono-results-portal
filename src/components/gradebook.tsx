"use client";

import { useEffect, useMemo, useState } from "react";
import { bandFor, type GradeBand } from "@/lib/marks";

export type GradeColumn = {
  id: string;
  name: string;
  kind: string;
  max: number;
  date: string;
  isFormula: boolean;
  formula: string;
};

export type GradeStudent = {
  id: string;
  name: string;
  code: string;
  scores: Record<string, number | null>;
};

function kindClass(kind: string, formula: boolean) {
  if (formula) return "gb-formula";
  if (kind === "final") return "gb-final";
  return "gb-work";
}

export function GradebookGrid({
  students,
  columns,
  scale,
  labels,
  saveAction,
  hidden,
}: {
  students: GradeStudent[];
  columns: GradeColumn[];
  scale: GradeBand[];
  labels: {
    students: string;
    average: string;
    save: string;
    unsaved: string;
    invalid: string;
  };
  saveAction: (formData: FormData) => void;
  hidden: { back: string; semesterId: string; sectionId: string; subjectId: string };
}) {
  const scoreColumns = columns.filter((column) => !column.isFormula);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const student of students) {
      for (const column of scoreColumns) {
        const score = student.scores[column.id];
        initial[`${student.id}.${column.id}`] = score == null ? "" : String(score);
      }
    }
    return initial;
  });
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.getElementById("gradebook-save")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && !(event.target instanceof HTMLInputElement && event.target.form?.id !== "gradebook-form")) {
        const panel = document.getElementById("add-column");
        if (panel instanceof HTMLDetailsElement) {
          event.preventDefault();
          panel.open = true;
          panel.querySelector("input")?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const averages = useMemo(() => {
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const column of scoreColumns) totals[column.id] = { sum: 0, count: 0 };
    let grand = 0;
    let grandMax = 0;
    let counted = 0;
    for (const student of students) {
      let studentTotal = 0;
      let studentMax = 0;
      let any = false;
      for (const column of scoreColumns) {
        const raw = values[`${student.id}.${column.id}`];
        const score = raw === "" || raw == null ? null : Number(raw);
        if (score != null && Number.isFinite(score)) {
          totals[column.id].sum += score;
          totals[column.id].count += 1;
          studentTotal += score;
          studentMax += column.max;
          any = true;
        }
      }
      if (any) {
        grand += studentTotal;
        grandMax += studentMax;
        counted += 1;
      }
    }
    return { totals, grand: counted ? grand / counted : 0, grandMax: counted ? grandMax / counted : 0 };
  }, [students, scoreColumns, values]);

  function move(current: HTMLInputElement, rowDelta: number, colDelta: number) {
    const row = Number(current.dataset.row);
    const col = Number(current.dataset.col);
    const next = document.querySelector<HTMLInputElement>(`input[data-row="${row + rowDelta}"][data-col="${col + colDelta}"]`);
    next?.focus();
    next?.select();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    if (event.key === "Enter") {
      event.preventDefault();
      move(input, event.shiftKey ? -1 : 1, 0);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(input, 1, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(input, -1, 0);
    } else if (event.key === "ArrowRight" && input.selectionStart === input.value.length) {
      move(input, 0, 1);
    } else if (event.key === "ArrowLeft" && input.selectionStart === 0) {
      move(input, 0, -1);
    }
  }

  function cellValue(studentId: string, column: GradeColumn) {
    if (!column.isFormula) return values[`${studentId}.${column.id}`] ?? "";
    let total = 0;
    let max = 0;
    for (const source of scoreColumns) {
      const raw = values[`${studentId}.${source.id}`];
      if (raw === "" || raw == null) continue;
      const score = Number(raw);
      if (!Number.isFinite(score)) continue;
      total += score;
      max += source.max;
    }
    if (!max) return "";
    if (column.formula === "letter") return bandFor((total / max) * 100, scale).letter;
    if (column.formula === "percent") return ((total / max) * 100).toFixed(1);
    return `${Math.round(total)}/${Math.round(max)}`;
  }

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  function download(kind: "csv" | "xls") {
    const header = ["Student", ...columns.map((column) => column.name)];
    const rows = students.map((student) => [student.name, ...columns.map((column) => cellValue(student.id, column))]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: kind === "xls" ? "application/vnd.ms-excel" : "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = kind === "xls" ? "gradebook.xls" : "gradebook.csv";
    link.click();
  }

  return (
    <form
      id="gradebook-form"
      action={saveAction}
      onSubmit={(event) => {
        if (Object.values(invalid).some(Boolean)) event.preventDefault();
      }}
    >
      <input type="hidden" name="back" value={hidden.back} />
      <input type="hidden" name="semesterId" value={hidden.semesterId} />
      <input type="hidden" name="sectionId" value={hidden.sectionId} />
      <input type="hidden" name="subjectId" value={hidden.subjectId} />
      <div className="gb-toolbar">
        <button id="gradebook-save" className="btn gb-save" type="submit">
          {labels.save}
        </button>
        <span className={dirtyCount ? "badge incomplete" : "badge"}>{dirtyCount ? labels.unsaved : ""}</span>
        <span className="gb-tools">
          <button className="btn" type="button" onClick={() => download("xls")}>Excel</button>
          <button className="btn" type="button" onClick={() => download("csv")}>CSV</button>
          <button className="btn" type="button" onClick={() => window.print()}>Print</button>
          <a className="btn" href="#gb-settings">Settings</a>
        </span>
      </div>
      <div className="gb-scroll">
        <table className="gb">
          <thead>
            <tr>
              <th className="gb-student">{labels.students}</th>
              {columns.map((column) => (
                <th key={column.id} className={kindClass(column.kind, column.isFormula)}>
                  <strong>{column.name}</strong>
                  <em>{column.isFormula ? "Formula" : column.kind}</em>
                  {column.date ? <small>{column.date}</small> : null}
                  {!column.isFormula ? <small>/ {column.max}</small> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, row) => (
              <tr key={student.id}>
                <th className="gb-student" title={student.name}>
                  <span className="gb-name">{student.name}</span>
                  <small>{student.code}</small>
                </th>
                {columns.map((column, col) => {
                  const key = `${student.id}.${column.id}`;
                  if (column.isFormula) {
                    return <td key={column.id} className="gb-formula-cell">{cellValue(student.id, column)}</td>;
                  }
                  const raw = values[key] ?? "";
                  const score = raw === "" ? null : Number(raw);
                  const percent = score != null && column.max ? (score / column.max) * 100 : null;
                  const band = percent == null ? null : bandFor(percent, scale);
                  return (
                    <td key={column.id} className={dirty[key] ? "dirty" : undefined}>
                      <input
                        name={`s.${student.id}.${column.id}`}
                        value={raw}
                        data-row={row}
                        data-col={col}
                        inputMode="decimal"
                        aria-label={`${student.name} ${column.name}`}
                        aria-invalid={invalid[key] || undefined}
                        onKeyDown={onKeyDown}
                        onChange={(event) => {
                          const next = event.target.value;
                          const number = next === "" ? null : Number(next);
                          const bad = number != null && (!Number.isFinite(number) || number < 0 || number > column.max);
                          setValues((current) => ({ ...current, [key]: next }));
                          setDirty((current) => ({ ...current, [key]: next !== (student.scores[column.id] == null ? "" : String(student.scores[column.id])) }));
                          setInvalid((current) => ({ ...current, [key]: bad }));
                        }}
                      />
                      <span className={`gb-level ${band?.letter === "F" ? "fail" : ""}`}>{band ? band.mark : ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="gb-student">{labels.average}</th>
              {columns.map((column) => {
                if (column.isFormula) return <td key={column.id}>{averages.grandMax ? `${averages.grand.toFixed(0)} / ${averages.grandMax.toFixed(0)}` : "—"}</td>;
                const bucket = averages.totals[column.id];
                const avg = bucket?.count ? bucket.sum / bucket.count : 0;
                return <td key={column.id}>{bucket?.count ? `${avg.toFixed(1)} / ${column.max}` : "—"}</td>;
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      {Object.values(invalid).some(Boolean) ? <p className="alert">{labels.invalid}</p> : null}
    </form>
  );
}
