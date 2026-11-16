# Halyard

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/rioxbt/makefun-best-game-02/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/rioxbt/makefun-best-game-02/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A squall has scattered the salvage along the Farrow coast and you are the linehand they sent out for
it: latch your line to the harbour masts and swing the coast, kicking off at the bottom of each arc to
carry your speed across the gaps, hauling the crates aboard as you pass, and reaching the beacon before
the storm closes. Five stages, three lines, one mouse and a keyboard.

A browser game, played with keyboard and mouse, from static files with no build step and no network
request: point at a lamp and **hold the left mouse button** to hitch the line, **A D** / **← →** to pump
the swing, **W S** / **↑ ↓** to shorten and lengthen it, **space** or the right button to kick off,
**R** to restart a stage, **P** to pause, **M** to mute. The sound is synthesised in the game itself,
so the entry ships no audio files. Play it at <https://make.fun/bounty/best-game-01>.

## Run it

```sh
node serve.ts          # serves game/ on http://localhost:8080 — open it in a desktop browser
node main.ts           # the entrypoint: copies game/ and screenshots/ to $MAKEFUN_OUTPUT_DIR
                       # (or /output) and writes dossier.json there
```

## How it plays

- **The line** is thrown at the lamp nearest the pointer and holds until you let it go. A hitch made at
  speed turns part of that speed into the swing, so a line thrown while flying carries you around the
  mast instead of stopping you dead on it.
- **The kick** is the whole game: release at the bottom of the arc and the launch carries the faster
  swing further. Land the next hitch and it chains; miss it and the swell takes a line.
- **Three lines** a run, and a lost one hands you back on the last mast you passed with the clock still
  running. Near the water the linehand hauls in on their own, so a mast that bobs down or a gust leaning
  on you can not drag you under.
- **Salvage** hangs above the arc: the low crates come to you, the high ones want a fast release and a
  kick at the top. Every crate aboard is score and stars — three stars a stage, and the squall left
  counts for score too, so a fast run pays.
- **Five stages**, each with its own sea and sky: Pier Nine, The Gut, Ropewalk, Squallfront and Farrow
  Point. Mast lamps bob and swing, strikes come down on a cycle that the telegraph warns you about, and
  the wind leans harder the further out you get.

## Layout

| Path | What it is |
| --- | --- |
| `game/index.html` | the page; its only reference is `./src/main.js` |
| `game/src/config.js` | every tuning number, colour and name, in one place |
| `game/src/level.js` | the five stages as data: masts, crates, strikes, wind, beacon |
| `game/src/world.js` | the run: the clock, the salvage, the strikes, the wind, the lines, the score |
| `game/src/player.js` | the linehand: gravity, pumping the swing, the launch |
| `game/src/rope.js` | the line: the throw, the hold, the reel, the haul at speed |
| `game/src/camera.js` | the trailing frame and its shake |
| `game/src/render.js` | the harbour, the mast lamps, the beacon, the line, the HUD |
| `game/src/screens.js` | the title and its stage select, the results panels, the pause card |
| `game/src/paint.js` | drawing primitives: text, panels, stars, bars, glows |
| `game/src/input.js` | keyboard and pointer, and where the pointer is in game coordinates |
| `game/src/audio.js` | the sound, synthesised from oscillators: no audio files |
| `game/src/shots.js`, `game/src/main.js` | the staged screenshot scenes, and the frame loop |
| `game/src/random.js` | a seeded generator, so a staged screenshot is the same frame twice |
| `main.ts` | the entrypoint the grader runs (Node 22, standard library only) |
| `vendor/makefun-game.ts` | make.fun's `buildDossier`, unchanged |
| `screenshots/` | four renders of the game: the title, a swing, a stage cleared, a run lost |

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
