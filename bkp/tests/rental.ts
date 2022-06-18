import { Program } from "@project-serum/anchor";
import { Rental } from "../target/types/rental";
// import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@project-serum/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
const { SystemProgram } = anchor.web3;
import * as assert from "assert";

import web3 = anchor.web3;

import {
  CollectionKey,
  getAPI,
  Collection,
  CollectionApp,
  NFT,
} from "../.anchor/app/api";
import { MintData, getNftAPI } from "../.anchor/app/nftApi";

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.Rental as Program<Rental>;
const provider = program.provider as anchor.AnchorProvider;
const connection = provider.connection;

const DAY_S = 24 * 3600;

const {
  airdrop,
  getCollectionPda,
  getNFTPda,
  // Collection
  fetchCollection,
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
} = getAPI(program);

const { mint } = getNftAPI(program);

const mintData = {} as MintData;

function stripBn(obj) {
  Object.keys(obj).forEach((key) => {
    // console.log('key', key, 'instance', obj[key] instanceof anchor.BN);
    if (obj[key] instanceof anchor.BN) obj[key] = obj[key].toNumber();
    if (obj[key] instanceof web3.PublicKey) obj[key] = obj[key].toBase58();
  });
  return obj;
}

const MINT_NFTS = true;

describe("rental", () => {
  // Collection key
  const key = {
    authority: provider.wallet.publicKey,
    symbol: "Symb",
  } as CollectionKey;

  // Generate users
  const owner = web3.Keypair.generate();
  const renter = web3.Keypair.generate();

  if (MINT_NFTS) {
    it("mints_nfts", async () => {
      const result = await mint(
        "https://www.arweave.net/bxIAEavpOJeRyOKJFbMFjCZ4To6PNVefyj5epo40OCA/",
        "CryptoPet #2640",
        "CP"
      );
      console.log(result);
    });
    return;
  }

  it("setup", async () => {
    await airdrop(owner.publicKey, 10 * LAMPORTS_PER_SOL);
    await airdrop(renter.publicKey, 10 * LAMPORTS_PER_SOL);
  });

  it("create collection", async () => {
    const collection = {
      symbol: key.symbol,
      name: "Collection",
      imageUrl: "https://some_image.png",
      websiteUrl: "https://some_app_url.png",
      royaltiesPercent: 0,
      // Assertion fields
      appCount: 0,
    } as Collection;
    await createCollection(key, collection);
    const collectionRetrieved = await fetchCollection(key);
    assert.deepEqual(collection, collectionRetrieved);
  });

  it("update collection", async () => {
    const collection = await fetchCollection(key);
    collection.name += "_updated";
    collection.imageUrl += "_updated";
    collection.websiteUrl += "_updated";
    collection.royaltiesPercent += 1;
    await updateCollection(key, collection);
    const collectionRetrieved = await fetchCollection(key);
    assert.deepEqual(collection, collectionRetrieved);
  });

  it("create collection app", async () => {
    const collectionPda = await getCollectionPda(key);
    const app = {
      name: "App",
      appUrl: "https://some_url.png",
      imageUrl: "https://some_image.png",
      // Assertion fields
      collection: collectionPda.pda,
    } as CollectionApp;
    const appKey = await createCollectionApp(key, app);
    // Now retreive the collection app
    const appRetreived = await fetchCollectionApp(appKey);
    assert.deepEqual(app, appRetreived);
  });

  it("update collection app", async () => {
    const apps = await fetchCollectionApps(key);
    assert.equal(apps.length, 1);
    const { publicKey, account } = apps[0];
    account.name += "_updated";
    account.imageUrl += "_updated";
    account.appUrl += "_updated";
    await updateCollectionApp(key, publicKey, account);
    // Now retreive the collection app
    const appRetreived = await fetchCollectionApp(publicKey);
    assert.deepEqual(account, appRetreived);
  });

  it("removes collection app", async () => {
    let apps = await fetchCollectionApps(key);
    assert.equal(apps.length, 1);
    const { publicKey, account } = apps[0];
    await removeCollectionApp(key, publicKey);
    // Now check removal
    apps = await fetchCollectionApps(key);
    assert.equal(apps.length, 0);
  });

  it("create nft", async () => {
    const mint = web3.Keypair.generate();
    const collectionPda = await getCollectionPda(key);
    const nft = {
      rentalEnabled: false,
      rentalPrice: new anchor.BN(LAMPORTS_PER_SOL * 1),
      rentalMaxDays: 3,
      // Assertion fields
      collection: collectionPda.pda,
      rentalCount: new anchor.BN(0),
      owner: owner.publicKey,
      renter: new web3.PublicKey(0),
      mint: mint.publicKey,
      rentedUntil: new anchor.BN(0),
    } as NFT;
    await createNFT(mint.publicKey, collectionPda.pda, nft, owner.publicKey, [
      owner,
    ]);
    // Now retreive the created nft
    const fetched = await fetchNFT(mint.publicKey);
    assert.deepEqual(stripBn(nft), stripBn(fetched));
  });

  it("updates nft", async () => {
    const nfts = await fetchNFTs(key);
    assert.equal(nfts.length, 1);
    const nft = nfts[0].account;
    nft.rentalPrice = new anchor.BN(nft.rentalPrice.toNumber() + 1);
    nft.rentalMaxDays += 1;
    nft.rentalEnabled = true;
    await updateNFT(nft.mint, nft, owner.publicKey, [owner]);
    // Now retrieve the updated nft
    const fetched = await fetchNFT(nft.mint);
    assert.deepEqual(stripBn(nft), stripBn(fetched));
  });

  it("rents nft", async () => {
    const nfts = await fetchNFTs(key);
    assert.equal(nfts.length, 1);
    const nft = nfts[0].account;
    const balanceBefore = await connection.getBalance(renter.publicKey);
    // const now =
    // Now rent that nft
    const now = Date.now() / 1e3;
    const days = 2;
    // Pass in a random collection key
    // const key2 = { symbol: "BBB", authority: renter.publicKey } as CollectionKey;
    await rentNFT(key, nft.mint, days, nft.owner, renter.publicKey, [renter]);
    // Confirm that the nft is rented
    const fetched = await fetchNFT(nft.mint);
    assert.equal(fetched.renter.toBase58(), renter.publicKey.toBase58());
    const balanceAfter = await connection.getBalance(renter.publicKey);
    assert.equal(
      balanceAfter,
      balanceBefore - nft.rentalPrice.toNumber() * days
    );

    // console.log('until', fetched.rentedUntil.toNumber(), 'now', now);
    const deltaTime = fetched.rentedUntil.toNumber() - now - days * DAY_S;
    assert.ok(Math.abs(deltaTime) < 30);
  });

  it("can't double rent", async () => {
    const nfts = await fetchNFTs(key);
    assert.equal(nfts.length, 1);
    const nft = nfts[0].account;
    try {
      await rentNFT(key, nft.mint, 1, nft.owner, renter.publicKey, [renter]);
      assert.fail("Double rental succeeded");
    } catch (e) {
      assert.equal(e.error.errorCode.code, "NftRented");
    }
  });

  it("Can mint", async () => {
    return;

    // // Populate mint data for further tests
    // mintData.masterEdition = masterEdition;
    // mintData.nftMetadataAccount = metadataAddress;
    // mintData.nftMint = mintKey.publicKey;
    // mintData.nftTokenAccount = nftTokenAccount;
  });

  it("Verifies minted token", async () => {
    return;
    // const tx = await program.methods.nftUtilsVerifyNft().accounts({
    //   user: provider.wallet.publicKey,
    //   masterEdition: mintData.masterEdition,
    //   nftMetadataAccount: mintData.nftMetadataAccount,
    //   nftMint: mintData.nftMint,
    //   nftTokenAccount: mintData.nftTokenAccount,
    //   tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    // }).rpc();
  });
});
