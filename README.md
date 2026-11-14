# 🎂 Happy Birthday – Blow Out the Candles

A one-page birthday cake for phones, iPads and computers. Blow into the microphone
(at the charger port on a phone, the top edge on an iPad, toward the mic or webcam on a PC) and the candles
flicker, lean and go out. Then the confetti and the song start.

## Two people, two sides

Opening the page with no cake in the link asks **who are you?**

- **👩‍🍳 I'm the baker:** design the cake with a live preview, then
  - **🎁 Send this cake:** makes a link (copied for you, or the share sheet on a phone) to send to the birthday person
  - **🌬️ Blow it out now:** try it yourself, then **✏️ Back to baking**
- **🎂 It's my birthday:** blow out the candles on a ready-made cake.

Whoever opens a link the baker sent goes straight to blowing out *that* cake.
The baker's last design is remembered on their device.

### What the baker can choose

- **Cake:** 1–3 tiers · round, square or heart · vanilla, chocolate, strawberry, red velvet, matcha, ube · plate color
- **Cream:** 7 colors · drips, layered, swirls or rosettes
- **Toppings** (as many as you like): sprinkles, stars, strawberries, cherries, macarons, chocolate
- **Photo:** add your own picture, printed on the front of the cake (like an edible photo print) or as a topper on a stick · circle, heart or square frame
- **Candles:** 1–12 candles, or number candles for an age like "25" · striped, plain or sparkle · rainbow or one color
- **Words:** the name in the title, plus a short message piped on the cake

Everything lives in the link, for example
`index.html?name=Mia&tiers=3&shape=heart&flavor=ube&cream=pink&style=swirls&top=strawberries&num=7&msg=Love+you`.
Old links like `?name=Mia&candles=7` still work.

A photo also travels inside the link (after the `#`). To keep the link short enough for chat apps, the picture is cropped
to a square and made small (about 3 KB), so it looks best as a face or a pet close-up.

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
- `cake.js`: the cake options, the links, and drawing the cake
- `builder.js`: the baker's screen and sending the link
- `script.js`: blow detection, candles, confetti and song. It also handles the mic being paused by a call or screen lock.

Upload all five files together.
