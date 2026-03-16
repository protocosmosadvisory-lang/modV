<template>
  <div class="effect-chain-view">
    <div class="effect-chain-view__toolbar">
      <div class="effect-chain-view__field">
        <div class="effect-chain-view__label">Group</div>
        <Select v-model="selectedGroupId">
          <option
            v-for="group in availableGroups"
            :key="group.id"
            :value="group.id"
          >
            {{ group.name }}
          </option>
        </Select>
      </div>

      <button
        class="effect-chain-view__bypass"
        :disabled="!activeModules.length"
        @click="bypassAll"
      >
        Bypass All
      </button>
    </div>

    <Container
      v-if="selectedGroup"
      drag-handle-selector=".effect-chain-card__handle"
      orientation="vertical"
      group-name="modules"
      :should-animate-drop="() => false"
      :get-child-payload="getChildPayload"
      tag="div"
      class="effect-chain-view__list"
      @drop="onDrop"
    >
      <Draggable
        v-for="module in activeModules"
        :key="module.$id"
        class="effect-chain-view__draggable"
      >
        <div
          class="effect-chain-card"
          :style="{ borderLeftColor: getModuleColor(module.meta.name) }"
        >
          <div class="effect-chain-card__header">
            <button
              class="effect-chain-card__collapse"
              @click="toggleCollapsed(module.$id)"
            >
              {{ isCollapsed(module.$id) ? "+" : "-" }}
            </button>

            <div class="effect-chain-card__handle">
              {{ module.meta.name }}
            </div>
          </div>

          <div class="effect-chain-card__body">
            <div class="effect-chain-card__control">
              <span class="effect-chain-card__control-label">Enable</span>
              <Checkbox
                :value="module.meta.enabled"
                @input="updateModuleMeta(module.$id, 'enabled', $event)"
              />
            </div>

            <div class="effect-chain-card__control">
              <span class="effect-chain-card__control-label">Alpha</span>
              <Range
                :value="module.meta.alpha"
                min="0"
                max="1"
                step="0.001"
                @input="updateModuleMeta(module.$id, 'alpha', $event)"
              />
            </div>

            <div class="effect-chain-card__control">
              <span class="effect-chain-card__control-label">Blend</span>
              <Select
                :value="module.meta.compositeOperation || 'normal'"
                @input="
                  updateModuleMeta(module.$id, 'compositeOperation', $event)
                "
              >
                <optgroup
                  v-for="group in compositeOperations"
                  :key="group.label"
                  :label="group.label"
                >
                  <option
                    v-for="mode in group.children"
                    :key="mode.value"
                    :value="mode.value"
                  >
                    {{ mode.label }}
                  </option>
                </optgroup>
              </Select>
            </div>
          </div>

          <div v-if="!isCollapsed(module.$id)" class="effect-chain-card__props">
            <div
              v-for="propName in getPropKeys(module)"
              :key="`${module.$id}-${propName}`"
              class="effect-chain-card__prop"
            >
              <template v-if="isBooleanProp(module, propName)">
                <span class="effect-chain-card__prop-label">
                  {{ getPropLabel(module, propName) }}
                </span>
                <Checkbox
                  :value="Boolean(getPropValue(module, propName))"
                  emitBoolean
                  @input="updateProp(module.$id, propName, $event)"
                />
              </template>

              <template v-else-if="isEnumProp(module, propName)">
                <span class="effect-chain-card__prop-label">
                  {{ getPropLabel(module, propName) }}
                </span>
                <Select
                  :value="getPropValue(module, propName)"
                  @input="updateProp(module.$id, propName, $event)"
                >
                  <option
                    v-for="option in getEnumOptions(module, propName)"
                    :key="getEnumOptionValue(option)"
                    :value="getEnumOptionValue(option)"
                  >
                    {{ getEnumOptionLabel(option) }}
                  </option>
                </Select>
              </template>

              <template v-else-if="isSliderProp(module, propName)">
                <div class="effect-chain-card__prop-title">
                  {{ getPropLabel(module, propName) }}
                </div>

                <div
                  v-for="pathKey in getSliderKeys(module, propName)"
                  :key="`${module.$id}-${propName}-${pathKey}`"
                  class="effect-chain-card__slider-row"
                >
                  <span class="effect-chain-card__slider-label">
                    {{ formatPathKey(pathKey) }}
                  </span>
                  <Range
                    :value="getSliderValue(module, propName, pathKey)"
                    :min="getSliderMin(module, propName)"
                    :max="getSliderMax(module, propName, pathKey)"
                    :step="getSliderStep(module, propName)"
                    @input="
                      updateSliderProp(module.$id, propName, pathKey, $event)
                    "
                  />
                </div>
              </template>

              <template v-else>
                <div class="effect-chain-card__prop-title">
                  {{ getPropLabel(module, propName) }}
                </div>
                <div class="effect-chain-card__unsupported">Unsupported</div>
              </template>
            </div>
          </div>
        </div>
      </Draggable>
    </Container>

    <div v-else class="effect-chain-view__empty">No groups available.</div>

    <div class="effect-chain-view__add">
      <div class="effect-chain-view__label">Add Module</div>
      <TextInput
        v-model="moduleFilter"
        class="effect-chain-view__search"
        placeholder="Filter modules"
      />

      <div class="effect-chain-view__add-list">
        <button
          v-for="moduleName in filteredModuleNames"
          :key="moduleName"
          class="effect-chain-view__add-item"
          @click="addModule(moduleName)"
        >
          {{ moduleName }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { Container, Draggable } from "vue-smooth-dnd";
import Checkbox from "./inputs/Checkbox.vue";
import Range from "./inputs/Range.vue";
import Select from "./inputs/Select.vue";
import TextInput from "./inputs/TextInput.vue";
import constants from "../application/constants";
import compositeOperations from "../util/composite-operations";

const applyDrag = (arr, dragResult) => {
  const { removedIndex, addedIndex, payload } = dragResult;
  if (removedIndex === null && addedIndex === null) {
    return arr;
  }

  const result = [...arr];
  let itemToAdd = payload;

  if (removedIndex !== null) {
    itemToAdd = result.splice(removedIndex, 1)[0];
  }

  if (addedIndex !== null) {
    result.splice(addedIndex, 0, itemToAdd);
  }

  return result;
};

export default {
  name: "EffectChainView",

  components: {
    Checkbox,
    Container,
    Draggable,
    Range,
    Select,
    TextInput,
  },

  data() {
    return {
      compositeOperations,
      selectedGroupId: "",
      moduleFilter: "",
      localModules: [],
      collapsedModules: {},
    };
  },

  computed: {
    availableGroups() {
      return this.$modV.store.state.groups.groups.filter(
        (group) => group.name !== constants.GALLERY_GROUP_NAME
      );
    },

    selectedGroup() {
      return (
        this.availableGroups.find(
          (group) => group.id === this.selectedGroupId
        ) || null
      );
    },

    activeModules() {
      return this.localModules
        .map((moduleId) => this.$modV.store.state.modules.active[moduleId])
        .filter(Boolean);
    },

    registeredModuleNames() {
      return Object.keys(this.$modV.store.state.modules.registered).sort(
        (a, b) => a.localeCompare(b)
      );
    },

    filteredModuleNames() {
      const term = this.moduleFilter.toLowerCase().trim();

      return this.registeredModuleNames.filter((moduleName) => {
        if (!term.length) {
          return true;
        }

        return moduleName.toLowerCase().includes(term);
      });
    },
  },

  created() {
    this.syncSelectedGroup();
    this.syncLocalModules();
  },

  methods: {
    syncSelectedGroup() {
      if (
        this.selectedGroupId &&
        this.availableGroups.find((group) => group.id === this.selectedGroupId)
      ) {
        return;
      }

      this.selectedGroupId = this.availableGroups[0]?.id || "";
    },

    syncLocalModules() {
      this.localModules = this.selectedGroup
        ? [...this.selectedGroup.modules]
        : [];
    },

    getChildPayload(index) {
      return {
        moduleId: this.localModules[index],
        collection: "layer",
      };
    },

    onDrop(dropResult) {
      if (!this.selectedGroup) {
        return;
      }

      const { addedIndex, removedIndex } = dropResult;

      if (addedIndex === null && removedIndex === null) {
        return;
      }

      const modules = applyDrag(this.localModules, dropResult);
      this.localModules = modules;

      this.$modV.store.commit("groups/REPLACE_GROUP_MODULES", {
        groupId: this.selectedGroupId,
        modules,
      });
    },

    async addModule(moduleName) {
      if (!this.selectedGroupId) {
        return;
      }

      const module = await this.$modV.store.dispatch(
        "modules/makeActiveModule",
        {
          moduleName,
        }
      );

      // Snapshot position after await to avoid stale index from concurrent mutations
      const position = this.selectedGroup
        ? this.selectedGroup.modules.length
        : 0;
      this.$modV.store.commit("groups/ADD_MODULE_TO_GROUP", {
        moduleId: module.$id,
        groupId: this.selectedGroupId,
        position,
      });
    },

    bypassAll() {
      const modules = this.activeModules;
      for (let i = 0, len = modules.length; i < len; i++) {
        const module = modules[i];

        this.updateModuleMeta(module.$id, "alpha", 0);
      }
    },

    updateModuleMeta(moduleId, metaKey, value) {
      this.$modV.store.commit("modules/UPDATE_ACTIVE_MODULE_META", {
        id: moduleId,
        metaKey,
        data: value,
      });
    },

    async updateProp(moduleId, prop, data, path = "") {
      await this.$modV.store.dispatch("modules/updateProp", {
        moduleId,
        prop,
        data,
        path,
      });
    },

    updateSliderProp(moduleId, prop, pathKey, value) {
      const path = pathKey === "__value__" ? "" : `[${pathKey}]`;
      this.updateProp(moduleId, prop, value, path);
    },

    toggleCollapsed(moduleId) {
      this.$set(this.collapsedModules, moduleId, !this.isCollapsed(moduleId));
    },

    isCollapsed(moduleId) {
      return Boolean(this.collapsedModules[moduleId]);
    },

    getModuleColor(name) {
      let hash = 0;
      for (let i = 0; i < name.length; i += 1) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
      }

      return `hsl(${Math.abs(hash) % 360}, 60%, 55%)`;
    },

    getPropKeys(module) {
      return Object.keys(module.$props || {});
    },

    getPropDefinition(module, propName) {
      return module.$props?.[propName] || {};
    },

    getPropLabel(module, propName) {
      return this.getPropDefinition(module, propName).label || propName;
    },

    getPropValue(module, propName) {
      return module.props?.[propName];
    },

    isBooleanProp(module, propName) {
      return this.getPropDefinition(module, propName).type === "bool";
    },

    isEnumProp(module, propName) {
      return this.getPropDefinition(module, propName).type === "enum";
    },

    isSliderProp(module, propName) {
      const type = this.getPropDefinition(module, propName).type;

      return ["float", "int", "vec2", "vec3", "vec4", "color"].includes(type);
    },

    getEnumOptions(module, propName) {
      const prop = this.getPropDefinition(module, propName);
      return prop.options || prop.enum || [];
    },

    getEnumOptionValue(option) {
      return typeof option === "object" ? option.value : option;
    },

    getEnumOptionLabel(option) {
      return typeof option === "object" ? option.label || option.value : option;
    },

    getSliderKeys(module, propName) {
      const value = this.getPropValue(module, propName);

      if (Array.isArray(value)) {
        return value.map((_, index) => index);
      }

      if (value && typeof value === "object") {
        return Object.keys(value);
      }

      return ["__value__"];
    },

    getSliderValue(module, propName, pathKey) {
      const value = this.getPropValue(module, propName);

      if (pathKey === "__value__") {
        return value;
      }

      return value[pathKey];
    },

    getSliderMin(module, propName) {
      const prop = this.getPropDefinition(module, propName);

      if (prop.type === "color") {
        return 0;
      }

      return typeof prop.min === "undefined" ? 0 : prop.min;
    },

    getSliderMax(module, propName, pathKey) {
      const prop = this.getPropDefinition(module, propName);

      if (prop.type === "color") {
        return 1;
      }

      if (typeof prop.max !== "undefined") {
        return prop.max;
      }

      const value = this.getSliderValue(module, propName, pathKey);
      if (typeof value === "number" && value > 1) {
        return value * 2;
      }

      return 1;
    },

    getSliderStep(module, propName) {
      return this.getPropDefinition(module, propName).type === "int"
        ? 1
        : 0.001;
    },

    formatPathKey(pathKey) {
      if (pathKey === "__value__") {
        return "Value";
      }

      return String(pathKey).toUpperCase();
    },
  },

  watch: {
    availableGroups() {
      this.syncSelectedGroup();
    },

    selectedGroupId() {
      this.syncLocalModules();
    },

    selectedGroup: {
      handler() {
        this.syncLocalModules();
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
.effect-chain-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

.effect-chain-view__toolbar {
  display: flex;
  align-items: end;
  gap: 12px;
}

.effect-chain-view__field {
  flex: 1;
}

.effect-chain-view__label {
  font-size: 12px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.effect-chain-view__bypass,
.effect-chain-view__add-item,
.effect-chain-card__collapse {
  appearance: none;
  border: 0;
  background: #151515;
  color: white;
  cursor: pointer;
}

.effect-chain-view__bypass {
  height: 24px;
  padding: 0 12px;
}

.effect-chain-view__bypass:disabled {
  opacity: 0.4;
  cursor: default;
}

.effect-chain-view__list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.effect-chain-view__draggable + .effect-chain-view__draggable {
  margin-top: 12px;
}

.effect-chain-card {
  background: #363636;
  border-left: 6px solid #c4c4c4;
}

.effect-chain-card__header {
  display: flex;
  align-items: center;
  min-height: 36px;
  background: #484848;
}

.effect-chain-card__collapse {
  width: 36px;
  height: 36px;
  font-size: 18px;
}

.effect-chain-card__handle {
  flex: 1;
  padding: 0 12px;
  cursor: grab;
  user-select: none;
}

.effect-chain-card__body,
.effect-chain-card__props {
  padding: 12px;
}

.effect-chain-card__body {
  display: grid;
  gap: 10px;
  border-bottom: 1px solid #484848;
}

.effect-chain-card__control,
.effect-chain-card__prop,
.effect-chain-card__slider-row {
  display: grid;
  gap: 6px;
}

.effect-chain-card__control-label,
.effect-chain-card__prop-label,
.effect-chain-card__prop-title,
.effect-chain-card__slider-label {
  font-size: 12px;
}

.effect-chain-card__slider-row {
  grid-template-columns: 36px 1fr;
  align-items: center;
}

.effect-chain-card__unsupported {
  color: #c4c4c4;
  font-size: 12px;
}

.effect-chain-view__empty {
  color: #c4c4c4;
}

.effect-chain-view__add {
  border-top: 1px solid #484848;
  padding-top: 16px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.effect-chain-view__search {
  margin-bottom: 8px;
}

.effect-chain-view__add-list {
  overflow-y: auto;
  display: grid;
  gap: 6px;
}

.effect-chain-view__add-item {
  text-align: left;
  padding: 8px 10px;
  background: #363636;
}
</style>
