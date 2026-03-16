<template>
  <div
    class="projection-editor"
    v-infoView="{ title: iVTitle, body: iVBody, id: 'Projection Editor Panel' }"
    v-searchTerms="{
      terms: ['projection', 'mapping', 'surface', 'output'],
      title: 'Projection Editor',
      type: 'Panel',
    }"
  >
    <aside class="projection-sidebar">
      <header class="sidebar-header">
        <div>
          <h2 class="sidebar-title">Projection</h2>
          <p class="sidebar-subtitle">Local surface editor</p>
        </div>
        <div class="sidebar-actions">
          <button type="button" class="sidebar-button" @click="addSurface">
            Add
          </button>
          <button
            type="button"
            class="sidebar-button"
            :disabled="!selectedSurface"
            @click="renameSurface"
          >
            Rename
          </button>
          <button
            type="button"
            class="sidebar-button danger"
            :disabled="surfaces.length <= 1 || !selectedSurface"
            @click="removeSurface"
          >
            Remove
          </button>
        </div>
      </header>

      <section class="output-panel">
        <label class="control-label" for="output-index">Output Display</label>
        <select
          id="output-index"
          v-model.number="outputDisplayIndex"
          class="control-input"
        >
          <option :value="0">Display 0</option>
          <option :value="1">Display 1</option>
          <option :value="2">Display 2</option>
        </select>

        <button type="button" class="open-output-button" @click="openOutput">
          Open Output
        </button>
      </section>

      <section class="surface-list">
        <div
          v-for="surface in surfaces"
          :key="surface.id"
          class="surface-card"
          :class="{ selected: surface.id === selectedSurfaceId }"
          @click="selectSurface(surface.id)"
        >
          <div class="surface-card__header">
            <span class="surface-card__name">{{ surface.name }}</span>
            <span class="surface-card__index">D{{ surface.displayIndex }}</span>
          </div>

          <label class="surface-field">
            <span>Display</span>
            <select
              v-model.number="surface.displayIndex"
              class="surface-input"
              @click.stop
            >
              <option :value="0">0</option>
              <option :value="1">1</option>
              <option :value="2">2</option>
            </select>
          </label>

          <label class="surface-field">
            <span>Opacity</span>
            <input
              :value="surface.opacity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="surface-slider"
              @click.stop
              @input="updateOpacity(surface.id, $event.target.value)"
            />
          </label>

          <label class="surface-toggle" @click.stop>
            <input
              :checked="surface.enabled"
              type="checkbox"
              @change="updateEnabled(surface.id, $event.target.checked)"
            />
            <span>{{ surface.enabled ? "Enabled" : "Disabled" }}</span>
          </label>
        </div>
      </section>
    </aside>

    <section class="projection-stage">
      <header class="stage-toolbar">
        <div class="stage-meta">
          <span class="stage-label">Preview</span>
          <span class="stage-name">{{ selectedSurfaceName }}</span>
        </div>

        <button
          type="button"
          class="sidebar-button"
          :disabled="!selectedSurface"
          @click="resetCorners"
        >
          Reset Corners
        </button>
      </header>

      <div class="canvas-shell" ref="canvasShell">
        <canvas
          ref="canvas"
          class="projection-canvas"
          @mousedown.left="handlePointerDown"
        ></canvas>
      </div>
    </section>
  </div>
</template>

<script>
const DEFAULT_CORNERS = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createSurface(index) {
  return {
    id: `surface-${Date.now()}-${index}-${Math.round(Math.random() * 100000)}`,
    name: `Surface ${index + 1}`,
    displayIndex: 0,
    corners: DEFAULT_CORNERS.map(([x, y]) => [x, y]),
    opacity: 1,
    enabled: true,
  };
}

