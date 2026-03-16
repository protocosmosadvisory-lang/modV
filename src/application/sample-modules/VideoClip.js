/**
 * VideoClip module — renders the currently playing clip from the Grackle
 * Clip Launcher into this group's output.
 *
 * Add this module to any group and trigger a clip slot — the video will
 * appear in the layer output.  All modV blend modes, alpha, and effects
 * apply on top.
 */

export default {
  meta: {
    name: "VideoClip",
    author: "Grackle",
    version: "1.0.0",
    type: "2d",
    description: "Renders the active Clip Launcher video in this layer.",
  },

  props: {
    scale: {
      label: "Scale",
      type: "float",
      min: 0.1,
      max: 4,
      default: 1,
      step: 0.01,
    },

    positionX: {
      label: "X",
      type: "float",
      min: -1,
      max: 2,
      default: 0.5,
      step: 0.001,
    },

    positionY: {
      label: "Y",
      type: "float",
      min: -1,
      max: 2,
      default: 0.5,
      step: 0.001,
    },

    fit: {
      label: "Fit",
      type: "enum",
      default: "cover",
      enum: [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
        { label: "Stretch", value: "stretch" },
      ],
    },

    imageSmoothing: {
      label: "Smooth",
      type: "bool",
      default: true,
    },
  },

  draw({ canvas, context, video: videoData, props }) {
    // videoData is the canvas from modV's video pipeline (Webcam or clip)
    const src = videoData && videoData.canvas;
    if (!src || !src.width || !src.height) {
      return;
    }

    const { scale, positionX, positionY, fit, imageSmoothing } = props;
    const { width: cw, height: ch } = canvas;
    const { width: vw, height: vh } = src;

    context.imageSmoothingEnabled = imageSmoothing;

    let dw, dh, dx, dy;

    if (fit === "stretch") {
      dw = cw * scale;
      dh = ch * scale;
      dx = cw * positionX - dw / 2;
      dy = ch * (1 - positionY) - dh / 2;
    } else if (fit === "contain") {
      const ratio = Math.min(cw / vw, ch / vh) * scale;
      dw = vw * ratio;
      dh = vh * ratio;
      dx = cw * positionX - dw / 2;
      dy = ch * (1 - positionY) - dh / 2;
    } else {
      // cover
      const ratio = Math.max(cw / vw, ch / vh) * scale;
      dw = vw * ratio;
      dh = vh * ratio;
      dx = cw * positionX - dw / 2;
      dy = ch * (1 - positionY) - dh / 2;
    }

    context.drawImage(src, dx, dy, dw, dh);
  },
};
