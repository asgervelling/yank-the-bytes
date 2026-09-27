type PyramidRepresentation = {
    painted: string;
    unpainted: string;
    unpaintedInPath: string;
    rope: string;
    rowEnd: string;
};

const defaultOptions: PyramidRepresentation = {
    painted: "#",
    unpainted: "_",
    unpaintedInPath: ".",
    rope: "|",
    rowEnd: "\n",
};

type PyramidLayout = {
    rows: number;
    skyRows?: number;
    spoolDistance?: number;
};

function resolveLayout(layout: PyramidLayout) {
    const { rows } = layout;
    return {
        rows,
        skyRows:       layout.skyRows       ?? Math.ceil(rows / 2),
        spoolDistance: layout.spoolDistance ?? 2 * rows,
    };
}

function pyramidDimensions(layout: PyramidLayout) {
    const { rows, skyRows } = resolveLayout(layout);
    return { gridRows: skyRows + rows, cols: 2 * rows - 1 };
}

// Position of a pile cell in fill order, or -1 if the cell isn't part of the pyramid.
// Boustrophedon order from the bottom up: like a rope falling and forming a pile
// in a spiral fashion, but in 2D and from the side.
function pileIndex(i: number, j: number, rows: number): number {
    const mid = rows - 1;
    if (i < 0 || Math.abs(j - mid) > i) return -1;

    const below  = rows * rows - (i + 1) * (i + 1);  // Boxes in all rows below this one
    const width  = 2 * i + 1;                        // Boxes in this row
    const pos    = j - (mid - i);                    // Position in this row, from the left
    const level  = rows - 1 - i;                     // 0 = bottom row
    const offset = level % 2 === 0 ? pos : width - 1 - pos;
    return below + offset;
}

// The inverse: which pyramid cell does box n land on?
function pilePosition(n: number, rows: number): { i: number; j: number } {
    // Row i holds boxes from k² − (i+1)² up to k² − i² − 1,
    // so with m = k² − n, the row is the one where i² < m ≤ (i+1)².
    const m = rows * rows - n;
    let i = Math.ceil(Math.sqrt(m)) - 1;
    while ((i + 1) * (i + 1) < m) i++;        // Guard against floating-point error
    while (i > 0 && i * i >= m) i--;

    const below  = rows * rows - (i + 1) * (i + 1);
    const width  = 2 * i + 1;
    const level  = rows - 1 - i;
    const offset = n - below;
    const pos    = level % 2 === 0 ? offset : width - 1 - offset;
    return { i, j: rows - 1 - i + pos };
}

function drawPyramid(
    progress: number, // 0 to 1
    layout: PyramidLayout,
    repr: PyramidRepresentation = defaultOptions,
): string {
    const { rows, skyRows, spoolDistance } = resolveLayout(layout);
    const { gridRows, cols } = pyramidDimensions(layout);
    const mid       = rows - 1;
    const capacity  = rows * rows;       // Rope length = boxes in the finished pile
    const fallCells = gridRows - 1;      // Rows the tip falls before the first landing
    const clamped   = Math.min(Math.max(progress, 0), 1);
    const step      = Math.floor(clamped * (fallCells + capacity));

    // The spool sits above the center column, spoolDistance rows above grid row 0.
    // Column of a straight line from the spool through (toRow, toCol), at grid row r:
    const lineCol = (r: number, toRow: number, toCol: number) => {
        const height = toRow + spoolDistance;
        return height === 0 ? toCol : Math.round(mid + (toCol - mid) * (r + spoolDistance) / height);
    };

    // Where is the rope's tip, and how much rope has landed?
    let landed: number, tipRow: number, tipCol: number;
    if (step < fallCells) {
        // Falling: the tip moves down the line from the spool toward the first landing spot
        landed = 0;
        const land = pilePosition(0, rows);
        tipRow = step;
        tipCol = lineCol(step, skyRows + land.i, land.j);
    } else {
        // Piling: the tip sits on the next landing spot
        landed = step - fallCells;
        if (landed < capacity) {
            const head = pilePosition(landed, rows);
            tipRow = skyRows + head.i;
            tipCol = head.j;
        } else {
            tipRow = -1; // Fully landed, no rope in the air
            tipCol = -1;
        }
    }
    const hanging = capacity - landed;

    let out = "";
    for (let r = 0; r < gridRows; r++) {
        for (let j = 0; j < cols; j++) {
            const isRope = r <= tipRow && r > tipRow - hanging && j === lineCol(r, tipRow, tipCol);
            const index  = pileIndex(r - skyRows, j, rows);

            if (isRope)              out += repr.rope;
            else if (index === -1)   out += repr.unpainted;
            else if (index < landed) out += repr.painted;
            else                     out += repr.unpaintedInPath;
        }
        out += repr.rowEnd;
    }
    return out;
}

export function toProgress(bytesReceived: number, contentLength: number): number {
    if (contentLength <= 0) return 0;
    return Math.min(Math.max(bytesReceived / contentLength, 0), 1);
}

export function drawPulledRope(
    progress: number,
    layout: PyramidLayout = { rows: 11 },
): string {
    const htmlStyle: PyramidRepresentation = {
        painted: '<div class="bg-black"></div>\n',
        unpainted: "<div></div>\n",
        unpaintedInPath: "<div></div>\n",
        rope: '<div class="bg-black"></div>\n',
        rowEnd: "",
    };

    const content = drawPyramid(
        progress,
        layout,
        htmlStyle
    );

    return wrapInContainer(content, layout);
}

function wrapInContainer(content: string, layout: PyramidLayout) {
    const { gridRows, cols } = pyramidDimensions(layout);
    const [n, m] = [gridRows, cols];

    return `
<div
    class="grid"
    style="
        --cell: min(100cqw / ${m}, 100cqh / ${n});
        grid-template-columns: repeat(${m}, var(--cell));
        grid-template-rows: repeat(${n}, var(--cell));
    "
>
    ${content}
</div>`
}
