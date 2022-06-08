import { ref, computed } from "vue";
import { useAnchorWallet } from "solana-wallets-vue";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { createGlobalState } from "@vueuse/core";
import * as anchor from "@project-serum/anchor";
import web3 = anchor.web3;
// Import solana program
import idl from "../../solana/target/idl/rental.json";
import { Rental } from "../../solana/target/types/rental";
// eslint-disable-next-line
import * as solApi from "../../solana/app/api";
const address = "6R4xELxAKseqmCxS9Vf7VQya4FoEcY4roC7GRYyEf6Hx";

// Import key for dev
const LOCAL_WALLET = true;
import id from "/Users/bbev/.config/solana/id.json";
const keypair = web3.Keypair.fromSecretKey(Uint8Array.from(id as number[]));
// console.log("ID", id, keypair);

const clusterUrl = "http://127.0.0.1:8899";
const preflightCommitment = "processed";
const commitment = "processed";
const programID = new PublicKey(address);

// Re-export types
export type CollectionKey = solApi.CollectionKey;
export type NFT = solApi.NFT;
export type CollectionApp = solApi.CollectionApp;
export type Collection = solApi.Collection;
export type Keyed<T> = solApi.Keyed<T>;

export function _createChainAPI() {
  const wallet = LOCAL_WALLET
    ? ref({
        publicKey: keypair.publicKey,
        signTransaction: async (tx: web3.Transaction) => {
          tx.sign(keypair);
          return tx;
        },
        signAllTransactions: async (txs: web3.Transaction[]) => {
          txs.forEach((tx) => tx.sign(keypair));
          return txs;
        },
      })
    : useAnchorWallet();
  const connection = new Connection(clusterUrl, commitment);
  const provider = computed(() => {
    if (wallet.value) {
      return new AnchorProvider(connection, wallet.value, {
        preflightCommitment,
        commitment,
      });
    }
    return null;
  });

  const program = computed(() =>
    provider.value
      ? // @ts-ignore
        (new Program(idl, programID, provider.value) as Program<Rental>)
      : null
  );

  const api = computed(() =>
    program.value ? solApi.getAPI(program.value) : null
  );
  //
  return {
    wallet,
    connection,
    api,
  };
}

export const useChainApi = createGlobalState(() => _createChainAPI());
