  function initGame(gameMode) {
    const seed =
      gameMode === "unlimited" ? getOrCreateUnlimitedSeed() : period.seed;
    const target =
      gameMode === "unlimited"
        ? getCampaignForSeed(seed)
        : getCampaignForPeriod(period.index);
    const maxGuesses = 6;

    game = createGame({
      target,
      compareFn: compareCampaigns,
      maxGuesses,
      mode: gameMode,
      seed,
    });
    stats = gameMode === "unlimited" ? loadUnlimitedStats() : null;
  }
