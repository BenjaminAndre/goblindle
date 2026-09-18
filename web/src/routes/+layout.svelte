<script>
  import { onMount } from "svelte";
  import { asset } from "$app/paths";
  import "../app.css";
  import { installWeeklyDataTools } from "$lib/weekly-stats";

  let { children } = $props();

  onMount(() => {
    installWeeklyDataTools();
  });
</script>

<svelte:head>
  <title>Goblindle</title>
  <meta name="description" content="Devinez la campagne du jour de la guilde" />
  <meta property="og:title" content="Goblindle" />
  <meta property="og:description" content="Devinez la campagne du jour de la guilde" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content={asset("/logo.png")} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Goblindle" />
  <meta name="twitter:description" content="Devinez la campagne du jour de la guilde" />
  <meta name="twitter:image" content={asset("/logo.png")} />
</svelte:head>

{@render children()}
