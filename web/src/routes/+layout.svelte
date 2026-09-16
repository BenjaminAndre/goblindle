<script>
  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <title>Goblindle</title>
  <meta name="description" content="Devinez la campagne du jour de la guilde" />
</svelte:head>

{@render children()}
