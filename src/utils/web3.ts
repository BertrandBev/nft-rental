import web3 from "@solana/web3.js";
// If local
import { Connection, programs } from "@metaplex/js";
// import {
//   // Connection,
//   // programs,
//   Metadata,
// } from "../../solana/lib/metaplex-program-library/token-metadata/js/dist/src/mpl-token-metadata";
const {
  metadata: { Metadata },
} = programs;

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const connection = new Connection("mainnet-beta");

export async function getNFTs(pubkey: web3.PublicKey) {
  // Drop that in store! w/ caching
  const meta = await Metadata.findDataByOwner(connection, pubkey);
  console.log("meta", meta);
  return meta;
}
