<script setup lang="ts">
import { ref } from "vue";
import NFTGrid from "./NFTGrid.vue";

const selectedTab = ref(0);

const tabs = [{ name: "Rented" }, { name: "Owned" }];

// defineProps<{ msg: string }>();

const count = ref(0);
</script>

<template>
  <!-- Scrollable -->
  <div class="flex flex-col items-center">
    <!-- Tabs -->
    <div class="tabs tabs-boxed flex-none mt-5 p-1 bg-white/10">
      <a
        v-for="(tab, idx) in tabs"
        :class="{
          tab: true,
          'tab-lg': true,
          'tab-active': idx == selectedTab,
        }"
        @click="selectedTab = idx"
      >
        {{ tab.name }}
      </a>
    </div>
    <!-- NFTs loader -->
    <NFTGrid class="mt-5"></NFTGrid>
  </div>
</template>
