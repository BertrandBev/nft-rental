import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
} from "@solana/spl-token";
import { Program } from "@project-serum/anchor";
import { Rental } from "../target/types/rental";
// import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@project-serum/anchor";
const { SystemProgram } = anchor.web3;
import web3 = anchor.web3;

const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
  // "metaqbxxUerdq28cj1RbAWkYQm3ybzdjb6a8bt518x1s"
  "RTSE3BtLs2dDR482uuKMvdcGwWnbbQqUFEkxnTZC7FG" // Local deployment
);

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.Rental as Program<Rental>;
const provider = program.provider as anchor.AnchorProvider;
const connection = provider.connection;

const getMetadataPubkey = async (
  mint: web3.PublicKey
): Promise<web3.PublicKey> => {
  return (
    await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const getMasterEditionPubkey = async (
  mint: web3.PublicKey
): Promise<web3.PublicKey> => {
  return (
    await web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

export interface MintData {
  masterEdition: web3.PublicKey;
  nftMetadataAccount: web3.PublicKey;
  nftMint: web3.PublicKey;
  nftTokenAccount: web3.PublicKey;
}

export function getNftAPI(program: Program<Rental>) {
  // Mint nft with program
  async function mint(uri: string, title: string, symbol: string) {
    const lamports = await connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );
    const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    const nftTokenAccount = await getAssociatedTokenAddress(
      mintKey.publicKey,
      provider.wallet.publicKey
    );
    console.log("NFT Account: ", nftTokenAccount.toBase58());

    // Create accounts

    const mint_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mintKey.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
        lamports,
      }),
      createInitializeMintInstruction(
        mintKey.publicKey,
        0,
        provider.wallet.publicKey,
        provider.wallet.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        nftTokenAccount,
        provider.wallet.publicKey,
        mintKey.publicKey
      )
    );
    const res = await provider.sendAll([{ tx: mint_tx, signers: [mintKey] }]);
    // console.log(
    //   await connection.getParsedAccountInfo(mintKey.publicKey)
    // );

    console.log("Account: ", res);
    console.log("Mint key: ", mintKey.publicKey.toString());
    console.log("User: ", provider.wallet.publicKey.toString());

    const metadataAddress = await getMetadataPubkey(mintKey.publicKey);
    const masterEdition = await getMasterEditionPubkey(mintKey.publicKey);

    console.log("Metadata address: ", metadataAddress.toBase58());
    console.log("MasterEdition: ", masterEdition.toBase58());

    const tx = await program.methods
      .mintNft(mintKey.publicKey, uri, title, symbol)
      .accounts({
        mintAuthority: provider.wallet.publicKey,
        mint: mintKey.publicKey,
        tokenAccount: nftTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadata: metadataAddress,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        masterEdition: masterEdition,
      })
      .rpc();
    console.log("Your transaction signature", tx);

    // Populate mint data for further tests
    return {
      masterEdition,
      nftMetadataAccount: metadataAddress,
      mint: mintKey.publicKey,
      nftTokenAccount,
    };
  }

  async function verifies() {
    // const tx = await program.methods
    //   .verifyNft()
    //   .accounts({
    //     user: provider.wallet.publicKey,
    //     masterEdition: mintData.masterEdition,
    //     nftMetadataAccount: mintData.nftMetadataAccount,
    //     nftMint: mintData.nftMint,
    //     nftTokenAccount: mintData.nftTokenAccount,
    //     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    //   })
    //   .rpc();
  }

  return {
    mint,
    verifies,
  };
}
