# Momo Play Wall

Projector + webcam wall games for little kids. Kids touch the projected picture and the wall reacts.

**Games:** Fish Frenzy · Mosquito Smash · Bubble Pop · Firefly Catch · Paint the Wall
**Modes:** Game (timed rounds, scores, stars) · Free play (never ends — speed and crowd drift up and down by themselves, with a surprise "party" every minute or so)
**Difficulty:** Easy (few, slow) · Medium · Hard (lots, fastest)
**Players:** 1 or 2 (left kid = orange, right kid = blue)
**Runs on:** any laptop with Chrome or Edge. No graphics card needed. Body tracking runs locally in the browser; no video leaves the laptop.

---

## 1. Room setup

```
        WALL  (projected picture)
   ┌──────────────────────────────┐
   │                              │
   │      kids stand here ↓       │
   └──────────────────────────────┘
        🧒   🧒      (≈ 50 cm from the wall, tape a line on the floor)

           📽️ 📷    projector + webcam side by side, behind the kids
            💻      laptop (HDMI → projector, USB → webcam)
```

- Put the **webcam right next to (or on top of) the projector**, pointing at the same picture. The camera must see the **whole** projected picture plus a little margin.
- Bottom of the picture about 30 cm off the floor so a 3-year-old can reach the middle.
- Dim the room. Turn off lights that shine on the wall.
- Set Windows/Mac display to **Duplicate / Mirror** so the laptop screen and the wall show the same thing (easiest for the grown-up).
- Kids will cast shadows because the projector is behind them. That's fine; the games use big targets.

## 2. Start it

**Easiest:** double-click `index.html` (opens in Chrome/Edge). It needs internet the first time each session to download the body-tracking model (~6 MB, from Google).

**Offline / faster start (recommended once it works):**
- Windows: double-click `start-windows.bat`
- Mac / Linux: run `./start-mac-linux.sh`

These download the model once into `models/`, start a tiny local web server, and open the game at `http://localhost:8765`. The browser also remembers the camera permission this way. They need Python installed (Mac/Linux have it; on Windows install it from python.org or the Microsoft Store).

Then click **Start playing** on the laptop. That one click turns on sound, full screen and the camera.

## 3. First-time calibration (grown-up, 1 minute)

1. Make sure nobody is standing in the picture.
2. Press **C**. The wall turns black and shows 4 white dots one by one. The camera finds them.
3. If it says *"Calibrated!"*, the **Touch tester** opens. Touch the circles. They should light up under your hand.
4. If auto calibration fails, press **M** for manual: the wall shows dots 1–4, and you click each dot in the camera preview on the laptop.

Calibrate again whenever the projector or camera moves.

## 4. Settings and shortcuts

