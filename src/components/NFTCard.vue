<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { NFT, useNftStore } from "../store/nftStore";
import { useElementVisibility } from "@vueuse/core";

const props = defineProps<{
  nft: NFT;
}>();

const { loadNft } = useNftStore();
const el = ref(null);
const isVisible = useElementVisibility(el);
watchEffect(() => {
  if (isVisible.value) loadNft(props.nft);
});
</script>

<template>
  <div
    ref="el"
    class="card w-full border border-slate-800 hover:border-white-800 max-w-md"
  >
    <img
      v-if="nft.imageUrl"
      class="w-full aspect-square object-cover"
      :src="nft.imageUrl"
    />
    <div v-else class="w-full aspect-square bg-slate-800"></div>
    <div class="card-body">
      <h2 class="card-title">{{ nft.name }}</h2>
      <div class="card-actions justify-end">
        <button class="btn btn-sm btn-primary">Buy Now</button>
      </div>
    </div>
  </div>
</template>
