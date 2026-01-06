# 📱 Expo Go Setup Guide - Step by Step

Follow these steps to run the mobile app on your phone in 5 minutes!

## ✅ Step 1: Install Expo Go on Your Phone

Go to your phone's app store:

- **Android**: [Download Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iPhone**: [Download Expo Go](https://apps.apple.com/app/expo-go/id982107779)

Install it (it's free!) and keep it ready.

---

## 🖥️ Step 2: Start the Backend API

Open a terminal and run:

```bash
cd tradeUNTRADE
./start.sh
```

**Wait 30 seconds**, then verify it's working:

```bash
curl http://localhost:3000/health
```

You should see: `{"status":"healthy"...}`

✅ **Leave this terminal running!**

---

## 📱 Step 3: Find Your Computer's IP Address

You need your computer's local IP so your phone can connect.

### On Mac/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### On Windows:
```bash
ipconfig
```

**Look for something like:** `192.168.1.5` or `10.0.0.5`

**Write this down!** You'll need it in the next step.

---

## 🔧 Step 4: Configure the Mobile App

**Open a NEW terminal** and run:

```bash
cd tradeUNTRADE/mobile
```

**Edit the API configuration:**

Open `mobile/src/services/api.js` in your editor and change this line:

```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

**To your computer's IP:**

```javascript
const API_BASE_URL = 'http://YOUR_IP_HERE:3000/api/v1';
// Example: const API_BASE_URL = 'http://192.168.1.5:3000/api/v1';
```

**Save the file!**

---

## 🚀 Step 5: Install Dependencies and Start

In the same terminal (mobile directory):

```bash
# Install dependencies (first time only)
npm install

# Start Expo
npm start
```

**This will take a minute the first time.**

You'll see a QR code appear in the terminal! 📱

---

## 📱 Step 6: Open on Your Phone

### Make sure:
- ✅ Your phone and computer are on the **same WiFi network**
- ✅ Backend is still running (from Step 2)
- ✅ You see a QR code in the terminal

### Then:

**Android:**
1. Open the **Expo Go** app
2. Tap **"Scan QR Code"**
3. Point camera at the QR code in your terminal
4. Wait 10-20 seconds

**iPhone:**
1. Open your **Camera app** (not Expo Go)
2. Point at the QR code
3. Tap the notification that appears
4. It will open in Expo Go

---

## 🎉 Success!

You should see the app loading on your phone:
- Transaction feed
- Bottom navigation tabs
- Pull to refresh

**Try it out!**
- Swipe down to refresh
- Tap the tabs at the bottom
- See the transaction cards

---

## 🐛 Troubleshooting

### "Unable to connect to development server"

**Solution 1: Check same WiFi**
- Your phone and computer MUST be on the same WiFi
- No mobile data, no separate network

**Solution 2: Check IP address**
- Verify you used the correct IP in `mobile/src/services/api.js`
- Test by opening `http://YOUR_IP:3000/health` in your phone's browser
- It should show `{"status":"healthy"...}`

**Solution 3: Firewall**
```bash
# On Mac, temporarily disable firewall or allow connections
# On Windows, allow Node.js through firewall
```

**Solution 4: Restart everything**
```bash
# Stop mobile app (Ctrl+C in terminal)
# Restart it
npm start
```

### "Cannot reach backend"

Make sure backend is running:
```bash
# In the tradeUNTRADE directory
docker-compose ps
# All services should show "Up"
```

Test the backend:
```bash
curl http://localhost:3000/health
```

### "QR code not showing"

Press `r` in the Expo terminal to reload and show the QR code again.

### "Expo Go app crashes"

1. Close Expo Go completely
2. Restart your phone
3. Try again

---

## 📊 Testing the App

### What You'll See:

**Home Screen:**
- Title: "Recent Trades"
- Subtitle: "Track congressional stock transactions"
- Transaction cards with:
  - Politician name
  - Party (Democrat/Republican)
  - Stock ticker
  - Buy/Sell badge
  - Amount
  - Date

**Bottom Tabs:**
- Home (working)
- Politicians (placeholder)
- Stocks (placeholder)
- Profile (placeholder)

**Pull to Refresh:**
- Swipe down on the home screen
- It will reload the transaction data

### If No Data Shows:

The database starts empty! You need to either:

1. **Wait for scrapers** (they run every 30 minutes)

2. **Trigger manually:**
   ```bash
   docker-compose exec scraper python main.py --mode once --days 7
   ```

---

## 🔄 Making Changes

The magic of Expo Go: **Hot Reload!**

1. Edit any file in `mobile/src/`
2. Save the file
3. **The app updates automatically** on your phone!

No need to rebuild or restart.

---

## 💡 Pro Tips

### View Logs
In the Expo terminal, you'll see logs from your app. Watch for errors here.

### Shake to Debug
Shake your phone while the app is open to see the developer menu.

### Keyboard Shortcuts in Terminal
- `r` - Reload app
- `m` - Toggle menu
- `shift+m` - More options
- `q` - Quit

### Test API Connection
Open your phone's browser and visit:
```
http://YOUR_IP:3000/health
```

If this works, your API is accessible!

---

## 🎯 Quick Reference

### Start Everything:

```bash
# Terminal 1 - Backend
cd tradeUNTRADE
./start.sh

# Terminal 2 - Mobile App
cd tradeUNTRADE/mobile
npm start
```

### Stop Everything:

Press `Ctrl+C` in both terminals.

---

## ✅ Success Checklist

- [ ] Expo Go installed on phone
- [ ] Backend running (`./start.sh`)
- [ ] Backend health check passes
- [ ] Computer IP address found
- [ ] `mobile/src/services/api.js` updated with IP
- [ ] `npm install` completed
- [ ] `npm start` running
- [ ] QR code visible in terminal
- [ ] Phone and computer on same WiFi
- [ ] QR code scanned in Expo Go
- [ ] App loads on phone!

---

## 🆘 Still Having Issues?

Check these in order:

1. **Backend running?** → `curl http://localhost:3000/health`
2. **IP address correct?** → Check `mobile/src/services/api.js`
3. **Same WiFi?** → Verify both devices
4. **Firewall?** → Temporarily disable or allow Node.js
5. **Restart?** → Restart Expo (`Ctrl+C` then `npm start`)

---

## 🎉 Next Steps

Once you have the app running:

1. **Explore** the transaction feed
2. **Try** pulling down to refresh
3. **Navigate** using bottom tabs
4. **Shake** your phone to see the dev menu
5. **Edit** code and watch it update live!

---

## 📝 Want to Extend the App?

The mobile app has placeholders for:
- Politicians screen
- Stocks screen
- Profile screen
- Login screen

You can complete these by following the pattern in `HomeScreen.js`!

---

**Ready?** Follow the steps above and you'll have the app running on your phone in 5 minutes! 🚀