Click the **⚙ gear** at the top-right of the home screen (mouse or touchpad only, so kids can't open it from the wall), or press **S**. Mode, difficulty and players are at the top; all the tools (home, calibrate, touch tester, camera view, full screen) are buttons there too. The keys below still work:

| Key | What it does |
|---|---|
| **S** | Settings |
| **C** / **M** | Auto / manual calibration |
| **T** | Touch tester |
| **D** | Camera debug view (shows the camera, skeletons, and calibration box) |
| **H** or **Esc** | Home |
| **1** / **2** | 1 player / 2 players |
| **F** | Full screen |
| **P** | Save the painting (in Paint the Wall) |

The mouse always works too. Click anywhere to play or test without the camera.

## 5. How kids use it

- **Home screen:** hold a hand on a game card until the bar fills (about 1 second).
- **Players:** the 1 / 2 buttons bottom-right of the home screen.
- **Game or Free play:** the clock / ∞ buttons next to them.
- **Combos:** quick catches in a row make Momo cheer ("Sweet!", "Amazing!"). One-player rounds end with 1–3 stars.
- **In a game:** touch things. The round lasts 60 s by default, then everybody gets a celebration.
- **Leave a game:** hold the home button (top-left) for 2 seconds.

## 6. Settings worth knowing

| Setting | Default | Notes |
|---|---|---|
| Round length | 60 s | Paint the Wall gets 1.5× this |
| Speed | Easy | Slow targets for 3-year-olds |
| Target size | Big | |
| Fish: only your colour counts | Off | Turn on when kids are older |
| Celebrate both kids | On | No loser at the end |
| Hand reach | 70 px | Bigger = easier to hit things |
| Hold to choose | 1.2 s | How long to hold on a menu card |
| Ignore hands hanging down | On | Stops a resting arm from catching fish |
| Swap player sides | Off | If orange should be the right-hand kid |

## 7. Troubleshooting

| Problem | Try |
|---|---|
| "Body tracker failed to load" | Connect to the internet, or use the start script once so the model is saved locally. |
| Camera doesn't start | Allow camera access in the browser (camera icon in the address bar). Pick the Brio in Settings → Camera. |
| Hits land in the wrong place | Recalibrate (C). Check the camera sees the whole picture (D). |
| Kids not detected | Turn the room light down slightly (not fully dark). The camera needs to see the kids' bodies. Press D and check skeletons appear. |
| Things trigger by themselves | Increase "Ignore hands hanging down" or reduce Hand reach. |
| Slow / laggy | Close other apps. Use the start script (local files load faster). |

## 8. Project structure (for adding things later)

```
index.html               page + settings panel
css/style.css            start screen & settings styling
js/core/
  util.js                namespace, maths, homography, particles
  settings.js            defaults + settings panel
  audio.js               synthesised sounds, music, spoken lines
  art.js                 characters: fish, mosquito, bubbles, fireflies, Momo
  ui-kit.js              design system: colours, fonts, paper tags, medallions, ribbons, buttons
  scenery.js             layered paper backgrounds for every game
  input.js               merges camera hands + mouse into "pointers"
  tracker.js             camera + MediaPipe pose → hand positions on the wall
  calibration.js         auto/manual calibration
  ui.js                  hold-to-select wall buttons
  round.js               shared game flow: countdown → play → results
  tester.js              touch tester
  home.js                home menu
  main.js                start-up, main loop, keys
js/games/*.js            one file per game
sounds/voice/            Momo's recorded voice lines (mp3) + voice-lines.js list
lib/mediapipe/           Google MediaPipe Tasks Vision 1.2.3 (Apache-2.0)
fonts/                   Grandstander (wall) + Lexend (settings), SIL Open Font License
models/                  pose model goes here (downloaded by the start scripts)
```

### Adding a new game

Copy `js/games/bubbles.js` to a new file, change the `id` and `name`, and add a `<script>` line for it in `index.html` next to the other games. A game only needs:

```js
class MyGame extends WG.RoundGame {
  setup() { /* create things */ }
  updateWorld(dt, playing) {
    // move things using this.speedK (difficulty × free-play pace),
    // keep this.countFor(10) things on screen (difficulty × free-play crowd);
    // when playing, check touches:
    // const hits = WG.input.touchesCircle(x, y, radius);
    // if (hits.length) this.addScore(hits[0].player, 1, x, y);
  }
  drawWorld(ctx) { /* draw on a 1920×1080 canvas */ }
}
WG.registerGame({ id: 'mygame', name: 'My Game', music: 'home', intro: 'Spoken intro!', help: 'On-screen hint',
  tile: { top: '#ffd6ec', bottom: '#8fc9ff' }, create: (def) => new MyGame(def), drawIcon(ctx, x, y, s, t) { /* card art */ } });
```

## 9. How touch detection works (and its limits)

The camera looks at the kids from behind. Google MediaPipe Pose finds up to 2 bodies and their hands. Each hand position is mapped onto the wall using the calibration. A hand **over** a target counts as a touch. A single camera can't tell "touching" from "hovering 10 cm in front", but for toddlers that feels like touching. The kid on the left is orange, the kid on the right is blue. If they swap places, their colours swap too.

## 10. Momo's voice

The voice lines are real recordings in `sounds/voice/` (made with the open-source Kokoro text-to-speech voice "af_heart"). `voice-lines.js` lists every line and its variants; Momo picks a random variant each time so it doesn't repeat. To add a line, add an mp3 there and an entry in `voice-lines.js`, then call `WG.audio.voice('your_key')`. Voice volume and on/off are in Settings → Sound & voice.

## 11. Design system ("paper diorama")

Every scene is built like a cut-paper diorama: layered paper hills with soft shadows and a little grain, characters as die-cut stickers with a white border, and UI pieces as paper tags, scalloped medallions and ribbons. The same colours and fonts are used on the wall (`js/core/ui-kit.js`, `WG.ui`) and in the settings panel (`css/style.css`, `:root`):

| Token | Colour | Used for |
|---|---|---|
| sky | #8ED1E6 | skies, timer slice |
| leaf | #4DB37A | hills, switches |
| sun | #FFB627 | selected choices, name ribbons, stars |
| coral | #FF6B5B | main actions, hold-to-choose progress, title |
| plum | #2E2346 | all text and outlines (instead of black) |
| paper | #FFFDF6 | cards, sheets, buttons |

Fonts: **Grandstander** (chunky and friendly, made for children's reading) for everything on the wall; **Lexend** (built for easy reading) for the settings text.
