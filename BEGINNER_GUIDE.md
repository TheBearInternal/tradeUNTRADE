# 🚀 Super Simple Guide - Get Your App Running

**No tech knowledge needed!** Just follow these steps exactly.

---

## Part 1: Get the App on Your Phone (2 minutes)

### Step 1: Install Expo Go

On your phone, go to your app store and search for **"Expo Go"**

- It has a purple icon
- It's made by "Expo"
- It's FREE
- Install it just like any other app

**✅ Done? Great! Keep your phone nearby.**

---

## Part 2: Start the Server on Your Computer (3 minutes)

Think of this like starting a car - you need to turn it on before it works!

### Step 2: Open Terminal

**On Mac:**
- Press `Command + Space`
- Type "Terminal"
- Press Enter

**On Windows:**
- Press `Windows key`
- Type "Command Prompt" or "PowerShell"
- Press Enter

**You'll see a black or white window with text. Don't worry, this is normal!**

---

### Step 3: Navigate to Your Project

Copy and paste this EXACT command, then press Enter:

```bash
cd tradeUNTRADE
```

*This tells your computer where to find the app files*

---

### Step 4: Start the Backend Server

Copy and paste this command and press Enter:

```bash
./start.sh
```

**You'll see lots of text scrolling. This is GOOD!**

Wait about 30 seconds. When it stops scrolling, you're ready.

**✅ Leave this window open! Don't close it.**

---

## Part 3: Connect Your Phone (5 minutes)

### Step 5: Get Your Computer's Address

Think of this like finding your home address so your phone can visit.

**On Mac, paste this command:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows, paste this command:**
```bash
ipconfig
```

**You'll see something like:** `192.168.1.5` or `10.0.0.15`

**📝 WRITE THIS DOWN or take a screenshot!**

---

### Step 6: Tell the App Where to Find Your Server

**Open a NEW Terminal window** (don't close the first one!)

Paste these commands ONE AT A TIME:

```bash
cd tradeUNTRADE/mobile
```

Now type this (but DON'T press Enter yet):

```bash
nano src/services/api.js
```

Press Enter. You'll see a file editor.

**Use arrow keys to move to line 3.** You'll see:
```
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

**Change `localhost` to your number from Step 5.**

For example, if your number was `192.168.1.5`, change it to:
```
const API_BASE_URL = 'http://192.168.1.5:3000/api/v1';
```

**To save:**
- Press `Control + O` (that's the letter O)
- Press Enter
- Press `Control + X` to exit

---

### Step 7: Install and Start the Mobile App

In the same terminal window, paste these commands:

```bash
npm install
```

*Wait for it to finish (might take 2-3 minutes)*

Then:

```bash
npm start
```

**After a minute, you'll see a big QR code! 📱**

---

### Step 8: Open on Your Phone

**IMPORTANT: Your phone and computer MUST be on the same WiFi!**

**On Android:**
1. Open the Expo Go app
2. Tap "Scan QR Code"
3. Point your camera at the QR code on your computer screen
4. Wait 15 seconds

**On iPhone:**
1. Open your regular Camera app
2. Point at the QR code
3. Tap the notification that pops up
4. It will open in Expo Go
5. Wait 15 seconds

---

## 🎉 Success!

You should see the app on your phone with:
- A list of stock trades
- Tabs at the bottom (Home, Politicians, Stocks, Profile)
- You can swipe down to refresh

**Try it out!** Swipe between tabs and pull down on the list.

---

## ❌ It's Not Working?

### Problem: "Can't connect"

**Solution:**
1. Are your phone and computer on the **same WiFi**?
   - Not mobile data
   - Same network (like "Home WiFi", not "Guest WiFi")

2. Check the number you typed in Step 6
   - Make sure you typed it exactly right
   - No extra spaces
   - Must start with `http://`

3. **Test it:** Open Safari or Chrome on your phone and visit:
   ```
   http://YOUR_NUMBER_HERE:3000/health
   ```

   If this shows `{"status":"healthy"...}` you're good!

---

### Problem: "No QR code showing"

Press the letter `r` on your keyboard (in the terminal), then press Enter.

---

### Problem: "Cannot find module"

In the mobile terminal, run:
```bash
rm -rf node_modules
npm install
```

Wait for it to finish, then try `npm start` again.

---

### Problem: Terminal closed or lost

Just start over from Step 2!

---

## 🔄 To Use It Again Later

Every time you want to use the app:

1. Open Terminal
2. Run `cd tradeUNTRADE` then `./start.sh`
3. Open ANOTHER Terminal
4. Run `cd tradeUNTRADE/mobile` then `npm start`
5. Scan QR code with Expo Go

---

## 🛑 To Stop Everything

In each terminal window, press `Control + C`

That's it!

---

## 📸 Visual Checklist

- [ ] Expo Go app installed on phone
- [ ] Terminal open on computer
- [ ] Ran `cd tradeUNTRADE`
- [ ] Ran `./start.sh` (saw scrolling text)
- [ ] Found computer's IP number (like 192.168.1.5)
- [ ] Edited api.js file with MY computer's number
- [ ] Ran `npm install` (waited for it to finish)
- [ ] Ran `npm start` (saw QR code)
- [ ] Phone on same WiFi as computer
- [ ] Scanned QR code with Expo Go
- [ ] App loaded on phone!

---

## 💡 What If I'm Really Stuck?

Take a screenshot of:
1. What you see in the terminal
2. What you see on your phone
3. What step you're on

Then describe what's happening and I'll help you fix it!

---

**You got this!** 💪 Just follow each step slowly and carefully. Most people get stuck at Step 6 (typing the IP address) or making sure WiFi is the same. Double-check those!
