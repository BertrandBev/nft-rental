use anchor_lang::prelude::*;
mod nft_utils;
use nft_utils::{mint_nft as _mint_nft, verify_nft as _verify_nft, *}; // important

declare_id!("6R4xELxAKseqmCxS9Vf7VQya4FoEcY4roC7GRYyEf6Hx");

static DAY_S: i64 = 24 * 3600;

#[program]
pub mod rental {
    use super::*;

    pub fn create_collection(
        ctx: Context<CreateCollection>,
        _symbol: String,
        name: String,
        image_url: String,
        website_url: String,
        royalties_percent: u8,
    ) -> Result<()> {
        // Check args
        require!(
            name.len() <= Collection::NAME_MAX_LEN
                && image_url.len() <= Collection::URL_MAX_LEN
                && website_url.len() <= Collection::URL_MAX_LEN,
            ErrorCode::StringTooLong
        );
        let collection = &mut ctx.accounts.collection;
        collection.symbol = _symbol;
        collection.name = name;
        collection.image_url = image_url;
        collection.website_url = website_url;
        collection.royalties_percent = royalties_percent;
        collection.app_count = 0;
        Ok(())
    }

    pub fn update_collection(
        ctx: Context<UpdateCollection>,
        _symbol: String,
        name: String,
        image_url: String,
        website_url: String,
        royalties_percent: u8,
    ) -> Result<()> {
        // Check args
        require!(
            name.len() <= Collection::NAME_MAX_LEN
                && image_url.len() <= Collection::URL_MAX_LEN
                && website_url.len() <= Collection::URL_MAX_LEN,
            ErrorCode::StringTooLong
        );
        let collection = &mut ctx.accounts.collection;
        collection.symbol = _symbol;
        collection.name = name;
        collection.image_url = image_url;
        collection.website_url = website_url;
        collection.royalties_percent = royalties_percent;
        Ok(())
    }

    pub fn create_collection_app(
        ctx: Context<CreateCollectionApp>,
        _symbol: String,
        name: String,
        image_url: String,
        app_url: String,
    ) -> Result<()> {
        // Check args
        require!(
            name.len() <= Collection::NAME_MAX_LEN
                && image_url.len() <= Collection::URL_MAX_LEN
                && app_url.len() <= Collection::URL_MAX_LEN,
            ErrorCode::StringTooLong
        );
        let collection_app = &mut ctx.accounts.collection_app;
        let collection = &mut ctx.accounts.collection;
        collection_app.collection = collection.key();
        collection_app.name = name;
        collection_app.image_url = image_url;
        collection_app.app_url = app_url;
        collection.app_count += 1;
        Ok(())
    }

    pub fn update_collection_app(
        ctx: Context<UpdateCollectionApp>,
        name: String,
        image_url: String,
        app_url: String,
    ) -> Result<()> {
        // Check args
        require!(
            name.len() <= Collection::NAME_MAX_LEN
                && image_url.len() <= Collection::URL_MAX_LEN
                && app_url.len() <= Collection::URL_MAX_LEN,
            ErrorCode::StringTooLong
        );
        let collection_app = &mut ctx.accounts.collection_app;
        collection_app.name = name;
        collection_app.image_url = image_url;
        collection_app.app_url = app_url;
        Ok(())
    }

