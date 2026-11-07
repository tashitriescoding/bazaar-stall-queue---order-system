# Brew Bazaar ordering app

Static web app: no build step.

- `index.html` page shell
- `styles.css` all styling
- `app.js` menu, cart, order queue, staff view, data layer
- `firebase.json` Firebase Hosting config

## Run locally
    npx serve .
Open the printed address on your phone (same Wi-Fi) to test.

## Before opening day
- Change `PIN` at the top of `app.js` (staff screen is at `#admin`, e.g. yoursite.com/#admin).
- Edit `MENU` in `app.js`. Put a photo link in a drink's `img:''` to fill its picture.
- Set your social links in `BRAND`.

## Important: orders are device-only until a backend is connected
Outside Claude, `app.js` runs in demo mode: orders are saved only in each
browser's local storage, so a customer's phone and the staff screen will NOT
see each other. Connect a shared database (Firebase Firestore is the closest
fit; see `initData`, `saveOrder`, `patchOrder`, `setSold` in `app.js`) before
real use.

## Deploy (Firebase Hosting)
    npm i -g firebase-tools
    firebase login
    firebase init hosting   # public dir: . , single-page app: No
    firebase deploy

## Email notifications
The cart has an optional email field and the address is saved on the order (visible on the staff board).
The page itself cannot send email: add a backend step that emails the address when an order's
status becomes `ready` (e.g. a Firebase Cloud Function + an email service such as Resend or SendGrid).
Set `EMAIL_ENABLED=false` in `app.js` to hide the field until that is working.
Customers without an email can watch the browser tab title, which shows their order number and status.
Before collecting emails, add database rules so customers can only read their own order.

## GCash / Maya payment details
Edit the `PAY` block at the top of `app.js` with the owner's number and account name for GCash and Maya.
Upload the QR screenshots to the repo next to `index.html` as `qr-gcash.png` and `qr-maya.png`
(or change the file names in `PAY`). Customers see the QR, number and exact amount in the cart and on
their order page until staff tap "Mark paid".