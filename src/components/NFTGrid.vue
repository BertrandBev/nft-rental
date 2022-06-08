<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";
import { useNftStore } from "../store/nftStore";
import NFTCard from "./NFTCard.vue";

const { nftLoading, nftLoadingError, nfts } = useNftStore();

const grid = ref(null as any);
</script>

<template>
  <div ref="grid" class="grid grid-cols-2 gap-4">
    <NFTCard v-for="nft in nfts" :nft="nft"></NFTCard>
  </div>
</template>