    pub fn remove_collection_app(ctx: Context<RemoveCollectionApp>, _symbol: String) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        collection.app_count -= 1;
        Ok(())
    }

    pub fn create_nft(
        ctx: Context<CreateNft>,
        mint: Pubkey,
        collection: Pubkey,
        rental_max_days: u32,
        rental_price: u64,
        rental_enabled: bool,
    ) -> Result<()> {
        // TODO: verify Nft ownership
        let nft = &mut ctx.accounts.nft;
        let owner = &mut ctx.accounts.owner;

        nft.mint = mint;
        nft.collection = collection;
        nft.owner = owner.key();
        nft.rental_max_days = rental_max_days;
        nft.rental_price = rental_price;
        nft.rental_count = 0;
        nft.rental_enabled = rental_enabled;
        nft.rented_until = 0;

        Ok(())
    }

    pub fn update_nft(
        ctx: Context<UpdateNft>,
        _mint: Pubkey,
        rental_max_days: u32,
        rental_price: u64,
        rental_enabled: bool,
    ) -> Result<()> {
        //
        let nft = &mut ctx.accounts.nft;

        nft.rental_max_days = rental_max_days;
        nft.rental_price = rental_price;
        nft.rental_enabled = rental_enabled;

        Ok(())
    }

    pub fn rent_nft(
        ctx: Context<RentNft>,
        _mint: Pubkey,
        symbol: String,
        autority: Pubkey,
        days: u32,
    ) -> Result<()> {
        // TODO: Enable rental extension
        let nft = &mut ctx.accounts.nft;
        let owner = &mut ctx.accounts.owner;
        let renter = &mut ctx.accounts.renter;
        let system_program = &ctx.accounts.system_program;
        let collection = &ctx.accounts.collection;

        // Control collection key
        let (pda, _bump_seed) = Pubkey::find_program_address(
            &[b"collection".as_ref(), symbol.as_ref(), autority.as_ref()],
            ctx.program_id,
        );
        assert!(pda == collection.key());

        // Parse collection
        let info = collection.to_account_info();
        let mut data: &[u8] = &info.try_borrow_data()?;
        let deserialized = Collection::try_deserialize(&mut data);

        if let Ok(collection) = deserialized {
            msg!("Deserialized: ${:?}", collection.name);
        } else {
            msg!("Collection doesn't exist");
        }

        let clock: Clock = Clock::get().unwrap();
        let timestamp = clock.unix_timestamp;

        // Check nft rental validity
        if owner.key() != nft.owner {
            return err!(ErrorCode::InvalidOwner);
        }
        if nft.rented_until > timestamp {
            return err!(ErrorCode::NftRented);
        }
        if !nft.rental_enabled {
            return err!(ErrorCode::NftNotListed);
        }
        if days > nft.rental_max_days {
            return err!(ErrorCode::InvalidRentalDuration);
        }

        // Transfer funds
        transfer_funds(
            &renter,
            &owner,
            &system_program.to_account_info(),
            nft.rental_price * days as u64,
        )?;

        // Rent nft
        nft.renter = renter.key();
        nft.rented_until = timestamp + DAY_S * days as i64;

        Ok(())
    }

    // Lib functions
    pub fn mint_nft(
        ctx: Context<MintNFT>,
        creator_key: Pubkey,
        uri: String,
        title: String,
        symbol: String,
    ) -> Result<()> {
        _mint_nft(ctx, creator_key, uri, title, symbol)
    }

    pub fn verify_nft(ctx: Context<VerifyNFT>) -> Result<()> {
        _verify_nft(ctx)
    }
}

#[derive(Accounts)]
#[instruction(_symbol: String)]
pub struct CreateCollection<'info> {
    #[account(
        init, payer = authority,
        space = Collection::SIZE,
        seeds = [b"collection".as_ref(), _symbol.as_ref(), authority.key.as_ref()],
        bump)]
    pub collection: Account<'info, Collection>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_symbol: String)]
pub struct UpdateCollection<'info> {
    #[account(mut,
        seeds = [b"collection".as_ref(), _symbol.as_ref(), authority.key.as_ref()],
        bump)]
    pub collection: Account<'info, Collection>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(_symbol: String)]
pub struct CreateCollectionApp<'info> {
    #[account(mut,
        seeds = [b"collection".as_ref(), _symbol.as_ref(), authority.key.as_ref()],
        bump)]
    pub collection: Account<'info, Collection>,
    #[account(
        init, payer = authority,
        space = CollectionApp::SIZE)]
    pub collection_app: Account<'info, CollectionApp>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCollectionApp<'info> {
    #[account(mut)]
    pub collection_app: Account<'info, CollectionApp>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(_symbol: String)]
pub struct RemoveCollectionApp<'info> {
    #[account(mut,
        seeds = [b"collection".as_ref(), _symbol.as_ref(), authority.key.as_ref()],
        bump)]
    pub collection: Account<'info, Collection>,
    #[account(mut,
        close=authority)]
    pub collection_app: Account<'info, CollectionApp>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct CreateNft<'info> {
    #[account(
        init, payer = owner,
        space = Nft::SIZE,
        seeds = [b"nft".as_ref(), mint.as_ref()],
        bump)]
    pub nft: Account<'info, Nft>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_mint: Pubkey)]