export default {
  data() {
    const firstSurface = createSurface(0);

    return {
      iVTitle: "Projection Editor",
      iVBody:
        "Build and adjust projection mapping surfaces locally, preview the main output, and drag each corner of a quad directly on the canvas.",
      surfaces: [firstSurface],
      selectedSurfaceId: firstSurface.id,
      outputDisplayIndex: 0,
      resizeObserver: null,
      dragState: null,
      previewBounds: {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      },
      renderFrame: null,
    };
  },

  computed: {
    selectedSurface() {
      return (
        this.surfaces.find(
          (surface) => surface.id === this.selectedSurfaceId
        ) || null
      );
    },

    selectedSurfaceName() {
      return this.selectedSurface ? this.selectedSurface.name : "No Surface";
    },

    mainOutputContext() {
      return this.$modV.store.state.outputs.main;
    },
  },

  mounted() {
    this.resizeCanvas();
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    this.resizeObserver.observe(this.$refs.canvasShell);
    window.addEventListener("mousemove", this.handlePointerMove);
    window.addEventListener("mouseup", this.handlePointerUp);
    this.startRenderLoop();
  },

  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.renderFrame) {
      cancelAnimationFrame(this.renderFrame);
    }

    window.removeEventListener("mousemove", this.handlePointerMove);
    window.removeEventListener("mouseup", this.handlePointerUp);
  },

  methods: {
    selectSurface(id) {
      this.selectedSurfaceId = id;
    },

    addSurface() {
      const surface = createSurface(this.surfaces.length);
      surface.displayIndex = this.outputDisplayIndex;
      this.surfaces.push(surface);
      this.selectedSurfaceId = surface.id;
    },

    renameSurface() {
      if (!this.selectedSurface) {
        return;
      }

      const name = window.prompt("Rename surface", this.selectedSurface.name);
      if (!name) {
        return;
      }

      this.selectedSurface.name = name.trim() || this.selectedSurface.name;
    },

    removeSurface() {
      if (!this.selectedSurface || this.surfaces.length <= 1) {
        return;
      }

      const index = this.surfaces.findIndex(
        (surface) => surface.id === this.selectedSurfaceId
      );
      this.surfaces.splice(index, 1);
      this.selectedSurfaceId = this.surfaces[Math.max(0, index - 1)].id;
    },

    updateOpacity(surfaceId, value) {
      const surface = this.surfaces.find((entry) => entry.id === surfaceId);
      if (!surface) {
        return;
      }

      const parsed = parseFloat(value);
      surface.opacity = Number.isNaN(parsed)
        ? 1
        : Math.min(1, Math.max(0, parsed));
    },

    updateEnabled(surfaceId, value) {
      const surface = this.surfaces.find((entry) => entry.id === surfaceId);
      if (!surface) {
        return;
      }

      surface.enabled = value;
    },

    async openOutput() {
      const id = await this.$modV.store.dispatch("windows/createWindow");

      this.$modV.store.commit("windows/UPDATE_WINDOW", {
        id,
        key: "displayIndex",
        value: this.outputDisplayIndex,
      });

      this.$modV.store.commit("windows/UPDATE_WINDOW", {
        id,
        key: "fullscreen",
        value: true,
      });
    },

    resetCorners() {
      if (!this.selectedSurface) {
        return;
      }

      this.selectedSurface.corners = DEFAULT_CORNERS.map(([x, y]) => [x, y]);
    },

    resizeCanvas() {
      const shell = this.$refs.canvasShell;
      const canvas = this.$refs.canvas;
      if (!shell || !canvas) {
        return;
      }

      const { width, height } = shell.getBoundingClientRect();
      if (!width || !height) {
        return;
      }

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this.drawCanvas();
    },

    startRenderLoop() {
      const render = () => {
        this.drawCanvas();
        this.renderFrame = requestAnimationFrame(render);
      };

      render();
    },

    drawCanvas() {
      const canvas = this.$refs.canvas;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      const width = parseFloat(canvas.style.width) || canvas.clientWidth;
      const height = parseFloat(canvas.style.height) || canvas.clientHeight;
      if (!width || !height) {
        return;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#090a0d";
      context.fillRect(0, 0, width, height);

      const previewWidth = width;
      const previewHeight = previewWidth / (16 / 9);
      let drawWidth = previewWidth;
      let drawHeight = previewHeight;

      if (previewHeight > height) {
        drawHeight = height;
        drawWidth = drawHeight * (16 / 9);
      }

      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      this.previewBounds = {
        x: offsetX,
        y: offsetY,
        width: drawWidth,
        height: drawHeight,
      };

      context.fillStyle = "#12151b";
      context.fillRect(offsetX, offsetY, drawWidth, drawHeight);
      this.drawOutputPreview(context);

      context.strokeStyle = "rgba(255, 255, 255, 0.18)";
      context.lineWidth = 1;
      context.strokeRect(
        offsetX + 0.5,
        offsetY + 0.5,
        drawWidth - 1,
        drawHeight - 1
      );

      this.drawGrid(context);
      this.drawSurfaces(context);
    },

    drawOutputPreview(context) {
      const sourceCanvas =
        this.mainOutputContext && this.mainOutputContext.canvas;
      const { x, y, width, height } = this.previewBounds;

      if (sourceCanvas) {
        context.save();
        context.globalAlpha = 0.42;
        context.drawImage(sourceCanvas, x, y, width, height);
        context.restore();
      }

      const gradient = context.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.02)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
      context.fillStyle = gradient;
      context.fillRect(x, y, width, height);
    },

    drawGrid(context) {
      const { x, y, width, height } = this.previewBounds;
      context.save();
      context.strokeStyle = "rgba(255, 255, 255, 0.06)";
      context.lineWidth = 1;

      for (let column = 1; column < 4; column++) {
        const lineX = x + width * (column / 4);
        context.beginPath();
        context.moveTo(lineX, y);
        context.lineTo(lineX, y + height);
        context.stroke();
      }

      for (let row = 1; row < 4; row++) {
        const lineY = y + height * (row / 4);
        context.beginPath();
        context.moveTo(x, lineY);
        context.lineTo(x + width, lineY);
        context.stroke();
      }

      context.restore();
    },

    drawSurfaces(context) {
      for (
        let surfaceIndex = 0;
        surfaceIndex < this.surfaces.length;
        surfaceIndex++
      ) {
        const surface = this.surfaces[surfaceIndex];
        const isSelected = surface.id === this.selectedSurfaceId;
        const points = surface.corners.map(([cornerX, cornerY]) =>
          this.toCanvasPoint(cornerX, cornerY)
        );

        context.save();
        context.beginPath();
        for (let index = 0; index < points.length; index++) {
          const point = points[index];
          if (index === 0) {
            context.moveTo(point.x, point.y);
          } else {
            context.lineTo(point.x, point.y);
          }
        }
        context.closePath();
        context.fillStyle = surface.enabled
          ? isSelected
            ? `rgba(255, 140, 64, ${0.18 * surface.opacity})`
            : `rgba(64, 151, 255, ${0.14 * surface.opacity})`
          : "rgba(90, 90, 98, 0.08)";
        context.fill();
        context.strokeStyle = isSelected ? "#ff8c40" : "#5aa8ff";
        context.lineWidth = isSelected ? 2 : 1.25;
        context.stroke();

        for (let index = 0; index < points.length; index++) {
          const point = points[index];
          context.beginPath();
          context.arc(point.x, point.y, isSelected ? 7 : 5, 0, Math.PI * 2);
          context.fillStyle = isSelected ? "#ffd16b" : "#8ec5ff";
          context.fill();
          context.strokeStyle = "#0b0c10";
          context.lineWidth = 2;
          context.stroke();

          context.fillStyle = "#0b0c10";
          context.font = "10px monospace";
          context.fillText(`${index + 1}`, point.x + 10, point.y - 10);
        }
        context.restore();
      }
    },

    toCanvasPoint(x, y) {
      return {
        x: this.previewBounds.x + x * this.previewBounds.width,
        y: this.previewBounds.y + y * this.previewBounds.height,
      };
    },

    getNormalizedPoint(event) {
      if (!this.$refs.canvas) {
        return { x: 0, y: 0 };
      }

      const rect = this.$refs.canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      return {
        x: clamp((localX - this.previewBounds.x) / this.previewBounds.width),
        y: clamp((localY - this.previewBounds.y) / this.previewBounds.height),
      };
    },

    findCornerHit(event) {
      const rect = this.$refs.canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const hitRadius = 12;

      for (
        let surfaceIndex = this.surfaces.length - 1;
        surfaceIndex >= 0;
        surfaceIndex--
      ) {
        const surface = this.surfaces[surfaceIndex];

        for (
          let cornerIndex = 0;
          cornerIndex < surface.corners.length;
          cornerIndex++
        ) {
          const point = this.toCanvasPoint(
            surface.corners[cornerIndex][0],
            surface.corners[cornerIndex][1]
          );
          const distance = Math.hypot(pointerX - point.x, pointerY - point.y);

          if (distance <= hitRadius) {
            return {
              surfaceId: surface.id,
              cornerIndex,
            };
          }
        }
      }

      return null;
    },

    handlePointerDown(event) {
      const hit = this.findCornerHit(event);
      if (!hit) {
        return;
      }

      this.selectedSurfaceId = hit.surfaceId;
      this.dragState = hit;
      this.updateDraggedCorner(event);
    },

    handlePointerMove(event) {
      if (!this.dragState) {
        return;
      }

      this.updateDraggedCorner(event);
    },

    handlePointerUp() {
      this.dragState = null;
    },

    updateDraggedCorner(event) {
      const { x, y } = this.getNormalizedPoint(event);
      const surface = this.surfaces.find(
        (entry) => entry.id === this.dragState.surfaceId
      );
      if (!surface) {
        return;
      }

      surface.corners.splice(this.dragState.cornerIndex, 1, [x, y]);
    },
  },
};
</script>

