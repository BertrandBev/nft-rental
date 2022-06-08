<script setup lang="ts">
import { ref, watchEffect, computed } from "vue";
import { PencilIcon, CheckIcon } from "@heroicons/vue/outline";
import { useChainApi, CollectionKey, Collection } from "../utils/chain-api";
import Loader from "./Loader.vue";
import { useAsyncState } from "@vueuse/core";
import * as anchor from "@project-serum/anchor";
import web3 = anchor.web3;

const { api, wallet } = useChainApi();

const props = defineProps<{
  pubkey?: string;
}>();

// Collection data
const data = ref({
  imageUrl: "",
  symbol: "",
  name: "",
  websiteUrl: "",
  royaltiesPercent: 0,
} as Collection);

// Get collection
const {
  state: collection,
  isLoading: collectionLoading,
  execute: fetchCollection,
  error: collectionLoadingError,
} = useAsyncState(async () => {
  if (!props.pubkey) return;
  const res = await api.value?.fetchCollection(
    new web3.PublicKey(props.pubkey!)
  );
  data.value = res as any; // ??
  console.log("RES", res);
  return res;
}, null);

const isNew = computed(() => {
  console.log('isNew', collection.value, !collection.value);
  return !collection.value;
});

// Apply logo
const logo = ref(null as any);
watchEffect(() => {
  if (logo.value)
    logo.value.style["background-image"] = `url("${data.value.imageUrl}")`;
});

// Modal
const modalOpen = ref(false);
function toggleModal() {
  modalOpen.value = !modalOpen.value;
}

// Create
const saveBtn = ref(null as any);

const {
  execute: saveCollection,
  isLoading: collectionSaving,
  error: collectionSavingError,
} = useAsyncState(
  async () => {
    //
    const key = {
      authority: wallet.value?.publicKey,
      symbol: data.value.symbol,
    } as CollectionKey;

    if (isNew.value) {
      // Create collection
      console.log("create collection");
      await api.value?.createCollection(key, data.value);
      // Update route
      const pda = await api.value?.getCollectionPda(key);
      // TODO!: navigate to route
    } else {
      // Update collection
      console.log("update collection");
      await api.value?.updateCollection(key, data.value);
      console.log("Collection updated!");
      collection.value = data.value;
    }
  },
  null,
  {
    onError: (e) => {
      console.error("SAVE ERROR", e);
    },
    immediate: false,
  }
);

async function updateCollection() {}
</script>

<template>
  <div class="w-full flex flex-col items-center p-5">
    <!-- Loader -->
    <Loader
      v-if="collectionLoading || collectionLoadingError"
      :error="collectionLoadingError ? 'Collection loading error' : undefined"
    ></Loader>
    <!-- Card -->
    <div
      v-else
      class="card w-full border border-slate-800 max-w-md flex-col p-6"
    >
      <!-- Image -->
      <div class="relative w-32 h-32 self-center">
        <div
          class="absolute w-32 aspect-square object-cover border border-slate-800 rounded-full bg-cover"
          ref="logo"
        />
        <button
          class="absolute btn btn-circle right-0 bottom-0 modal-button"
          @click="toggleModal"
        >
          <PencilIcon class="w-5"></PencilIcon>
        </button>
        <!-- Url modal -->
        <label
          class="modal cursor-pointer"
          :class="{ 'modal-open': modalOpen }"
        >
          <label class="modal-box relative">
            <div>Set logo url</div>
            <div class="flex items-center mt-4">
              <input
                v-model="data.imageUrl"
                class="input input-bordered w-full"
                type="text"
                placeholder="Name"
              />
              <button class="btn btn-ghost ml-2" @click="toggleModal">
                <CheckIcon class="w-5"></CheckIcon>
              </button>
            </div>
          </label>
        </label>
      </div>
      <!-- <div v-else class="w-full aspect-square bg-slate-800"></div> -->
      <div class="flex">
        <!-- Name -->
        <div class="flex flex-col w-full">
          <label class="label mt-4">
            <span class="label-text">Name</span>
          </label>
          <input
            v-model="data.name"
            class="input input-bordered w-full"
            type="text"
            placeholder="Name"
          />
        </div>
        <!-- Symbol -->
        <div class="flex flex-col ml-4">
          <label class="label mt-4">
            <span class="label-text">Symbol</span>
          </label>
          <input
            v-model="data.symbol"
            class="input input-bordered w-full"
            :class="{ 'input-disabled': !isNew }"
            type="text"
            placeholder="Symbol"
          />
        </div>
      </div>
      <label class="label mt-4">
        <span class="label-text">Website</span>
      </label>
      <input
        v-model="data.websiteUrl"
        class="input input-bordered w-full"
        type="url"
        placeholder="Url"
      />
      <label class="label mt-4">
        <span class="label-text">Royalties</span>
      </label>
      <div class="flex items-center mt-2">
        <input
          class="range range-primary"
          v-model="data.royaltiesPercent"
          type="range"
          min="0"
          max="10"
        />
        <span class="ml-4">{{ data.royaltiesPercent }}%</span>
      </div>
      <!-- Save bar -->
      <button
        ref="saveBtn"
        class="btn self-end mt-6"
        :class="{ loading: collectionSaving }"
        @click="() => saveCollection()"
      >
        Save
      </button>

      <!--  -->
    </div>
  </div>
</template>
