use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instruction::{create_master_edition_v3, create_metadata_accounts_v2};
use mpl_token_metadata::state::{Metadata, EDITION, PREFIX};

#[macro_export]
macro_rules! assert_eq {
    ($left:expr, $right:expr, $($arg:tt)+) => ({
        match (&$left, &$right) {
            (left_val, right_val) => {
                if !(*left_val == *right_val) {
                    msg!($($arg)+);
                }
            }
        }
    });
}

pub fn mint_nft(
    ctx: Context<MintNFT>,
    creator_key: Pubkey,
    uri: String,
    title: String,
    symbol: String,
) -> Result<()> {
    msg!("Initializing Mint NFT");
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    msg!("CPI Accounts Assigned");
    let cpi_program = ctx.accounts.token_program.to_account_info();
    msg!("CPI Program Assigned");
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    msg!("CPI Context Assigned");
    token::mint_to(cpi_ctx, 1)?;
    msg!("Token Minted !!!");
    // if uri.len() > 1 {
    //     return Ok(());
    // }
    let account_info = vec![
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.mint_authority.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.token_metadata_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];
    msg!("Account Info Assigned");
    let creator = vec![
        mpl_token_metadata::state::Creator {
            address: creator_key,
            verified: false,
            share: 100,
        },
        mpl_token_metadata::state::Creator {
            address: ctx.accounts.mint_authority.key(),
            verified: false,
            share: 0,
        },
    ];
    msg!("Creator Assigned");
    invoke(
        &create_metadata_accounts_v2(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.metadata.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.payer.key(),
            // Update 
            ctx.accounts.payer.key(),
            // 
            title,
            symbol,
            uri,
            Some(creator),
            0,
            true,
            true,
            None,
            None,
        ),
        account_info.as_slice(),
    )?;
    msg!("Metadata Account Created !!!");
    let master_edition_infos = vec![
        ctx.accounts.master_edition.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.mint_authority.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.token_metadata_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];
    msg!("Master Edition Account Infos Assigned");
    invoke(
        &create_master_edition_v3(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.master_edition.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.payer.key(),
            ctx.accounts.mint_authority.key(),
            ctx.accounts.metadata.key(),
            ctx.accounts.payer.key(),
            Some(0),
        ),
        master_edition_infos.as_slice(),
    )?;
    msg!("Master Edition Nft Minted !!!");
    Ok(())
}

pub fn verify_nft(ctx: Context<VerifyNFT>) -> Result<()> {
    let nft_token_account = &ctx.accounts.nft_token_account;
    let user = &ctx.accounts.user;
    let nft_mint_account = &ctx.accounts.nft_mint;

    // Check the owner of the token account
    assert_eq!(nft_token_account.owner, user.key(), "Invalid owner");

    // Check the mint on the token account
    assert_eq!(
        nft_token_account.mint,
        nft_mint_account.key(),
        "Invalid mint"
    );

    // Check the amount on the token account
    assert_eq!(nft_token_account.amount, 1, "Invalid amount");

    // Check master edition
    // --------------------

    let master_edition_seed = &[
        PREFIX.as_bytes(),
        ctx.accounts.token_metadata_program.key.as_ref(),
        nft_token_account.mint.as_ref(),
        EDITION.as_bytes(),
    ];

    let (master_edition_key, _) =
        Pubkey::find_program_address(master_edition_seed, ctx.accounts.token_metadata_program.key);

    assert_eq!(
        master_edition_key,
        ctx.accounts.master_edition.key(),
        "Invalid master edition"
    );

    if ctx.accounts.master_edition.data_is_empty() {
        // return err!(ErrorCode::NotInitialized);
        // TODO! Error
        msg!("Master edition not initialized error");
    }

    // Verify metadata account
    // -----------------------

    let nft_metadata_account = &ctx.accounts.nft_metadata_account;

    // Seeds for PDA
    let key = &nft_mint_account.key();
    let metadata_seed = &[
        PREFIX.as_bytes(),
        ctx.accounts.token_metadata_program.key.as_ref(),
        key.as_ref(),
    ];

    // The derived key
    let (metadata_derived_key, _bump_seed) =
        Pubkey::find_program_address(metadata_seed, ctx.accounts.token_metadata_program.key);

    // Check that the derived key is the current metadata account key
    assert_eq!(
        metadata_derived_key,
        nft_metadata_account.key(),
        "Invalid metadata"
    );

    // Check if init
    if nft_metadata_account.data_is_empty() {
        // return err!(ErrorCode::NotInitialized);
        // TODO! Error
        msg!("Metadata not initialized error");
    }

    // Extract metadata
    // ----------------

    let metadata_full_account = &mut Metadata::from_account_info(&nft_metadata_account)?;
    let full_metadata_clone = metadata_full_account.clone();
    // let expected_creator = Pubkey::("creator_str").unwrap();
    let expected_creator_b58 = "4cjdo4NKwgsTqCpoBob9gd9oaBTeXdRV6TP5B7ye7UzP";
    let expected_creator = expected_creator_b58.parse::<Pubkey>().unwrap();

    msg!(
        "Creator in metadata: {}",
        full_metadata_clone.data.creators.as_ref().unwrap()[0].address
    );
    msg!("Expected: {}", expected_creator);
    // Make sure expected creator is present in metadata
    assert_eq!(
        full_metadata_clone.data.creators.as_ref().unwrap()[0].address,
        expected_creator,
        "Invalid creator"
    );

    if !full_metadata_clone.data.creators.unwrap()[0].verified {
        // return err!(ErrorCode::NotVerified);
        // TODO! errors
        msg!("Not verified error");
    }

    Ok(())
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    // #[account(mut)]
    pub token_program: Program<'info, Token>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_metadata_program: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub payer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub rent: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct VerifyNFT<'info> {
    // Nft owner
    pub user: Signer<'info>,
    // Mint account
    pub nft_mint: Account<'info, Mint>,
    // Token account holding the NFT
    pub nft_token_account: Account<'info, TokenAccount>,
    // Metadata account of the NFT
    /// CHECK: unsure
    pub nft_metadata_account: AccountInfo<'info>,
    // Master edition
    /// CHECK: unsure
    pub master_edition: AccountInfo<'info>,
    // Token metadata program
    /// CHECK: unsure
    #[account(address = "RTSE3BtLs2dDR482uuKMvdcGwWnbbQqUFEkxnTZC7FG"
    .parse::<Pubkey>()
    .unwrap())]
    pub token_metadata_program: AccountInfo<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Not initialized")]
    NotInitialized,
    #[msg("Not verified")]
    NotVerified,
}