<style scoped>
.projection-editor {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 0;
  height: 100%;
  background: radial-gradient(
      circle at top left,
      rgba(71, 84, 112, 0.14),
      transparent 28%
    ),
    linear-gradient(180deg, #0a0b0f 0%, #101217 100%);
  color: #d2d8e5;
  overflow: hidden;
}

.projection-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  background: rgba(8, 9, 12, 0.94);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  min-width: 0;
}

.sidebar-header,
.output-panel,
.surface-card,
.stage-toolbar {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(21, 24, 31, 0.92);
}

.sidebar-header {
  padding: 12px;
}

.sidebar-title {
  margin: 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.sidebar-subtitle {
  margin: 4px 0 0;
  color: rgba(210, 216, 229, 0.62);
  font-size: 0.72rem;
}

.sidebar-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 12px;
}

.sidebar-button,
.open-output-button {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, #2b303b 0%, #1e232b 100%);
  color: #edf3ff;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 10px;
}

.sidebar-button:disabled,
.open-output-button:disabled {
  opacity: 0.45;
}

.sidebar-button.danger {
  color: #ff9d92;
}

.output-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.control-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(210, 216, 229, 0.72);
}

.control-input,
.surface-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: #101319;
  color: #edf3ff;
  padding: 7px 8px;
}

.open-output-button {
  background: linear-gradient(180deg, #2e4d38 0%, #1b2e21 100%);
}

.surface-list {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.surface-card {
  text-align: left;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.surface-card.selected {
  border-color: rgba(255, 140, 64, 0.72);
  box-shadow: inset 0 0 0 1px rgba(255, 140, 64, 0.18);
}

.surface-card__header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.surface-card__name {
  font-size: 0.82rem;
  font-weight: 600;
}

.surface-card__index {
  font-size: 0.7rem;
  color: rgba(210, 216, 229, 0.6);
  letter-spacing: 0.08em;
}

.surface-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.72rem;
  color: rgba(210, 216, 229, 0.72);
}

.surface-slider {
  width: 100%;
}

.surface-toggle {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 0.74rem;
  color: rgba(210, 216, 229, 0.84);
}

.projection-stage {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 14px;
  gap: 12px;
}

.stage-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}

.stage-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.stage-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(210, 216, 229, 0.68);
}

.stage-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #edf3ff;
}

.canvas-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.025) 25%,
      transparent 25%
    ),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.025) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.025) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.025) 75%),
    #0d1015;
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.projection-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

@media (max-width: 1100px) {
  .projection-editor {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .projection-sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    max-height: 45%;
  }
}
</style>
