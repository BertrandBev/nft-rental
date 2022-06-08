<script setup lang="ts">
const props = defineProps<{
  error?: string;
}>();
</script>

<template>
  <div class="w-full flex justify-center items-center pa-5" style="height: 50vh">
    <div v-if="error">{{ error }}</div>
    <!-- Replace with a spinner -->
    <div v-else>Loading...</div>
  </div>
</template>
