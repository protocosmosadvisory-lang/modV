<template>
  <span span="1" class="statusbar-item tag">
    <slot></slot>
  </span>
</template>

<style scoped>
.statusbar-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 2px 10px;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}
</style>
