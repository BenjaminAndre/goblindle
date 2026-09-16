<script>
  import { placePopup } from "$lib/notes";

  /**
   * The shared anecdote bubble. One instance for the whole board.
   *
   * It must be rendered outside the guess grid: .guess-cell keeps a transform
   * after its reveal animation (animation-fill-mode: forwards), which makes
   * every cell a containing block for position: fixed and a stacking context,
   * and the grid wrapper's overflow-x-auto clips in both axes. Nothing above
   * the render site may set transform, filter, perspective, contain or
   * will-change, or this stops escaping to the viewport.
   */
  let { bubble, onDismiss } = $props();

  let el = $state();
  let pos = $state(null);

  // Measured after the text is in the DOM, so the bubble is laid out before it
  // is placed. Until then it stays invisible rather than flashing at (0, 0).
  $effect(() => {
    if (!bubble || !el) {
      pos = null;
      return;
    }
    const rect = el.getBoundingClientRect();
    pos = placePopup(
      bubble.trigger.getBoundingClientRect(),
      { width: rect.width, height: rect.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
  });

  // Dismissal, registered only while open.
  $effect(() => {
    if (!bubble) return;

    function onPointerDown(e) {
      // Taps on another trigger are that trigger's business — letting them
      // through here means a neighbouring cell switches the bubble in one tap
      // instead of closing and reopening.
      if (e.target.closest?.("[data-note-trigger]")) return;
      if (el && el.contains(e.target)) return;
      onDismiss();
    }

    function onAway() {
      // Close rather than reposition: the trigger can scroll out of the grid
      // entirely, which would park the bubble over nothing.
      onDismiss();
    }

    document.addEventListener("pointerdown", onPointerDown);
    // Capture phase, because scroll does not bubble and the grid has its own
    // scroll container.
    window.addEventListener("scroll", onAway, { capture: true, passive: true });
    window.addEventListener("resize", onAway);
    window.visualViewport?.addEventListener("resize", onAway);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onAway, { capture: true });
      window.removeEventListener("resize", onAway);
      window.visualViewport?.removeEventListener("resize", onAway);
    };
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && bubble) {
      e.preventDefault();
      onDismiss({ restoreFocus: true });
    }
  }}
/>

<!--
  Rendered unconditionally so assistive tech has the live region in place
  before its content changes; emptied rather than removed on close.
-->
<div
  id="note-bubble"
  role="status"
  bind:this={el}
  class="note-bubble"
  class:is-visible={Boolean(bubble && pos)}
  style={pos ? `top: ${pos.top}px; left: ${pos.left}px` : ""}
>
  {#if bubble}
    {bubble.text}
  {/if}
</div>
