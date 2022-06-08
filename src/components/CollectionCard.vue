<script setup lang="ts">
import { ref, watchEffect, computed } from "vue";
import {
  useChainApi,
  CollectionKey,
  Collection,
  Keyed,
} from "../utils/chain-api";

const props = defineProps<{
  collection: Keyed<Collection>;
}>();

const account = props.collection.account;

// Apply logo
const logo = ref(null as any);
watchEffect(() => {
  if (logo.value)
    logo.value.style["background-image"] = `url("${account.imageUrl}")`;
});

// Navigate
function navCollection() {
  // console.log('router', $router);
}
</script>

<template>
  <div
    @click="
      () =>
        $router.push({
          path: '/edit-collection',
          query: { pubkey: collection.publicKey.toBase58() },
        })
    "
    class="card w-full border border-slate-800 max-w-md p-4"
  >
    <div
      class="w-32 aspect-square object-cover border border-slate-800 rounded-full bg-cover self-center"
      ref="logo"
    />
    <div class="card-body">
      <h2 class="card-title">{{ account.name }}</h2>
    </div>
  </div>
</template>
