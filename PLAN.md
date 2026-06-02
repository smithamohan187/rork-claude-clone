# Redesign Marketplace Member Chat Screen


## What changes

A full visual redesign of the marketplace member chat screen (business-facing view) with the TouchPoints green theme, matching the structure of the provided screenshot.

## Features

**Offer Banner** — A pinned strip at the top of the chat showing "Re: Summer Loyalty Offer – 15% off" with a tag icon and "View offer →" link. Green-tinted background with a green left accent border. Always visible (not scrollable).

**Chat Header** — Member name, circular avatar with green fallback, active status indicator with green dot, back arrow, call and more action icons — all in the TouchPoints green color palette.

**Message Bubbles** — Sent messages appear right-aligned with deep green background (#2E7D32) and a tail. Received messages appear left-aligned with a small avatar beside them, white background, green border, and a tail on the left side.

**Timestamps and Read Ticks** — Sent messages show a timestamp and double-tick read indicator below the bubble in green. Received messages show a timestamp below on the left.

**Date Separator** — A centered pill like "Today" with a light green background appears between message groups.

**FAB Button** — A circular floating action button sits at the bottom-right, above the input bar, colored green with a lightning/flask icon.

**Input Bar** — Bottom bar with an attachment icon (paperclip), a green-tinted text input field with rounded corners, and a green circular send button.

**Dummy Chat Data** — Mock conversation with 4 messages between the business and a member, with realistic timestamps and read indicators.

## Design

- Primary green #2E7D32 for sent bubbles, header, and active elements
- Accent green #43A047 for buttons and highlights
- Light green #E8F5E9 for the offer banner and date separators
- White backgrounds with green borders (#C8E6C9) for received bubbles
- Very light green-white background (#F9FBF9) for the message list area
- No purple tones anywhere — fully audited

## How it works

When a marketplace chat is opened (IDs starting with "mkt-"), the chat screen renders a complete marketplace-specific layout instead of the standard chat layout. Tapping the FAB opens quick-reply options. The offer banner stays pinned at the top. All other chat types remain completely unchanged.
