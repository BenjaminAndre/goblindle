<script>
  import { getCampaignImageUrl, getCampaignInitials } from "$lib/campaign-data";

  /**
   * Campaign illustration, falling back to an initials tile.
   * Decorative: every caller renders the campaign name next to it.
   */
  let { campaign, size = 40 } = $props();

  let src = $derived(getCampaignImageUrl(campaign));
  // Keyed on the src rather than a bare boolean, so the flag resets by itself
  // when the component is reused for a different campaign.
  let failedSrc = $state(null);
  let showImage = $derived(Boolean(src) && failedSrc !== src);
</script>

{#if showImage}
  <img
    {src}
    alt=""
    width={size}
    height={size}
    onerror={() => (failedSrc = src)}
    class="rounded object-cover shrink-0"
  />
{:else}
  <span
    class="campaign-avatar shrink-0"
    style="width: {size}px; height: {size}px; font-size: {Math.round(
      size * 0.36,
    )}px"
    aria-hidden="true">{getCampaignInitials(campaign.name)}</span
  >
{/if}
