// Shared drawing engine for parchments — used by table.html and companion.html.
// Handles PointerEvents (mouse + Apple Pencil), bezier-smooth strokes, pen/eraser.

export const INK_COLORS = [
    { id: 'ink',      value: '#2a1800', label: 'Ink'      },
    { id: 'blood',    value: '#6b1a0f', label: 'Blood'    },
    { id: 'black',    value: '#0a0a0a', label: 'Black'    },
    { id: 'blue',     value: '#1a2f5a', label: 'Blue'     },
    { id: 'charcoal', value: '#2e2e2e', label: 'Charcoal' },
];

const BG = {
    parchment: '#f4ead2',
    blank:     '#fafaf8',
};

export class ParchmentDraw {
    constructor(canvas, { background = 'parchment', onStrokeComplete, readOnly = false } = {}) {
        this.canvas     = canvas;
        this.ctx        = canvas.getContext('2d');
        this.strokes    = [];
        this._live      = null;
        this._drawing   = false;
        this.tool       = 'pen';
        this.color      = '#2a1800';
        this.width      = 4;
        this.background = background;
        this.readOnly   = readOnly;
        this.onStrokeComplete = onStrokeComplete || null;
        this._dpr = Math.min(window.devicePixelRatio || 1, 2);
        this._w   = 0;
        this._h   = 0;
        this._setup();
        if (!readOnly) this._bindEvents();
        this.redraw();
    }

    _setup() {
        const c = this.canvas;
        const w = c.offsetWidth  || parseInt(c.getAttribute('width'))  || 540;
        const h = c.offsetHeight || parseInt(c.getAttribute('height')) || 360;
        c.width  = Math.round(w * this._dpr);
        c.height = Math.round(h * this._dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this._dpr, this._dpr);
        this._w = w;
        this._h = h;
    }

    _bindEvents() {
        const c = this.canvas;
        c.addEventListener('pointerdown',  e => this._onDown(e), { passive: false });
        c.addEventListener('pointermove',  e => this._onMove(e), { passive: false });
        c.addEventListener('pointerup',    e => this._onUp(e));
        c.addEventListener('pointerleave', e => this._onUp(e));
        c.addEventListener('contextmenu',  e => e.preventDefault());
    }

    _pt(e) {
        const r = this.canvas.getBoundingClientRect();
        return [
            (e.clientX - r.left),
            (e.clientY - r.top),
            e.pressure || 0.5,
        ];
    }

    _onDown(e) {
        e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        this._drawing = true;
        this._live = [this._pt(e)];
        this._renderFrame();
    }

    _onMove(e) {
        if (!this._drawing) return;
        e.preventDefault();
        const pt   = this._pt(e);
        const last = this._live[this._live.length - 1];
        const dx = pt[0] - last[0], dy = pt[1] - last[1];
        if (dx * dx + dy * dy < 4) return; // min 2px distance
        this._live.push(pt);
        this._renderFrame();
    }

    _onUp() {
        if (!this._drawing) return;
        this._drawing = false;
        if (this._live && this._live.length > 0) {
            const stroke = {
                id:     crypto.randomUUID(),
                tool:   this.tool,
                color:  this.color,
                width:  this.width,
                points: [...this._live],
            };
            this.strokes.push(stroke);
            this._live = null;
            this.redraw();
            if (this.onStrokeComplete) this.onStrokeComplete(stroke);
        }
    }

    _renderFrame() {
        this.redraw();
        if (this._live) this._drawPath(this._live, this.tool, this.color, this.width);
    }

    _drawBg() {
        const { ctx } = this;
        ctx.fillStyle = BG[this.background] || BG.parchment;
        ctx.fillRect(0, 0, this._w, this._h);

        if (this.background === 'parchment') {
            ctx.save();
            // Subtle aged-paper spots
            ctx.globalAlpha = 0.055;
            for (let i = 0; i < 6; i++) {
                const x = this._w * (i % 3) / 2.5 + Math.sin(i * 2.1) * 28;
                const y = this._h * Math.floor(i / 3) / 1.5 + Math.cos(i * 1.7) * 22;
                const r = 38 + Math.sin(i * 3.3) * 14;
                const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, '#7a5010');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            // Edge vignette
            ctx.globalAlpha = 1;
            const ev = ctx.createLinearGradient(0, 0, 0, this._h);
            ev.addColorStop(0,    'rgba(60,30,0,0.1)');
            ev.addColorStop(0.07, 'transparent');
            ev.addColorStop(0.93, 'transparent');
            ev.addColorStop(1,    'rgba(60,30,0,0.1)');
            ctx.fillStyle = ev;
            ctx.fillRect(0, 0, this._w, this._h);
            ctx.restore();
        }
    }

    _drawPath(pts, tool, color, width) {
        if (!pts || pts.length === 0) return;
        const { ctx } = this;
        ctx.save();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        const isErase = tool === 'eraser';
        const drawColor = isErase ? (BG[this.background] || BG.parchment) : color;

        ctx.strokeStyle = drawColor;
        ctx.lineWidth   = isErase ? Math.max(width * 5, 24) : width;

        if (pts.length === 1) {
            ctx.fillStyle = drawColor;
            ctx.beginPath();
            ctx.arc(pts[0][0], pts[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length - 1; i++) {
                const xc = (pts[i][0] + pts[i + 1][0]) / 2;
                const yc = (pts[i][1] + pts[i + 1][1]) / 2;
                ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
            }
            const last = pts[pts.length - 1];
            ctx.lineTo(last[0], last[1]);
            ctx.stroke();
        }
        ctx.restore();
    }

    redraw() {
        this.ctx.clearRect(0, 0, this._w, this._h);
        this._drawBg();
        for (const s of this.strokes) this._drawPath(s.points, s.tool, s.color, s.width);
    }

    // Apply a stroke received from another user — no callback fired.
    applyStroke(stroke) {
        this.strokes.push(stroke);
        this._drawPath(stroke.points, stroke.tool, stroke.color, stroke.width);
    }

    setTool(t)  { this.tool  = t; }
    setColor(c) { this.color = c; }
    setWidth(w) { this.width = w; }

    clear() {
        this.strokes  = [];
        this._live    = null;
        this.redraw();
    }

    getStrokes()      { return this.strokes; }
    getBackground()   { return this.background; }

    loadStrokes(strokes) {
        this.strokes = strokes ? [...strokes] : [];
        this.redraw();
    }

    resize() {
        this._setup();
        this.redraw();
    }

    toDataURL() {
        return this.canvas.toDataURL('image/png');
    }
}
