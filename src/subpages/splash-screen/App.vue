<template>
  <div class="splash">
    <div class="scanlines"></div>
    <div class="content">
      <div class="logo-wrap">
        <svg
          class="grackle-icon"
          viewBox="0 0 80 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Stylized grackle bird silhouette (abstract) -->
          <path
            d="M40 8 C28 8 18 18 16 30 C12 28 6 30 4 36 C10 34 14 36 16 42 C20 52 30 58 40 58 C50 58 60 52 64 42 C66 36 70 34 76 36 C74 30 68 28 64 30 C62 18 52 8 40 8 Z"
            fill="url(#grad)"
            opacity="0.9"
          />
          <path
            d="M32 26 C32 24 34 22 36 22 C38 22 40 24 40 26 C40 28 38 30 36 30 C34 30 32 28 32 26 Z"
            fill="#0a0a0a"
          />
          <path d="M40 38 L36 48 L44 48 Z" fill="rgba(0,255,136,0.6)" />
          <defs>
            <linearGradient
              id="grad"
              x1="4"
              y1="8"
              x2="76"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stop-color="#00ff88" />
              <stop offset="100%" stop-color="#7c3aff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="title">GRACKLE</div>
      <div class="subtitle">Visual Performance System</div>
      <div class="loading-bar">
        <div class="loading-fill"></div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  overflow: hidden;
  background: transparent !important;
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "SF Mono", monospace;
}

.splash {
  width: 100vw;
  height: 100vh;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 136, 0.015) 2px,
    rgba(0, 255, 136, 0.015) 4px
  );
  pointer-events: none;
  animation: scanroll 8s linear infinite;
}

@keyframes scanroll {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 100px;
  }
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  animation: appear 0.6s ease forwards;
}

@keyframes appear {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-wrap {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.grackle-icon {
  width: 80px;
  height: 60px;
  filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.4));
}

.title {
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: 0.35em;
  color: #00ff88;
  text-shadow: 0 0 40px rgba(0, 255, 136, 0.5), 0 0 80px rgba(0, 255, 136, 0.2);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    text-shadow: 0 0 40px rgba(0, 255, 136, 0.5),
      0 0 80px rgba(0, 255, 136, 0.2);
  }
  50% {
    text-shadow: 0 0 60px rgba(0, 255, 136, 0.8),
      0 0 120px rgba(0, 255, 136, 0.4);
  }
}

.subtitle {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.loading-bar {
  width: 180px;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.loading-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #7c3aff);
  border-radius: 2px;
  animation: load 2.4s ease forwards;
}

@keyframes load {
  0% {
    width: 0%;
  }
  60% {
    width: 75%;
  }
  100% {
    width: 100%;
  }
}
</style>
