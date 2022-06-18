import { Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { Rental } from "../target/types/rental";
import web3 = anchor.web3;

export interface CollectionKey {
  symbol: string;
  authority: web3.PublicKey;
}

export interface Keyed<T> {
  account: T;
  publicKey: web3.PublicKey;
}

// Extract types
const typeProg = null as Program<Rental>;
export type Collection = Awaited<
  ReturnType<typeof typeProg.account.collection.fetch>
>;
export type CollectionApp = Awaited<
  ReturnType<typeof typeProg.account.collectionApp.fetch>
>;
export type NFT = Awaited<ReturnType<typeof typeProg.account.nft.fetch>>;

export function getAPI(program: Program<Rental>) {
  // Retreive types

  async function airdrop(pubkey: web3.PublicKey, lamports: number) {
    await program.provider.connection
      .requestAirdrop(pubkey, lamports)
      .then((sig) => program.provider.connection.confirmTransaction(sig));
  }

  async function getCollectionPda(
    key: CollectionKey
  ): Promise<{ pda: web3.PublicKey; bump: number }> {
    const [pda, bump] = await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("collection"),
        Buffer.from(key.symbol),
        key.authority.toBytes(),
      ],
      program.programId
    );
    return { pda, bump };
  }

  async function getNFTPda(
    mint: web3.PublicKey
  ): Promise<{ pda: web3.PublicKey; bump: number }> {
    const [pda, bump] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("nft"), mint.toBytes()],
      program.programId
    );
    return { pda, bump };
  }

  async function fetchCollection(
    key: CollectionKey | web3.PublicKey
  ): Promise<Collection> {
    let pubkey: web3.PublicKey;
    if (key instanceof web3.PublicKey) pubkey = key;
    else {
      const pda = await getCollectionPda(key as CollectionKey);
      pubkey = pda.pda;
    }
    return program.account.collection.fetch(pubkey);
  }

  async function fetchCollections(): Promise<Keyed<Collection>[]> {
    return program.account.collection.all();
  }

  async function createCollection(key: CollectionKey, collection: Collection) {
    const { pda } = await getCollectionPda(key);
    await program.methods
      .createCollection(
        collection.symbol,
        collection.name,
        collection.imageUrl,
        collection.websiteUrl,
        collection.royaltiesPercent
      )
      .accounts({
        collection: pda,
        authority: key.authority,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }

  async function updateCollection(key: CollectionKey, collection: Collection) {
    const { pda } = await getCollectionPda(key);
    await program.methods
      .updateCollection(
        collection.symbol,
        collection.name,
        collection.imageUrl,
        collection.websiteUrl,
        collection.royaltiesPercent
      )
      .accounts({
        authority: key.authority,
        collection: pda,
      })
      .rpc();
  }

  async function fetchCollectionApp(pubkey: web3.PublicKey) {
    return program.account.collectionApp.fetch(pubkey);
  }

  async function fetchCollectionApps(
    key: CollectionKey
  ): Promise<Keyed<CollectionApp>[]> {
    const collectionPda = await getCollectionPda(key);
    return program.account.collectionApp.all([
      {
        memcmp: {
          offset: 8, // Discriminator.
          bytes: collectionPda.pda.toBase58(),
        },
      },
    ]);
  }

  async function createCollectionApp(
    key: CollectionKey,
    collectionApp: CollectionApp
  ): Promise<web3.PublicKey> {
    const collectionPda = await getCollectionPda(key);
    const collectionAppKey = anchor.web3.Keypair.generate();
    await program.methods
      .createCollectionApp(
        key.symbol,
        collectionApp.name,
        collectionApp.imageUrl,
        collectionApp.appUrl
      )
      .accounts({
        authority: key.authority,
        collection: collectionPda.pda,
        collectionApp: collectionAppKey.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([collectionAppKey])
      .rpc();
    return collectionAppKey.publicKey;
  }

  async function updateCollectionApp(
    key: CollectionKey,
    collectionAppPubkey: web3.PublicKey,
    collectionApp: CollectionApp
  ) {
    await program.methods
      .updateCollectionApp(
        collectionApp.name,
        collectionApp.imageUrl,
        collectionApp.appUrl
      )
      .accounts({
        authority: key.authority,
        collectionApp: collectionAppPubkey,
      })
      .rpc();
  }

  async function removeCollectionApp(
    key: CollectionKey,
    collectionAppPubkey: web3.PublicKey
  ) {
    const collectionPda = await getCollectionPda(key);
    await program.methods
      .removeCollectionApp(key.symbol)
      .accounts({
        authority: key.authority,
        collectionApp: collectionAppPubkey,
        collection: collectionPda.pda,
      })
      .rpc();
  }

  async function fetchNFT(mint: web3.PublicKey) {
    const { pda } = await getNFTPda(mint);
    return program.account.nft.fetch(pda);
  }

  async function fetchNFTs(key: CollectionKey) {
    const collectionPda = await getCollectionPda(key);
    return program.account.nft.all([
      {
        memcmp: {
          offset: 8 + 32 + 32, // Discriminator, mint & owner
          bytes: collectionPda.pda.toBase58(),
        },
      },
    ]);
  }

  async function createNFT(
    mint: web3.PublicKey,
    collection: web3.PublicKey,
    nft: NFT,
    owner: web3.PublicKey,
    signers: web3.Keypair[] = []
  ) {
    const nftPda = await getNFTPda(mint);
    await program.methods
      .createNft(
        mint,
        collection,
        nft.rentalMaxDays,
        nft.rentalPrice,
        nft.rentalEnabled
      )
      .accounts({
        nft: nftPda.pda,
        owner: owner,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers(signers)
      .rpc();
  }

  async function updateNFT(
    mint: web3.PublicKey,
    nft: NFT,
    owner: web3.PublicKey,
    signers: web3.Keypair[] = []
  ) {
    const nftPda = await getNFTPda(mint);
    await program.methods
      .updateNft(mint, nft.rentalMaxDays, nft.rentalPrice, nft.rentalEnabled)
      .accounts({
        nft: nftPda.pda,
        owner: owner,
      })
      .signers(signers)
      .rpc();
  }

  async function rentNFT(
    key: CollectionKey,
    mint: web3.PublicKey,
    days: number,
    owner: web3.PublicKey,
    renter: web3.PublicKey,
    signers: web3.Keypair[] = []
  ) {
    const nftPda = await getNFTPda(mint);
    const collectionPda = await getCollectionPda(key);
    // Retreive nft
    await program.methods
      .rentNft(mint, key.symbol, key.authority, days)
      .accounts({
        collection: collectionPda.pda,
        nft: nftPda.pda,
        owner: owner,
        renter: renter,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers(signers)
      .rpc();
  }

  return {
    airdrop,
    getCollectionPda,
    getNFTPda,
    // Collection
    fetchCollection,
    fetchCollections,
    createCollection,
    updateCollection,
    // Collection apps
    fetchCollectionApp,
    fetchCollectionApps,
    createCollectionApp,
    updateCollectionApp,
    removeCollectionApp,
    // NFTs
    fetchNFT,
    fetchNFTs,
    createNFT,
    updateNFT,
    rentNFT,
  };
}
