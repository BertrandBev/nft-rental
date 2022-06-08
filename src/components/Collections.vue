<script setup lang="ts">
import { ref, onMounted } from "vue";
import { PlusIcon } from "@heroicons/vue/outline";
import {
  useChainApi,
  CollectionKey,
  Collection,
  Keyed,
} from "../utils/chain-api";
import CollectionCard from "./CollectionCard.vue";
import * as anchor from "@project-serum/anchor";
import web3 = anchor.web3;

const { api, wallet } = useChainApi();

const collectionsLoading = ref(false);
const collections = ref([] as Keyed<Collection>[]);
async function loadCollections() {
  collectionsLoading.value = true;
  try {
    const col = await api.value?.fetchCollections();
    collections.value = col || [];
  } catch (e) {
    console.error(e);
  }
  collectionsLoading.value = false;
}

onMounted(() => {
  // TODO: add loader
  loadCollections();
});
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- Top bar -->
    <div class="w-full p-2 flex items-center">
      <div class="w-full"></div>
      <button
        class="btn btn-ghost gap-2"
        @click="$router.push({ path: '/edit-collection' })"
      >
        <PlusIcon class="w-5" />
        Create a collection
      </button>
    </div>
    <!-- Loader -->
    <div
      v-if="collectionsLoading"
      class="w-full h-full flex justify-center items-center"
    >
      <!-- TODO: replace with loader -->
      <div>Loading...</div>
    </div>
    <!-- Collections -->
    <div v-else ref="grid" class="grid grid-cols-2 gap-4">
      <!-- Card -->
      <CollectionCard
        v-for="collection in collections"
        :collection="collection"
      ></CollectionCard>
    </div>
  </div>
</template>
