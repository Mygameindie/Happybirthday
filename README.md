# 🎂 Happy Birthday – Blow Out the Candles

A one-page birthday cake for phones, iPads and computers. Blow into the microphone
(at the charger port on a phone, the top edge on an iPad, toward the mic or webcam on a PC) and the candles
flicker, lean and go out. Then the confetti and the song start.

## Personalize it

Add these to the link:

- `?name=Mia`: shows "Happy Birthday, Mia!"
- `&candles=7`: number of candles (1–12)

Example: `https://<your-site>/index.html?name=Mia&candles=7`

## Hosting

Browsers only allow the microphone on **https://** pages. A simple way to host it is
GitHub Pages (Settings → Pages → deploy from this branch). Opening the file
directly also works, but then you can only tap the candles.

## Tips

- If the candles go out too easily, or not at all, move the **Sensitivity** slider.
- No microphone, or blowing not working? **Press and hold the cake** to blow (or hold the **Space bar** on a computer). You can also tap a single candle.
- The bar next to "🎤" shows how loud the mic hears you. Blow past the white line. If the bar never moves, the page is not getting the microphone (check it is an https:// link and that you tapped Allow).
- Sound is only analysed on the device. Nothing is recorded or uploaded.

## Files

- `index.html`: the page
- `style.css`: the look of the page, plus fixes for phone glitches (no zoom or bounce, steady layout when the address bar moves)
- `script.js`: blow detection, candles, confetti and song. It also handles the mic being paused by a call or screen lock.

Upload all three files together.