pub struct UpdateNft<'info> {
    #[account(mut,
        seeds = [b"nft".as_ref(), _mint.as_ref()],
        bump)]
    pub nft: Account<'info, Nft>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(_mint: Pubkey)]
pub struct RentNft<'info> {
    // #[account(mut,
    //     seeds = [b"collection".as_ref(), _symbol.as_ref(), _autority.as_ref()],
    //     bump)]
    // pub collection: Account<'info, Collection>,
    /// CHECK: unsafe
    #[account(mut)]
    pub collection: AccountInfo<'info>,
    #[account(mut,
        seeds = [b"nft".as_ref(), _mint.as_ref()],
        bump)]
    pub nft: Account<'info, Nft>,
    /// CHECK: unsafe
    #[account(mut)]
    pub owner: AccountInfo<'info>,
    #[account(mut)]
    pub renter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Collection {
    pub name: String,
    pub symbol: String,
    pub image_url: String,
    pub royalties_percent: u8,
    // Custom storefront
    pub website_url: String,
    // Application count
    pub app_count: u16,
}

impl Collection {
    const NAME_MAX_LEN: usize = 50;
    const SYMBOL_MAX_LEN: usize = 10;
    const URL_MAX_LEN: usize = 100;

    const SIZE: usize = 8   // discriminator
    + 4 + 4 * Collection::NAME_MAX_LEN  // name
    + 4 + 4 * Collection::SYMBOL_MAX_LEN // symbol
    + 4 + 4 * Collection::URL_MAX_LEN // image_url
    + 4 + 4 * Collection::URL_MAX_LEN
    + 2; // app_count
}

#[account]
pub struct CollectionApp {
    pub collection: Pubkey,
    pub name: String,
    pub image_url: String,
    pub app_url: String,
}

impl CollectionApp {
    const SIZE: usize = 8   // discriminator
    + 32 // collection
    + 4 + 4 * Collection::NAME_MAX_LEN  // name
    + 4 + 4 * Collection::URL_MAX_LEN // image_url
    + 4 + 4 * Collection::URL_MAX_LEN; // app_url
}

#[account]
#[derive(Debug)]
pub struct Nft {
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub collection: Pubkey,
    // Config
    pub rental_enabled: bool,
    pub rental_price: u64,
    pub rental_max_days: u32,
    // Rental state
    pub rental_count: u64,
    pub renter: Pubkey,
    pub rented_until: i64,
}

impl Nft {
    const SIZE: usize = 8   // discriminator
    + 32 // mint
    + 32 // owner
    + 32 // collection
    + 1 // rental_enabled
    + 8 // rental_price
    + 4 // rental_max_days
    + 8 // rental_count
    + 32 // renter
    + 8; // rented_until
}

#[error_code]
pub enum ErrorCode {
    // Checks
    #[msg("String too long")]
    StringTooLong,
    // Rental
    #[msg("Invalid owner")]
    InvalidOwner,
    #[msg("Nft already rented")]
    NftRented,
    #[msg("Nft not listed")]
    NftNotListed,
    #[msg("Invalid rental duration")]
    InvalidRentalDuration,
    #[msg("Insuffisant funds")]
    InsuffisantFunds,
}

// Utils
pub fn transfer_funds<'a>(
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    lamports: u64,
) -> Result<()> {
    use anchor_lang::solana_program::{program, system_instruction};
    let ix = system_instruction::transfer(&from.key(), &to.key(), lamports);
    program::invoke(
        &ix,
        &[from.to_owned(), to.to_owned(), system_program.to_owned()],
    )?;
    Ok(())
}
