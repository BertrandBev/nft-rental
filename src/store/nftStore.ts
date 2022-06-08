import { createGlobalState } from "@vueuse/core";
import { ref, watchEffect } from "vue";
import { programs } from "@metaplex/js";
import { useChainApi } from "../utils/chain-api";
import axios from "axios";
import * as web3utils from "../utils/web3";

export interface NFT {
  // Loading state
  loading: boolean;
  error: boolean;
  // Meta
  symbol: string;
  updateAuthority: string;
  mint: string;
  name: string;
  collection: string;
  metaUrl: string;
  imageUrl: string;
}

function createNftStore() {
  const nftLoading = ref(false);
  const nftLoadingError = ref(false);
  const nftMeta = ref([] as programs.metadata.MetadataData[]);
  // Loaded metadata
  const metaMap = ref({} as { [key: string]: Object });
  const nfts = ref([] as NFT[]);

  const { wallet } = useChainApi();
  

  watchEffect(async () => {
    if (!wallet.value) return;
    console.log("pubkey", wallet.value?.publicKey);
    //
    nftLoadingError.value = false;
    nftLoading.value = true;
    try {
      nftMeta.value = await web3utils.getNFTs(wallet.value.publicKey);
      nfts.value = nftMeta.value.map(
        (meta) =>
          ({
            symbol: meta.data.symbol,
            updateAuthority: meta.updateAuthority,
            mint: meta.mint,
            name: meta.data.name,
            metaUrl: meta.data.uri,
            loading: false,
            error: false,
          } as NFT)
      );
    } catch (e) {
      console.error("Could not retreive wallet nfts", e);
      nftLoadingError.value = true;
    }
    nftLoading.value = false;
    console.log("nfts", nfts.value);
  });

  async function loadNft(nft: NFT) {
    if (nft.loading || nft.imageUrl) return;
    nft.loading = true;
    nft.error = false;
    try {
      // Load meta map
      if (!metaMap.value[nft.mint]) {
        const res = await axios.get(nft.metaUrl);
        metaMap.value[nft.mint] = res.data;
      }
      // Populate fields
      const meta = metaMap.value[nft.mint] as any;
      nft.collection = meta?.collection?.name;
      nft.imageUrl = meta?.image;
    } catch (e) {
      console.error("Nft loading error", e);
      nft.error = true;
    }
    nft.loading = false;
  }

  return {
    // State
    nftLoading,
    nftLoadingError,
    nfts,
    // Actions
    loadNft,
  };
}

export const useNftStore = createGlobalState(() => createNftStore());
